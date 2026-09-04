function isForbiddenHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '169.254.169.254' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    return true;
  }
  if (
    /^(10\.|127\.|169\.254\.|192\.168\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
  ) {
    return true;
  }
  return false;
}

export default async function handler(req: any, res: any) {
  // Support both Vercel (req, res) and Serverless event style
  const query = req.query || (req.queryStringParameters) || {};
  const urlStr = (query.url || '').trim();

  const sendResponse = (statusCode: number, contentType: string, data: any, isBuffer = false) => {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', contentType);
      if (statusCode === 200) {
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      return res.status(statusCode).send(data);
    }
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType,
        ...(statusCode === 200 ? { 'Cache-Control': 'public, max-age=86400, s-maxage=86400', 'X-Content-Type-Options': 'nosniff' } : {})
      },
      body: isBuffer ? Buffer.from(data).toString('base64') : (typeof data === 'string' ? data : JSON.stringify(data)),
      ...(isBuffer ? { isBase64Encoded: true } : {})
    };
  };

  if (req.method === 'OPTIONS') {
    return sendResponse(200, 'application/json', JSON.stringify({ ok: true }));
  }

  if (!urlStr) {
    return sendResponse(400, 'application/json', JSON.stringify({ error: 'URL query parameter is required' }));
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    return sendResponse(400, 'application/json', JSON.stringify({ error: 'Invalid URL format' }));
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return sendResponse(400, 'application/json', JSON.stringify({ error: 'Only HTTP/HTTPS protocols are permitted' }));
  }

  if (isForbiddenHost(parsedUrl.hostname)) {
    return sendResponse(403, 'application/json', JSON.stringify({ error: 'Access to private or local network hosts is prohibited' }));
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const lowerUrl = parsedUrl.toString().toLowerCase();
    let referer = parsedUrl.origin + '/';
    if (
      lowerUrl.includes('komikindo') ||
      lowerUrl.includes('imageainewgeneration') ||
      lowerUrl.includes('himmga') ||
      lowerUrl.includes('gaimgame') ||
      lowerUrl.includes('indocontentaising') ||
      lowerUrl.includes('aicontentwow') ||
      lowerUrl.includes('contentkerewnrorai')
    ) {
      referer = 'https://komikindo.ch/';
    } else if (lowerUrl.includes('komiktap') || lowerUrl.includes('komikcdn')) {
      referer = 'https://komiktap.info/';
    }

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AntiTimpa/1.0',
        'Referer': referer,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return sendResponse(response.status, 'text/plain', 'Failed to fetch image from upstream server');
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      return sendResponse(415, 'text/plain', 'Upstream resource is not a valid image');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit
    if (buffer.byteLength > MAX_SIZE) {
      return sendResponse(413, 'text/plain', 'Image size exceeds safety limit (15MB)');
    }

    return sendResponse(200, contentType || 'image/jpeg', buffer, true);
  } catch (err: any) {
    return sendResponse(500, 'text/plain', err.message || 'Image Proxy Error');
  }
}
