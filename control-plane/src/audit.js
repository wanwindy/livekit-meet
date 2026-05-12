import {query} from './db.js';

export const writeAuditLog = async ({
  req,
  actorAccountId = req?.account?.id || null,
  action,
  targetType,
  targetId,
  detail,
}) => {
  await query(
    `insert into audit_logs
      (actor_account_id, action, target_type, target_id, ip_address, user_agent, detail_json)
     values
      (:actorAccountId, :action, :targetType, :targetId, :ipAddress, :userAgent, :detailJson)`,
    {
      actorAccountId,
      action,
      targetType,
      targetId: String(targetId ?? ''),
      ipAddress: req?.ip || '',
      userAgent: req?.get?.('user-agent') || '',
      detailJson: detail ? JSON.stringify(detail) : null,
    },
  );
};
