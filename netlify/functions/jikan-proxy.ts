export const handler = async (event: any, _context: any) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const params = event.queryStringParameters || {};
    const { q = "", limit = "20" } = params;
    const queryStr = String(q).trim();

    const url = queryStr 
      ? `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(queryStr)}&limit=${String(limit)}&sfw=false`
      : `https://api.jikan.moe/v4/top/manga?limit=${String(limit)}&filter=bypopularity`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KomikYuk-Netlify/1.0",
        "Accept": "application/json"
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Jikan API returned ${response.status}`, data: [] })
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch from Jikan", message: error.message, data: [] })
    };
  }
};
