export default async function handler(req: any, res: any) {
  const path = req.url || '';
  const method = req.method || 'GET';

  const sendResponse = (statusCode: number, data: any) => {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Content-Type', 'application/json');
      return res.status(statusCode).json(data);
    }
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  };

  if (method === 'OPTIONS') {
    return sendResponse(200, { ok: true });
  }

  // Check if requesting status
  if (path.includes('/auto-status') || req.query?.action === 'auto-status') {
    return sendResponse(200, {
      isRunning: false,
      totalComicsInDB: 0,
      scrapedThisSession: 0,
      targetCount: 0,
      currentStreamIndex: 0,
      statusMessage: 'Vercel Cloud Engine Siap (Turbo Mode)',
      lastHeartbeat: new Date().toISOString(),
      offsets: {},
      consecutiveZeroBatches: 0,
      currentCategory: 'Vercel Standby',
      logs: ['[Vercel Engine] Siap menjalankan Mass Scraper browser turbo multi-stream.']
    });
  }

  if (path.includes('/auto-start') || req.query?.action === 'auto-start') {
    return sendResponse(200, {
      success: false,
      message: 'Client Turbo Mass Scraper diaktifkan di Vercel!'
    });
  }

  if (path.includes('/auto-stop') || req.query?.action === 'auto-stop') {
    return sendResponse(200, {
      success: true,
      message: 'Scraper dihentikan.'
    });
  }

  if (path.includes('/auto-reset-cursor') || req.query?.action === 'auto-reset-cursor') {
    return sendResponse(200, {
      success: true,
      message: 'Offset scraper cursor telah direset ke 0.'
    });
  }

  return sendResponse(200, {
    status: 'ok',
    message: 'Vercel Scraper Proxy active'
  });
}
