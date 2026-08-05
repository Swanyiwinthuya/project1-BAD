import { appConfig } from './config.js';

export async function api(path, options = {}) {
  const token = sessionStorage.getItem('campusfix_token');
  const response = await fetch(`${appConfig.apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = body.details;
    throw error;
  }
  return body;
}

