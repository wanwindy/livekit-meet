import {query} from './db.js';

const signalProtocols = new Set(['ws:', 'wss:']);

export const getNodeHealthUrl = signalUrl => {
  const url = new URL(signalUrl);
  if (!signalProtocols.has(url.protocol)) {
    throw new Error('LiveKit signal URL must use ws or wss');
  }

  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString();
};

export const nextNodeHealthState = ({
  currentStatus,
  consecutiveFailures,
  healthy,
  failureThreshold,
}) => {
  if (currentStatus === 'draining') {
    return {status: 'draining', consecutiveFailures: 0};
  }

  if (healthy) {
    return {status: 'healthy', consecutiveFailures: 0};
  }

  const nextFailures = consecutiveFailures + 1;
  return {
    status: nextFailures >= failureThreshold ? 'offline' : 'degraded',
    consecutiveFailures: nextFailures,
  };
};

const fetchNodeHealth = async ({signalUrl, timeoutMs}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(getNodeHealthUrl(signalUrl), {
      method: 'GET',
      signal: controller.signal,
      redirect: 'error',
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

export const startNodeHealthMonitor = ({
  enabled,
  intervalMs,
  timeoutMs,
  failureThreshold,
}) => {
  if (!enabled) {
    return () => undefined;
  }

  const failures = new Map();
  let timer;
  let stopped = false;
  let checking = false;

  const checkNode = async node => {
    const healthy = await fetchNodeHealth({signalUrl: node.signalUrl, timeoutMs});
    const next = nextNodeHealthState({
      currentStatus: node.status,
      consecutiveFailures: failures.get(node.id) || 0,
      healthy,
      failureThreshold,
    });

    failures.set(node.id, next.consecutiveFailures);
    if (node.status === 'draining') {
      return;
    }

    if (healthy) {
      await query(
        `update livekit_nodes
         set status = 'healthy', last_health_at = now()
         where id = :id and status <> 'draining'`,
        {id: node.id},
      );
      return;
    }

    await query(
      `update livekit_nodes
       set status = :status
       where id = :id and status <> 'draining'`,
      {id: node.id, status: next.status},
    );
  };

  const tick = async () => {
    if (stopped || checking) {
      return;
    }

    checking = true;
    try {
      const nodes = await query(
        `select id, signal_url as signalUrl, status
         from livekit_nodes
         where status <> 'draining'`,
      );
      await Promise.allSettled(nodes.map(checkNode));
    } catch (error) {
      console.error('LiveKit node health check failed', error);
    } finally {
      checking = false;
    }
  };

  tick();
  timer = setInterval(tick, Math.max(intervalMs, 5000));
  timer.unref?.();

  return () => {
    stopped = true;
    clearInterval(timer);
  };
};
