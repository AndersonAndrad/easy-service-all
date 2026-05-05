export const normalizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return url || '';
  }

  if (!url.includes('://')) {
    return url.replace(/\/{2,}/g, '/');
  }

  const urlParts = url.split('://');
  if (urlParts.length !== 2) {
    return url;
  }

  const [protocol, rest] = urlParts;
  const normalizedRest = rest.replace(/\/{2,}/g, '/');

  return `${protocol}://${normalizedRest}`;
};

export const normalizeCompleteUrl = (baseURL: string, url: string): string => {
  const base = baseURL || '';
  const path = url || '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return normalizeUrl(path);
  }

  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');

  const fullUrl = cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;

  return normalizeUrl(fullUrl);
};
