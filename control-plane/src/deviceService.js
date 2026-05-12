import {badRequest, forbidden} from './httpError.js';
import {query, queryOne, transaction} from './db.js';

export const requireBoundDevice = async ({accountId, deviceUid}) => {
  if (!deviceUid) {
    throw badRequest('缺少设备标识', 'device_uid_required');
  }

  const device = await queryOne(
    `select id, status from devices
     where account_id = :accountId and device_uid = :deviceUid`,
    {accountId, deviceUid},
  );

  if (!device || device.status === 'unbound') {
    throw forbidden('当前设备未绑定账号', 'device_unbound');
  }

  if (device.status === 'blocked') {
    throw forbidden('当前设备已被禁用', 'device_blocked');
  }

  await query('update devices set last_seen_at = now() where id = :id', {id: device.id});
  return device;
};

export const bindDeviceIfAllowed = async ({account, device}) => {
  if (!device?.deviceUid) {
    throw badRequest('缺少设备标识', 'device_uid_required');
  }

  return transaction(async connection => {
    const [[existing]] = await connection.execute(
      `select id, status from devices
       where account_id = :accountId and device_uid = :deviceUid`,
      {accountId: account.id, deviceUid: device.deviceUid},
    );

    if (existing?.status === 'blocked') {
      throw forbidden('当前设备已被禁用', 'device_blocked');
    }

    if (existing) {
      await connection.execute(
        `update devices
         set status = 'bound', platform = :platform, device_name = :deviceName,
             app_version = :appVersion, bound_at = coalesce(bound_at, now()),
             unbound_at = null, last_seen_at = now()
         where id = :id`,
        {
          id: existing.id,
          platform: device.platform || 'unknown',
          deviceName: device.deviceName || '',
          appVersion: device.appVersion || '',
        },
      );
      return existing.id;
    }

    const [[countRow]] = await connection.execute(
      `select count(*) as boundCount from devices
       where account_id = :accountId and status = 'bound'`,
      {accountId: account.id},
    );

    if (Number(countRow.boundCount) >= Number(account.max_devices)) {
      throw forbidden('账号绑定设备数已达上限', 'device_limit_reached');
    }

    const [result] = await connection.execute(
      `insert into devices
        (account_id, device_uid, platform, device_name, app_version, status, bound_at, last_seen_at)
       values
        (:accountId, :deviceUid, :platform, :deviceName, :appVersion, 'bound', now(), now())`,
      {
        accountId: account.id,
        deviceUid: device.deviceUid,
        platform: device.platform || 'unknown',
        deviceName: device.deviceName || '',
        appVersion: device.appVersion || '',
      },
    );

    return result.insertId;
  });
};

