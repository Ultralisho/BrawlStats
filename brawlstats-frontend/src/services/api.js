const BASE_URL = process.env.REACT_APP_API_URL || '';

async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('bs_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const body = options.body && typeof options.body === 'object'
    ? JSON.stringify(options.body)
    : options.body;

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers, body });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export { fetchApi };
export default fetchApi;
