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
    
    // Determine action: either explicit param 'action' or deduced from path
    let action = params.action || "";
    const path = event.path || "";
    
    if (!action) {
      if (path.includes("/chapters")) action = "chapters";
      else if (path.includes("/pages")) action = "pages";
      else action = "search";
    }

    // Extract mangaId / chapterId from path if not in query params
    let mangaId = params.mangaId || "";
    let chapterId = params.chapterId || "";

    if (!mangaId && path.includes("/chapters/")) {
      const parts = path.split("/chapters/");
      if (parts[1]) mangaId = parts[1].split("/")[0].split("?")[0];
    }
    if (!chapterId && path.includes("/pages/")) {
      const parts = path.split("/pages/");
      if (parts[1]) chapterId = parts[1].split("/")[0].split("?")[0];
    }

    // ----------------------------------------------------
    // ACTION 1: SEARCH & BROWSE MANGADEX
    // ----------------------------------------------------
    if (action === "search") {
      const {
        title = "",
        limit = "24",
        offset = "0",
        rating = "all", // "normal" | "18plus" | "all"
        category = "", // "18plus" | "manhwa" | "manga" | "manhua" | "all"
        origin = "", // "ko" | "ja" | "zh" | ""
      } = params;

      const qTitle = String(title).trim();
      const searchParams = new URLSearchParams();

      if (qTitle) {
        searchParams.append("title", qTitle);
        searchParams.append("order[relevance]", "desc");
      } else {
        searchParams.append("order[followedCount]", "desc");
      }

      const limitNum = Math.min(50, Math.max(6, Number(limit) || 20));
      searchParams.append("limit", String(limitNum));
      searchParams.append("offset", String(offset));
      searchParams.append("includes[]", "cover_art");
      searchParams.append("includes[]", "author");
      searchParams.append("includes[]", "artist");

      // Content ratings filter
      if (rating === "18plus" || category === "18plus") {
        searchParams.append("contentRating[]", "erotica");
        searchParams.append("contentRating[]", "pornographic");
      } else if (rating === "normal") {
        searchParams.append("contentRating[]", "safe");
        searchParams.append("contentRating[]", "suggestive");
      } else {
        searchParams.append("contentRating[]", "safe");
        searchParams.append("contentRating[]", "suggestive");
        searchParams.append("contentRating[]", "erotica");
        searchParams.append("contentRating[]", "pornographic");
      }

      // Origin language filter
      if (origin) {
        searchParams.append("originalLanguage[]", String(origin));
      } else if (!qTitle) {
        if (category === "manhwa") {
          searchParams.append("originalLanguage[]", "ko");
        } else if (category === "manhua") {
          searchParams.append("originalLanguage[]", "zh");
          searchParams.append("originalLanguage[]", "zh-hk");
        } else if (category === "manga") {
          searchParams.append("originalLanguage[]", "ja");
        }
      }

      const mangadexUrl = `https://api.mangadex.org/manga?${searchParams.toString()}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8500);

      const response = await fetch(mangadexUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KomikYuk-Netlify/1.0",
          "Accept": "application/json",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ error: `MangaDex API returned status: ${response.status}`, data: [] })
        };
      }

      const data = await response.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data)
      };
    }

    // ----------------------------------------------------
    // ACTION 2: CHAPTERS FEED FOR A MANGA
    // ----------------------------------------------------
    if (action === "chapters") {
      if (!mangaId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "mangaId parameter is required", chapters: [] })
        };
      }

      const lang = params.lang || "";

      const fetchChapters = async (withLangFilter: boolean) => {
        const query = new URLSearchParams();
        query.append("limit", "96");
        query.append("order[chapter]", "asc");
        query.append("includes[]", "scanlation_group");

        if (withLangFilter && lang) {
          const languages = String(lang).split(",");
          languages.forEach((l) => query.append("translatedLanguage[]", l.trim()));
        }

        const url = `https://api.mangadex.org/manga/${mangaId}/feed?${query.toString()}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7500);
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KomikYuk-Netlify/1.0",
            "Accept": "application/json"
          },
        });
        clearTimeout(timeout);

        if (!response.ok) return null;
        return await response.json();
      };

      let json = await fetchChapters(Boolean(lang));
      if (!json || !json.data || json.data.length === 0) {
        json = await fetchChapters(false);
      }

      if (!json || !json.data) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ chapters: [], total: 0 })
        };
      }

      const rawItems = json.data || [];
      const chapterMap = new Map<string, any>();

      for (const item of rawItems) {
        const chNumStr = item.attributes?.chapter || "1";
        const itemLang = item.attributes?.translatedLanguage || "";
        const existing = chapterMap.get(chNumStr);
        if (!existing) {
          chapterMap.set(chNumStr, item);
        } else {
          if (itemLang === "id") {
            chapterMap.set(chNumStr, item);
          } else if (itemLang === "en" && existing.attributes?.translatedLanguage !== "id") {
            chapterMap.set(chNumStr, item);
          }
        }
      }

      const deduplicated = Array.from(chapterMap.values()).sort((a, b) => {
        const numA = parseFloat(a.attributes?.chapter || "0");
        const numB = parseFloat(b.attributes?.chapter || "0");
        return numA - numB;
      });

      const formattedChapters = deduplicated.map((ch: any, idx: number) => {
        const chNum = parseFloat(ch.attributes?.chapter || String(idx + 1)) || (idx + 1);
        const rawTitle = ch.attributes?.title || "";
        const displayTitle = rawTitle.trim() ? `Chapter ${chNum}: ${rawTitle.trim()}` : `Chapter ${chNum}`;
        return {
          id: ch.id,
          chapterNumber: chNum,
          title: displayTitle,
          pagesCount: ch.attributes?.pages || 8,
          releaseDate: (ch.attributes?.publishAt || ch.attributes?.readableAt || new Date().toISOString()).split("T")[0],
          translatedLanguage: ch.attributes?.translatedLanguage || "en",
          externalUrl: ch.attributes?.externalUrl || null,
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ chapters: formattedChapters, total: formattedChapters.length })
      };
    }

    // ----------------------------------------------------
    // ACTION 3: PAGES FOR A CHAPTER
    // ----------------------------------------------------
    if (action === "pages") {
      if (!chapterId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "chapterId parameter is required", pages: [] })
        };
      }

      const quality = params.quality || "data";
      let baseUrl = "https://uploads.mangadex.org";
      let hash = "";
      let fileList: string[] = [];

      // Attempt 1: Fetch from /at-home/server/{chapterId}
      try {
        const atHomeUrl = `https://api.mangadex.org/at-home/server/${chapterId}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const response = await fetch(atHomeUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 KomikYuk-Netlify/1.0",
            "Accept": "application/json"
          },
        });
        clearTimeout(timeout);

        if (response.ok) {
          const json = await response.json();
          baseUrl = json.baseUrl || "https://uploads.mangadex.org";
          hash = json.chapter?.hash || "";
          fileList = quality === "data-saver" && json.chapter?.dataSaver?.length
            ? json.chapter.dataSaver
            : (json.chapter?.data || json.chapter?.dataSaver || []);
        }
      } catch (e) {
        // Fallback to Attempt 2 below
      }

      // Attempt 2: Fetch directly from /chapter/{chapterId}?includes[]=manga
      if (!fileList || fileList.length === 0) {
        try {
          const directChapterUrl = `https://api.mangadex.org/chapter/${chapterId}?includes[]=manga`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 7000);

          const response = await fetch(directChapterUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 KomikYuk-Netlify/1.0",
              "Accept": "application/json"
            },
          });
          clearTimeout(timeout);

          if (response.ok) {
            const json = await response.json();
            const attr = json.data?.attributes || {};
            hash = attr.hash || "";
            fileList = quality === "data-saver" && attr.dataSaver?.length
              ? attr.dataSaver
              : (attr.data || attr.dataSaver || []);
          }
        } catch (e) {
          // Both attempts failed
        }
      }

      if (!fileList || fileList.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "No image pages found for chapter", pages: [], chapterId })
        };
      }

      const folder = quality === "data-saver" ? "data-saver" : "data";
      const targetHashOrId = hash || chapterId;

      const pages = fileList.map((filename: string, idx: number) => {
        const directUrl = `${baseUrl}/${folder}/${targetHashOrId}/${filename}`;
        return {
          id: `p-${chapterId}-${idx + 1}`,
          pageNumber: idx + 1,
          filename,
          chapterId,
          hash,
          imageUrl: `/api/mangadex/image?chapterId=${chapterId}&hash=${hash}&filename=${encodeURIComponent(filename)}&quality=${quality}`,
          proxyUrl: `/.netlify/functions/mangadex-image?chapterId=${chapterId}&hash=${hash}&filename=${encodeURIComponent(filename)}&quality=${quality}`,
          fallbackUrl: directUrl,
          directUrl
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ pages, count: pages.length, hash, baseUrl, chapterId })
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
      body: JSON.stringify({ error: "Internal Netlify Function proxy error", message: error.message })
    };
  }
};
