// Client HTTP minimale per l'API. Gli errori arrivano come ApiError con code e message.

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(method, url, body) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new ApiError(0, 'NETWORK', 'Server non raggiungibile. Controlla che sia avviato.');
  }
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new CustomEvent('qrcard:unauthorized'));
    const err = data?.error;
    const fallback = res.status >= 500 || !isJson ? 'Server non raggiungibile o errore interno' : 'Richiesta non riuscita';
    throw new ApiError(res.status, err?.code || 'HTTP_' + res.status, err?.message || fallback);
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
  upload(file) {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/api/media', fd).then((d) => d.media);
  },
};
