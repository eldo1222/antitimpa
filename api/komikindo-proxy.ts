// ==============================================================================
// KOMIKINDO PROXY & SCRAPER ENDPOINT
// Executes scraper directly for search, detail, chapter pages, and diagnostic
// ==============================================================================

import {
  KomikindoSearchResult,
  KomikindoChapterItem,
  KomikindoComicDetail,
  KomikindoDiagnostics,
  KomikindoScrapeStatus,
  KomikindoScrapeResult,
  KomikindoDiagnosticResponse,
  KomikindoChapterPagesResult,
  scrapeKomikindoSearchWithDiagnostics,
  scrapeKomikindoSearch,
  scrapeKomikindoDetail,
  scrapeKomikindoChapterPages,
  runKomikindoDiagnostic
} from '../src/scrapers/komikindo';

// Re-export core functions for server.ts and test suites
export {
  scrapeKomikindoSearchWithDiagnostics,
  scrapeKomikindoSearch,
  scrapeKomikindoDetail,
  scrapeKomikindoChapterPages,
  runKomikindoDiagnostic
};

export type {
  KomikindoSearchResult,
  KomikindoChapterItem,
  KomikindoComicDetail,
  KomikindoDiagnostics,
  KomikindoScrapeStatus,
  KomikindoScrapeResult,
  KomikindoDiagnosticResponse,
  KomikindoChapterPagesResult
};

/**
 * Serverless HTTP Handler for /api/komikindo-proxy
 */
export default async function handler(req: any, res: any) {
  const query = req.query || req.queryStringParameters || {};
  let action = String(query.action || '').toLowerCase();

  // Resolve action and params from path if routed via /api/komikindo/:path*
  const pathVal = query.path;
  let pathStr = '';
  if (Array.isArray(pathVal)) {
    pathStr = pathVal.join('/');
  } else if (typeof pathVal === 'string') {
    pathStr = pathVal;
  }

  if (!action) {
    if (pathStr.startsWith('diagnostic') || pathStr === 'diagnostic') {
      action = 'diagnostic';
    } else if (pathStr.startsWith('search') || pathStr === 'search') {
      action = 'search';
    } else if (pathStr.startsWith('detail') || pathStr === 'detail') {
      action = 'detail';
    } else if (pathStr.startsWith('chapter') || pathStr === 'chapter') {
      action = 'chapter';
    } else if (pathStr.startsWith('comic') || pathStr === 'comic') {
      action = 'detail';
      if (!query.slug) {
        const parts = pathStr.split('/');
        if (parts[1]) query.slug = parts[1];
      }
    } else {
      action = 'search';
    }
  }

  const sendResponse = (statusCode: number, data: any) => {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300');
      return res.status(statusCode).json(data);
    }
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120, s-maxage=300'
      },
      body: JSON.stringify(data)
    };
  };

  if (req.method === 'OPTIONS') {
    return sendResponse(200, { ok: true });
  }

  try {
    if (action === 'diagnostic') {
      const q = String(query.q || query.searchQuery || query.s || 'titan forge').trim();
      const diagnosticResult = await runKomikindoDiagnostic(q);
      return sendResponse(200, diagnosticResult);
    }

    if (action === 'search' || action === 'list') {
      const rawQ = String(query.searchQuery || query.q || query.search || query.title || '').trim();
      const isAllKeyword = rawQ.toLowerCase() === 'all' || rawQ.toLowerCase() === 'semua';
      const q = isAllKeyword ? '' : rawQ;

      const category = String(query.category || 'all').toLowerCase();
      const page = Math.max(1, parseInt(query.page || '1') || 1);
      const order = String(query.order || 'popular').toLowerCase();

      const result = await scrapeKomikindoSearchWithDiagnostics(q, category, page, order);
      return sendResponse(200, result);
    }

    if (action === 'detail') {
      const slug = String(query.slug || query.url || '').trim();
      if (!slug) {
        return sendResponse(400, { error: 'Slug or url parameter is required for detail action' });
      }
      const detail = await scrapeKomikindoDetail(slug);
      return sendResponse(200, { data: detail });
    }

    if (action === 'chapter' || action === 'pages') {
      const targetUrl = String(query.url || query.slug || '').trim();
      if (!targetUrl) {
        return sendResponse(400, { error: 'Url or slug parameter is required for chapter action' });
      }
      const result = await scrapeKomikindoChapterPages(targetUrl);
      return sendResponse(200, result);
    }

    return sendResponse(400, { error: `Unsupported action: ${action}` });
  } catch (error: any) {
    console.error('Komikindo proxy error:', error);
    return sendResponse(500, {
      status: 'KOMIKINDO_FETCH_FAILED',
      error: 'Failed to scrape Komikindo',
      message: error.message
    });
  }
}
