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

export const chooseNode = ({nodes, preferredRegion = 'hk', fallbackOrder = REGION_ORDER}) => {
  const available = nodes.filter(node =>
    ['healthy', 'degraded'].includes(node.status),
  );

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

