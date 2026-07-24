const REGION_ORDER = ['hk', 'sg', 'cn'];

export const normalizeRegion = region =>
  REGION_ORDER.includes(region) ? region : undefined;

export const decidePreferredRegion = ({preferredRegion, audienceRegion} = {}) => {
  const explicit = normalizeRegion(preferredRegion);

  if (explicit) {
    return explicit;
  }

  if (audienceRegion === 'sea') {
    return 'sg';
  }

  return 'hk';
};

export const chooseNode = ({
  nodes,
  preferredRegion = 'hk',
  fallbackOrder = REGION_ORDER,
  staleAfterMs = 0,
  now = Date.now(),
}) => {
  const isFresh = node => {
    if (!staleAfterMs || !node.lastHealthAt) {
      return true;
    }

    const lastHealthAt = new Date(node.lastHealthAt).getTime();
    return Number.isFinite(lastHealthAt) && now - lastHealthAt <= staleAfterMs;
  };

  const select = status => {
    const available = nodes.filter(node => node.status === status && isFresh(node));
    const preferred = available.find(node => node.region === preferredRegion);
    if (preferred) {
      return preferred;
    }

    for (const region of fallbackOrder) {
      const fallback = available.find(node => node.region === region);
      if (fallback) {
        return fallback;
      }
    }
    return null;
  };

  return select('healthy') || select('degraded');
};
