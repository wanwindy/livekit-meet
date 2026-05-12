import express from 'express';
import {bindDeviceIfAllowed, requireBoundDevice} from '../deviceService.js';
import {query, queryOne} from '../db.js';
import {signAccountToken, verifyPassword, requireAuth} from '../auth.js';
import {writeAuditLog} from '../audit.js';
import {badRequest, forbidden, notFound, unauthorized} from '../httpError.js';
import {
  createMeetingForHost,
  findMeetingByNumber,
  issueRoomToken,
  listLiveKitNodes,
} from '../livekitService.js';

export const mobileRouter = express.Router();

mobileRouter.get('/config', async (_req, res, next) => {
  try {
    const nodes = await listLiveKitNodes();
    res.json({
      apiVersion: '2026-05-06',
      regions: nodes.map(node => ({
        region: node.region,
        signalUrl: node.signalUrl,
        status: node.status,
      })),
    });
  } catch (error) {
    next(error);
  }
});

mobileRouter.post('/auth/login', async (req, res, next) => {
  try {
    const {username, password} = req.body || {};
    const device = normalizeDevice(req.body || {});
    const account = await queryOne(
      `select id, username, display_name, password_hash, role, status, max_devices
       from accounts
       where username = :username and deleted_at is null`,
      {username},
    );

    if (
      !account ||
      account.role !== 'host' ||
      account.status !== 'active' ||
      !(await verifyPassword(password || '', account.password_hash))
    ) {
      throw unauthorized('账号或密码错误', 'invalid_credentials');
    }

    const deviceId = await bindDeviceIfAllowed({
      account,
      device,
    });

    await writeAuditLog({
      req,
      actorAccountId: account.id,
      action: 'mobile.login',
      targetType: 'device',
      targetId: deviceId,
    });

    res.json({
      token: signAccountToken(account),
      account: {
        id: account.id,
        username: account.username,
        displayName: account.display_name,
        role: account.role,
        maxDevices: account.max_devices,
      },
      device: {id: deviceId, status: 'bound', deviceUid: device.deviceUid},
    });
  } catch (error) {
    next(error);
  }
});

mobileRouter.post('/devices/bind', requireAuth, async (req, res, next) => {
  try {
    if (req.account.role !== 'host') {
      throw forbidden('只有主持人账号可以绑定设备');
    }

    const fullAccount = await queryOne(
      `select id, username, display_name, role, status, max_devices
       from accounts
       where id = :id and deleted_at is null`,
      {id: req.account.id},
    );
    const device = normalizeDevice(req.body || {});
    const deviceId = await bindDeviceIfAllowed({
      account: fullAccount,
      device,
    });
    await writeAuditLog({
      req,
      action: 'device.bind',
      targetType: 'device',
      targetId: deviceId,
    });
    res.json({id: deviceId, status: 'bound', deviceUid: device.deviceUid});
  } catch (error) {
    next(error);
  }
});

mobileRouter.post('/devices/heartbeat', requireAuth, async (req, res, next) => {
  try {
    const deviceUid = String(req.body?.deviceUid || '');
    await requireBoundDevice({accountId: req.account.id, deviceUid});
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

mobileRouter.post('/meetings/create', requireAuth, async (req, res, next) => {
  try {
    if (req.account.role !== 'host') {
      throw forbidden('只有主持人账号可以创建会议');
    }

    const deviceUid = String(req.body?.deviceUid || req.get('x-device-uid') || '');
    await requireBoundDevice({accountId: req.account.id, deviceUid});

    const account = await queryOne(
      `select id, username, display_name, role, status, max_devices
       from accounts
       where id = :id and deleted_at is null`,
      {id: req.account.id},
    );
    if (!account || account.status !== 'active') {
      throw unauthorized('账号不可用', 'account_unavailable');
    }

    const meeting = await createMeetingForHost({
      hostAccount: account,
      preferredRegion: req.body?.preferredRegion,
      audienceRegion: req.body?.audienceRegion,
      displayName: req.body?.displayName,
    });

    await writeAuditLog({
      req,
      action: 'meeting.create',
      targetType: 'meeting',
      targetId: meeting.meetingNumber,
      detail: {region: meeting.region},
    });

    res.json(meeting);
  } catch (error) {
    next(error);
  }
});

mobileRouter.post('/meetings/join', async (req, res, next) => {
  try {
    const meetingNumber = String(req.body?.meetingNumber || '').trim();
    if (!meetingNumber) {
      throw badRequest('请输入会议号');
    }

    const meeting = await findMeetingByNumber(meetingNumber);
    if (!meeting) {
      throw notFound('会议不存在');
    }

    if (!['created', 'active'].includes(meeting.status)) {
      throw forbidden('会议已结束或已过期', 'meeting_unavailable');
    }

    const displayName = String(req.body?.displayName || '参会人').trim();
    const identitySuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const token = await issueRoomToken({
      roomName: meeting.roomName,
      identity: `guest-${identitySuffix}`,
      displayName,
      role: 'participant',
    });

    await query("update meetings set status = 'active' where id = :id and status = 'created'", {
      id: meeting.id,
    });

    res.json({
      meetingNumber: meeting.meetingNumber,
      roomName: meeting.roomName,
      serverUrl: meeting.liveKitUrl || meeting.livekitUrl,
      region: meeting.preferredRegion,
      token,
    });
  } catch (error) {
    next(error);
  }
});

const normalizeDevice = body => ({
  deviceUid: String(body.deviceUid || body.device_uid || '').trim(),
  platform: ['ios', 'android', 'web'].includes(body.platform) ? body.platform : 'unknown',
  deviceName: String(body.deviceName || body.device_name || '').trim(),
  appVersion: String(body.appVersion || body.app_version || '').trim(),
});
