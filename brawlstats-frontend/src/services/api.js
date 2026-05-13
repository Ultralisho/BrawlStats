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
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${response.status}`);
  }

  const json = await response.json();
  // Desempaqueta el envelope { success: true, data: ... } del backend
  return (json && json.success === true && 'data' in json) ? json.data : json;
}

export { fetchApi };
export default fetchApi;