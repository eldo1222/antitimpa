export async function handler(event: any) {
  const query = event.queryStringParameters || {};
  const q = query.q || '';
  const limit = query.limit || '20';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  try {
    const url = q.trim()
      ? `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q.trim())}&limit=${limit}&sfw=false`
      : `https://api.jikan.moe/v4/top/manga?limit=${limit}&filter=bypopularity`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KomikYuk-App/1.0',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Jikan API status ${response.status}`, data: [] })
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, data: [] })
    };
  }
}
