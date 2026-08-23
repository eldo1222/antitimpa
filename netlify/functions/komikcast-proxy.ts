const KOMIKCAST_BASE_URL = "https://komikcast.bz";

const fetchKomikcastHtml = async (targetUrl: string): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  const response = await fetch(targetUrl, {
    signal: controller.signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "id,en-US,en;q=0.9",
      "Referer": "https://komikcast.bz/"
    }
  });
  clearTimeout(timeout);
  if (!response.ok) {
    throw new Error(`Komikcast HTTP ${response.status}`);
  }
  return await response.text();
};

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
    let action = params.action || "";
    const path = event.path || "";

    if (!action) {
      if (path.includes("/detail")) action = "detail";
      else if (path.includes("/chapter")) action = "chapter";
      else action = "search";
    }

    // ----------------------------------------------------
    // ACTION 1: SEARCH & BROWSE
    // ----------------------------------------------------
    if (action === "search") {
      const { q = "", type = "", order = "popular", page = "1" } = params;
      const queryStr = String(q).trim();

      let targetUrl = `${KOMIKCAST_BASE_URL}/daftar-komik/page/${page}/?status=&type=${type}&format=&order=${order}`;
      if (queryStr) {
        targetUrl = `${KOMIKCAST_BASE_URL}/?s=${encodeURIComponent(queryStr)}`;
      }

      const html = await fetchKomikcastHtml(targetUrl);
      const results: any[] = [];
      const itemRegex = /<div[^>]*class="[^"]*(?:list-update_item|bsx)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      let match;

      while ((match = itemRegex.exec(html)) !== null) {
        const block = match[1];
        const titleMatch = /<a[^>]*href="([^"]*\/komik\/([^"\/]+)\/?)"[^>]*title="([^"]*)"[^>]*>/i.exec(block) ||
                           /<a[^>]*href="([^"]*\/komik\/([^"\/]+)\/?)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/i.exec(block);
        const imgMatch = /<img[^>]*src="([^"]+)"/i.exec(block) || /<img[^>]*data-src="([^"]+)"/i.exec(block);
        const typeMatch = /<span[^>]*class="[^"]*type[^"]*"[^>]*>([^<]+)<\/span>/i.exec(block);
        const ratingMatch = /<div[^>]*class="[^"]*numscore[^"]*"[^>]*>([^<]+)<\/div>/i.exec(block) ||
                            /<div[^>]*class="[^"]*rating[^"]*"[^>]*>[\s\S]*?<i>([^<]+)<\/i>/i.exec(block);
        const chapterMatch = /<span[^>]*class="[^"]*chapter[^"]*"[^>]*>([^<]+)<\/span>/i.exec(block) ||
                             /<a[^>]*href="[^"]*\/chapter\/[^"]*"[^>]*>([^<]+)<\/a>/i.exec(block);

        if (titleMatch) {
          const rawTitle = titleMatch[3]?.trim() || titleMatch[2]?.replace(/-/g, " ") || "Komik";
          const rawType = (typeMatch ? typeMatch[1].trim().toLowerCase() : "manga");
          const slug = titleMatch[2];
          const rawCover = imgMatch ? imgMatch[1] : "";

          let comicType = "manga";
          if (rawType.includes("manhwa")) comicType = "manhwa";
          else if (rawType.includes("manhua")) comicType = "manhua";
          else if (rawType.includes("doujin")) comicType = "doujin";

          results.push({
            title: rawTitle,
            slug,
            link: titleMatch[1],
            coverImage: rawCover ? `/api/proxy-image?url=${encodeURIComponent(rawCover)}` : "",
            rawCover,
            type: comicType,
            rawType,
            rating: ratingMatch ? parseFloat(ratingMatch[1]) || 4.8 : 4.8,
            latestChapter: chapterMatch ? chapterMatch[1].trim() : "Ch. 1",
            source: "Komikcast"
          });
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: "success", count: results.length, data: results })
      };
    }

    // ----------------------------------------------------
    // ACTION 2: DETAIL & CHAPTERS
    // ----------------------------------------------------
    if (action === "detail") {
      const slug = params.slug || "";
      if (!slug) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Slug is required" }) };
      }

      const targetUrl = `${KOMIKCAST_BASE_URL}/komik/${String(slug)}/`;
      const html = await fetchKomikcastHtml(targetUrl);

      const titleMatch = /<h1[^>]*class="[^"]*komik_info-content-title[^"]*"[^>]*>([^<]+)<\/h1>/i.exec(html) ||
                         /<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/i.exec(html);
      const title = titleMatch ? titleMatch[1].trim() : String(slug).replace(/-/g, " ");

      const imgMatch = /<div[^>]*class="[^"]*komik_info-content-thumbnail[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i.exec(html) ||
                       /<div[^>]*class="[^"]*thumb[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i.exec(html);
      const rawCover = imgMatch ? imgMatch[1] : "";

      const synMatch = /<div[^>]*class="[^"]*(?:komik_info-description-sinopsis|entry-content-single)[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
      const synopsis = synMatch ? synMatch[1].replace(/<[^>]+>/g, "").trim() : "Sinopsis komik dari Komikcast.";

      const genres: string[] = [];
      const genreRegex = /<a[^>]*href="[^"]*\/genres\/([^"\/]+)\/?"[^>]*>([^<]+)<\/a>/gi;
      let gMatch;
      while ((gMatch = genreRegex.exec(html)) !== null) {
        genres.push(gMatch[2].trim());
      }

      const authorMatch = /Author:?<\/b>\s*<span>([^<]+)<\/span>/i.exec(html) || /Pengarang:?<\/b>\s*<span>([^<]+)<\/span>/i.exec(html);
      const statusMatch = /Status:?<\/b>\s*<span>([^<]+)<\/span>/i.exec(html);
      const typeMatch = /Type:?<\/b>\s*<span>\s*<a[^>]*>([^<]+)<\/a>/i.exec(html);

      const rawType = (typeMatch ? typeMatch[1] : "").toLowerCase();
      let comicType = "manga";
      if (rawType.includes("manhwa")) comicType = "manhwa";
      else if (rawType.includes("manhua")) comicType = "manhua";
      else if (rawType.includes("doujin")) comicType = "doujin";

      const isAdult = genres.some(g => /18\+|adult|ecchi|hentai|erotica|mature|smut/i.test(g));

      const chapters: any[] = [];
      const chapterRegex = /<li[^>]*class="[^"]*komik_info-chapters-item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*\/chapter\/([^"\/]+)\/?)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span[^>]*class="[^"]*chapter-link-time[^"]*"[^>]*>([^<]*)<\/span>/gi;
      let cMatch;
      let orderIndex = 1;
      while ((cMatch = chapterRegex.exec(html)) !== null) {
        const chLink = cMatch[1];
        const chSlug = cMatch[2];
        const chRawTitle = cMatch[3].replace(/<[^>]+>/g, "").trim();
        const chTime = cMatch[4]?.trim() || "Terbaru";

        const numMatch = /chapter\s*(\d+(?:\.\d+)?)/i.exec(chRawTitle);
        const chNum = numMatch ? parseFloat(numMatch[1]) : orderIndex++;

        chapters.push({
          title: chRawTitle || `Chapter ${chNum}`,
          chapterNumber: chNum,
          chapterSlug: chSlug,
          link: chLink,
          releaseDate: chTime
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: "success",
          data: {
            title,
            slug,
            coverImage: rawCover ? `/api/proxy-image?url=${encodeURIComponent(rawCover)}` : "",
            rawCover,
            synopsis,
            genres: genres.length > 0 ? genres : ["Action", "Fantasy"],
            storyWriter: authorMatch ? authorMatch[1].trim() : "Komikcast Studio",
            artist: "Official Artist",
            status: (statusMatch && statusMatch[1].toLowerCase().includes("complete")) ? "completed" : "ongoing",
            comicType,
            contentType: isAdult ? "18plus" : "normal",
            chapters
          }
        })
      };
    }

    // ----------------------------------------------------
    // ACTION 3: CHAPTER READING PAGES
    // ----------------------------------------------------
    if (action === "chapter") {
      const slug = params.slug || "";
      if (!slug) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Chapter slug is required" }) };
      }

      const targetUrl = `${KOMIKCAST_BASE_URL}/chapter/${String(slug)}/`;
      const html = await fetchKomikcastHtml(targetUrl);

      const pages: any[] = [];
      const areaMatch = /<div[^>]*id="readerarea"[^>]*>([\s\S]*?)<\/div>/i.exec(html) ||
                        /<div[^>]*class="[^"]*main-reading-area[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);

      const searchHtml = areaMatch ? areaMatch[1] : html;
      const imgRegex = /<img[^>]*src="([^"]+)"/gi;
      let imgMatch;
      let pageNum = 1;

      while ((imgMatch = imgRegex.exec(searchHtml)) !== null) {
        const rawUrl = imgMatch[1];
        if (rawUrl && !rawUrl.includes("logo") && !rawUrl.includes("icon") && !rawUrl.includes("banner")) {
          pages.push({
            id: `kc-${slug}-${pageNum}`,
            pageNumber: pageNum,
            imageUrl: `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`,
            rawUrl
          });
          pageNum++;
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: "success",
          chapterSlug: slug,
          count: pages.length,
          pages
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Unknown action: ${action}` })
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ status: "error", message: error.message })
    };
  }
};
