import express from 'express';
import {hashPassword, requireAdmin, requireAuth, signAccountToken, verifyPassword} from '../auth.js';
import {writeAuditLog} from '../audit.js';
import {badRequest, forbidden, notFound, unauthorized} from '../httpError.js';
import {query, queryOne} from '../db.js';

export const adminRouter = express.Router();

adminRouter.post('/auth/login', async (req, res, next) => {
  try {
    const {username, password} = req.body || {};
    const account = await queryOne(
      `select id, username, display_name, password_hash, role, status, max_devices
       from accounts
       where username = :username and deleted_at is null`,
      {username},
    );

    if (
      !account ||
      account.status !== 'active' ||
      !['super_admin', 'admin'].includes(account.role) ||
      !(await verifyPassword(password || '', account.password_hash))
    ) {
      throw unauthorized('账号或密码错误', 'invalid_credentials');
    }

    await writeAuditLog({
      req,
      actorAccountId: account.id,
      action: 'admin.login',
      targetType: 'account',
      targetId: account.id,
    });

    res.json({
      token: signAccountToken(account),
      account: toAccountDto(account),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.use(requireAuth, requireAdmin);

adminRouter.post('/auth/logout', async (req, res, next) => {
  try {
    await writeAuditLog({
      req,
      action: 'admin.logout',
      targetType: 'account',
      targetId: req.account.id,
    });
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/me', (req, res) => {
  res.json({account: toAccountDto(req.account)});
});

adminRouter.get('/accounts', async (req, res, next) => {
  try {
    const keyword = `%${String(req.query.q || '').trim()}%`;
    const rows = await query(
      `select id, username, display_name, role, status, max_devices,
              created_at, updated_at
       from accounts
       where deleted_at is null
         and (:q = '%%' or username like :q or display_name like :q)
       order by id desc
       limit 200`,
      {q: keyword},
    );
    res.json({items: rows.map(toAccountDto)});
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/accounts', async (req, res, next) => {
  try {
    const input = normalizeAccountInput(req.body || {}, true);
    if (input.role !== 'host' && req.account.role !== 'super_admin') {
      throw forbidden('只有超级管理员可以创建管理员账号');
    }

    const passwordHash = await hashPassword(input.password);
    const result = await query(
      `insert into accounts
        (username, display_name, password_hash, role, status, max_devices)
       values
        (:username, :displayName, :passwordHash, :role, :status, :maxDevices)`,
      {...input, passwordHash},
    );

    await writeAuditLog({
      req,
      action: 'account.create',
      targetType: 'account',
      targetId: result.insertId,
      detail: {username: input.username, role: input.role},
    });

    res.status(201).json({id: result.insertId});
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/accounts/:id', async (req, res, next) => {
  try {
    const account = await getAccountOrThrow(req.params.id);
    res.json({account: toAccountDto(account)});
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/accounts/:id', async (req, res, next) => {
  try {
    const existing = await getAccountOrThrow(req.params.id);
    const input = normalizeAccountInput(req.body || {}, false);

    if ((existing.role !== 'host' || input.role !== 'host') && req.account.role !== 'super_admin') {
      throw forbidden('只有超级管理员可以修改管理员账号');
    }

    await query(
      `update accounts
       set display_name = :displayName, role = :role, status = :status, max_devices = :maxDevices
       where id = :id`,
      {
        id: req.params.id,
        displayName: input.displayName ?? existing.display_name,
        role: input.role ?? existing.role,
        status: input.status ?? existing.status,
        maxDevices: input.maxDevices ?? existing.max_devices,
      },
    );

    await writeAuditLog({
      req,
      action: 'account.update',
      targetType: 'account',
      targetId: req.params.id,
      detail: input,
    });

    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/accounts/:id/reset-password', async (req, res, next) => {
  try {
    const existing = await getAccountOrThrow(req.params.id);
    if (existing.role !== 'host' && req.account.role !== 'super_admin') {
      throw forbidden('只有超级管理员可以重置管理员密码');
    }

    const password = String(req.body?.password || '');
    if (password.length < 8) {
      throw badRequest('密码至少需要 8 位');
    }

    await query('update accounts set password_hash = :passwordHash where id = :id', {
      id: req.params.id,
      passwordHash: await hashPassword(password),
    });
    await writeAuditLog({
      req,
      action: 'account.reset_password',
      targetType: 'account',
      targetId: req.params.id,
    });
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/accounts/:id/disable', setAccountStatus('disabled'));
adminRouter.post('/accounts/:id/enable', setAccountStatus('active'));

adminRouter.delete('/accounts/:id', async (req, res, next) => {
  try {
    const account = await getAccountOrThrow(req.params.id);
    if (account.role !== 'host' && req.account.role !== 'super_admin') {
      throw forbidden('只有超级管理员可以删除管理员账号');
    }

    await query(
      `update accounts
       set status = 'disabled', deleted_at = now(), username = concat(username, '#deleted#', id)
       where id = :id`,
      {id: req.params.id},
    );
    await writeAuditLog({
      req,
      action: 'account.delete',
      targetType: 'account',
      targetId: req.params.id,
    });
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/accounts/:id/devices', async (req, res, next) => {
  try {
    await getAccountOrThrow(req.params.id);
    const rows = await query(
      `select id, account_id as accountId, device_uid as deviceUid, platform, device_name as deviceName,
              app_version as appVersion, status, bound_at as boundAt, unbound_at as unboundAt,
              last_seen_at as lastSeenAt
       from devices
       where account_id = :accountId
       order by id desc`,
      {accountId: req.params.id},
    );
    res.json({items: rows});
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/devices/:id/unbind', setDeviceStatus('unbound'));
adminRouter.post('/devices/:id/block', setDeviceStatus('blocked'));
adminRouter.post('/devices/:id/unblock', setDeviceStatus('bound'));

adminRouter.get('/meetings', async (req, res, next) => {
  try {
    const rows = await query(
      `select m.id, m.meeting_number as meetingNumber, m.room_name as roomName,
              m.preferred_region as preferredRegion, m.livekit_url as livekitUrl,
              m.status, m.created_at as createdAt, m.ended_at as endedAt,
              a.username as hostUsername, a.display_name as hostDisplayName
       from meetings m
       join accounts a on a.id = m.host_account_id
       order by m.id desc
       limit 200`,
    );
    res.json({items: rows});
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/nodes', async (_req, res, next) => {
  try {
    const rows = await query(
      `select id, region, name, signal_url as signalUrl, status,
              last_health_at as lastHealthAt, load_score as loadScore, updated_at as updatedAt
       from livekit_nodes
       order by field(region, 'hk', 'sg', 'cn'), name`,
    );
    res.json({items: rows});
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/nodes', async (req, res, next) => {
  try {
    const input = normalizeNodeInput(req.body || {}, true);
    const result = await query(
      `insert into livekit_nodes (region, name, signal_url, status, load_score, last_health_at)
       values (:region, :name, :signalUrl, :status, :loadScore, now())`,
      input,
    );
    await writeAuditLog({
      req,
      action: 'node.create',
      targetType: 'livekit_node',
      targetId: result.insertId,
      detail: input,
    });
    res.status(201).json({id: result.insertId});
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/nodes/:id', async (req, res, next) => {
  try {
    const input = normalizeNodeInput(req.body || {}, false);
    const node = await queryOne('select id from livekit_nodes where id = :id', {
      id: req.params.id,
    });
    if (!node) {
      throw notFound('节点不存在');
    }

    await query(
      `update livekit_nodes
       set region = coalesce(:region, region),
           name = coalesce(:name, name),
           signal_url = coalesce(:signalUrl, signal_url),
           status = coalesce(:status, status),
           load_score = :loadScore,
           last_health_at = if(:status in ('healthy', 'degraded'), now(), last_health_at)
       where id = :id`,
      {id: req.params.id, ...input},
    );
    await writeAuditLog({
      req,
      action: 'node.update',
      targetType: 'livekit_node',
      targetId: req.params.id,
      detail: input,
    });
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/audit-logs', async (_req, res, next) => {
  try {
    const rows = await query(
      `select l.id, l.actor_account_id as actorAccountId, a.username as actorUsername,
              l.action, l.target_type as targetType, l.target_id as targetId,
              l.ip_address as ipAddress, l.user_agent as userAgent, l.detail_json as detail,
              l.created_at as createdAt
       from audit_logs l
       left join accounts a on a.id = l.actor_account_id
       order by l.id desc
       limit 200`,
    );
    res.json({items: rows});
  } catch (error) {
    next(error);
  }
});

const toAccountDto = account => ({
  id: account.id,
  username: account.username,
  displayName: account.display_name ?? account.displayName,
  role: account.role,
  status: account.status,
  maxDevices: account.max_devices ?? account.maxDevices,
  createdAt: account.created_at,
  updatedAt: account.updated_at,
});

const normalizeAccountInput = (body, creating) => {
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const displayName =
    body.displayName != null || body.display_name != null || creating
      ? String(body.displayName || body.display_name || username).trim()
      : undefined;
  const role = body.role || (creating ? 'host' : undefined);
  const status = body.status || (creating ? 'active' : undefined);
  const maxDevicesRaw = body.maxDevices ?? body.max_devices ?? (creating ? '1' : undefined);
  const maxDevices =
    maxDevicesRaw == null ? undefined : Number.parseInt(maxDevicesRaw, 10);

  if (creating && !username) {
    throw badRequest('请输入账号');
  }

  if (creating && password.length < 8) {
    throw badRequest('密码至少需要 8 位');
  }

  if (role && !['super_admin', 'admin', 'host'].includes(role)) {
    throw badRequest('角色不正确');
  }

  if (status && !['active', 'disabled', 'locked'].includes(status)) {
    throw badRequest('账号状态不正确');
  }

  if (
    maxDevices !== undefined &&
    (!Number.isFinite(maxDevices) || maxDevices < 1 || maxDevices > 10)
  ) {
    throw badRequest('设备数上限需要在 1 到 10 之间');
  }

  return {username, password, displayName, role, status, maxDevices};
};

const normalizeNodeInput = (body, creating) => {
  const input = {
    region: body.region || null,
    name: body.name ? String(body.name).trim() : null,
    signalUrl: body.signalUrl || body.signal_url || null,
    status: body.status || (creating ? 'offline' : null),
    loadScore: body.loadScore ?? body.load_score ?? null,
  };

  if (creating && (!input.region || !input.name || !input.signalUrl)) {
    throw badRequest('节点区域、名称和信令地址必填');
  }

  if (input.region && !['hk', 'sg', 'cn'].includes(input.region)) {
    throw badRequest('节点区域不正确');
  }

  if (input.status && !['healthy', 'degraded', 'offline', 'draining'].includes(input.status)) {
    throw badRequest('节点状态不正确');
  }

  return input;
};

const getAccountOrThrow = async id => {
  const account = await queryOne(
    `select id, username, display_name, role, status, max_devices, created_at, updated_at
     from accounts
     where id = :id and deleted_at is null`,
    {id},
  );
  if (!account) {
    throw notFound('账号不存在');
  }
  return account;
};

function setAccountStatus(status) {
  return async (req, res, next) => {
    try {
      await getAccountOrThrow(req.params.id);
      await query('update accounts set status = :status where id = :id', {
        id: req.params.id,
        status,
      });
      await writeAuditLog({
        req,
        action: `account.${status}`,
        targetType: 'account',
        targetId: req.params.id,
      });
      res.json({ok: true});
    } catch (error) {
      next(error);
    }
  };
}

function setDeviceStatus(status) {
  return async (req, res, next) => {
    try {
      const device = await queryOne(
        'select id, account_id as accountId from devices where id = :id',
        {id: req.params.id},
      );
      if (!device) {
        throw notFound('设备不存在');
      }
      await query(
        `update devices
         set status = :status,
             unbound_at = if(:status = 'unbound', now(), unbound_at),
             bound_at = if(:status = 'bound', now(), bound_at)
         where id = :id`,
        {id: req.params.id, status},
      );
      await writeAuditLog({
        req,
        action: `device.${status}`,
        targetType: 'device',
        targetId: req.params.id,
      });
      res.json({ok: true});
    } catch (error) {
      next(error);
    }
  };
}
