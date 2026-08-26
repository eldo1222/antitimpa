export async function handler(event: any) {
  const query = event.queryStringParameters || {};
  const q = query.q || '';
  const limit = query.limit || '25';
  const page = query.page || '1';
  const type = query.type || '';
  const filter = query.filter || '';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  try {
    let url = '';
    if (q.trim()) {
      url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q.trim())}&limit=${limit}&page=${page}&sfw=false`;
    } else {
      url = `https://api.jikan.moe/v4/top/manga?limit=${limit}&page=${page}`;
      if (type) url += `&type=${encodeURIComponent(type)}`;
      if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KomikYuk/2.0)',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: [], error: `Jikan API status ${response.status}` })
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
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: [], error: err.message })
    };
  }
}
