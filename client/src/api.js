const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}