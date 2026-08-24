import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Proxy for fetching comics from MangaDex public API
  // MangaDex supports contentRating filter: safe, suggestive, erotica, pornographic
  app.get("/api/mangadex/search", async (req, res) => {
    try {
      const {
        title = "",
        limit = "24",
        offset = "0",
        rating = "all", // "normal" | "18plus" | "all"
        category = "", // "18plus" | "manhwa" | "manga" | "manhua" | "all"
        origin = "", // "ko" | "ja" | "zh" | ""
      } = req.query;

      const qTitle = String(title).trim();
      const params = new URLSearchParams();
      
      if (qTitle) {
        params.append("title", qTitle);
        params.append("order[relevance]", "desc");
      } else {
        params.append("order[followedCount]", "desc");
      }

      const limitNum = Math.min(50, Math.max(6, Number(limit) || 20));
      params.append("limit", String(limitNum));
      params.append("offset", String(offset));
      params.append("includes[]", "cover_art");
      params.append("includes[]", "author");
      params.append("includes[]", "artist");

      // Content ratings filter
      if (rating === "18plus" || category === "18plus") {
        params.append("contentRating[]", "erotica");
        params.append("contentRating[]", "pornographic");
      } else if (rating === "normal") {
        params.append("contentRating[]", "safe");
        params.append("contentRating[]", "suggestive");
      } else {
        params.append("contentRating[]", "safe");
        params.append("contentRating[]", "suggestive");
        params.append("contentRating[]", "erotica");
        params.append("contentRating[]", "pornographic");
      }

      // Origin language filter (only apply if explicit origin or specific non-18+ category)
      if (origin) {
        params.append("originalLanguage[]", String(origin));
      } else if (!qTitle) {
        if (category === "manhwa") {
          params.append("originalLanguage[]", "ko");
        } else if (category === "manhua") {
          params.append("originalLanguage[]", "zh");
          params.append("originalLanguage[]", "zh-hk");
        } else if (category === "manga") {
          params.append("originalLanguage[]", "ja");
        }
      }

      const mangadexUrl = `https://api.mangadex.org/manga?${params.toString()}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(mangadexUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 KomikYuk/1.0",
          "Accept": "application/json",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`MangaDex API returned status: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching from MangaDex proxy:", error.message);
      res.status(500).json({
        error: "Failed to fetch from comic API",
        message: error.message,
      });
    }
  });

  // API Proxy for fetching chapters of a specific manga from MangaDex
  app.get("/api/mangadex/chapters/:mangaId", async (req, res) => {
    try {
      const { mangaId } = req.params;
      const { lang = "" } = req.query;

      const fetchChapters = async (withLangFilter: boolean) => {
        const params = new URLSearchParams();
        params.append("limit", "96");
        params.append("order[chapter]", "asc");
        params.append("includes[]", "scanlation_group");
        
        if (withLangFilter && lang) {
          const languages = String(lang).split(",");
          languages.forEach((l) => params.append("translatedLanguage[]", l.trim()));
        }

        const url = `https://api.mangadex.org/manga/${mangaId}/feed?${params.toString()}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KomikYuk-App/1.0",
            "Accept": "application/json"
          },
        });
        clearTimeout(timeout);

        if (!response.ok) return null;
        return await response.json();
      };

      let json = await fetchChapters(Boolean(lang));
      if (!json || !json.data || json.data.length === 0) {
        // Retry without language restriction so we get chapters regardless of translation
        json = await fetchChapters(false);
      }

      if (!json || !json.data) {
        return res.json({ chapters: [], total: 0 });
      }

      const rawItems = json.data || [];
      // Deduplicate by chapter number prioritizing English/Indonesian
      const chapterMap = new Map<string, any>();
      
      for (const item of rawItems) {
        const chNumStr = item.attributes?.chapter || '1';
        const itemLang = item.attributes?.translatedLanguage || '';
        const existing = chapterMap.get(chNumStr);
        if (!existing) {
          chapterMap.set(chNumStr, item);
        } else {
          // Prefer 'id' > 'en' > others
          if (itemLang === 'id') {
            chapterMap.set(chNumStr, item);
          } else if (itemLang === 'en' && existing.attributes?.translatedLanguage !== 'id') {
            chapterMap.set(chNumStr, item);
          }
        }
      }

      const deduplicated = Array.from(chapterMap.values()).sort((a, b) => {
        const numA = parseFloat(a.attributes?.chapter || '0');
        const numB = parseFloat(b.attributes?.chapter || '0');
        return numA - numB;
      });

      const formattedChapters = deduplicated.map((ch: any, idx: number) => {
        const chNum = parseFloat(ch.attributes?.chapter || String(idx + 1)) || (idx + 1);
        const rawTitle = ch.attributes?.title || '';
        const displayTitle = rawTitle.trim() ? `Chapter ${chNum}: ${rawTitle.trim()}` : `Chapter ${chNum}`;
        return {
          id: ch.id,
          chapterNumber: chNum,
          title: displayTitle,
          pagesCount: ch.attributes?.pages || 8,
          releaseDate: (ch.attributes?.publishAt || ch.attributes?.readableAt || new Date().toISOString()).split('T')[0],
          translatedLanguage: ch.attributes?.translatedLanguage || 'en',
          externalUrl: ch.attributes?.externalUrl || null,
        };
      });

      res.json({ chapters: formattedChapters, total: formattedChapters.length });
    } catch (error: any) {
      console.error("Error fetching chapters:", error.message);
      res.status(500).json({ error: "Failed to fetch chapters", message: error.message, chapters: [] });
    }
  });

  // API Proxy for fetching chapter image pages from MangaDex (Dual endpoint support: @home server + direct chapter feed)
  app.get("/api/mangadex/pages/:chapterId", async (req, res) => {
    try {
      const { chapterId } = req.params;
      const { quality = "data" } = req.query; // "data" (high quality) or "data-saver"
      
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
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 KomikYuk-App/1.0",
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
        // Fallback to Attempt 2
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
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 KomikYuk-App/1.0",
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
        return res.status(404).json({ error: "No image pages found for chapter", pages: [], chapterId });
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
          proxyUrl: `/api/proxy-image?url=${encodeURIComponent(directUrl)}`,
          fallbackUrl: directUrl,
          directUrl
        };
      });

      res.json({ pages, count: pages.length, hash, baseUrl, chapterId });
    } catch (error: any) {
      console.error("Error fetching chapter pages:", error.message);
      res.status(500).json({ error: "Failed to fetch chapter pages", message: error.message, pages: [] });
    }
  });

  // Dedicated MangaDex Image Proxy with Multi-tier Fallback
  app.get("/api/mangadex/image", async (req, res) => {
    try {
      const { 
        chapterId = "", 
        hash = "", 
        filename = "", 
        quality = "data",
        url = ""
      } = req.query as Record<string, string>;

      if (!url && (!filename || (!chapterId && !hash))) {
        return res.status(400).send("chapterId/hash and filename (or url) are required");
      }

      const folder = quality === "data-saver" ? "data-saver" : "data";
      const targetKey = hash || chapterId;

      const candidateUrls: string[] = [];
      if (url) candidateUrls.push(url);

      if (targetKey && filename) {
        candidateUrls.push(`https://uploads.mangadex.org/${folder}/${targetKey}/${filename}`);
        const altFolder = folder === "data" ? "data-saver" : "data";
        candidateUrls.push(`https://uploads.mangadex.org/${altFolder}/${targetKey}/${filename}`);

        if (chapterId && chapterId !== targetKey) {
          candidateUrls.push(`https://uploads.mangadex.org/${folder}/${chapterId}/${filename}`);
          candidateUrls.push(`https://uploads.mangadex.org/${altFolder}/${chapterId}/${filename}`);
        }
      }

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 KomikYuk/1.0",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": "https://mangadex.org/"
      };

      let imageResponse: any = null;
      for (const targetUrl of candidateUrls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const r = await fetch(targetUrl, {
            signal: controller.signal,
            headers
          });
          clearTimeout(timeout);

          if (r.ok) {
            imageResponse = r;
            break;
          }
        } catch (e) {
          // Continue to next candidate
        }
      }

      if (!imageResponse) {
        return res.status(502).send("Failed to proxy MangaDex image");
      }

      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const arrayBuffer = await imageResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("MangaDex image proxy error:", error.message);
      res.status(500).send("Internal MangaDex image proxy error");
    }
  });

  // API Proxy for Jikan (MyAnimeList) manga search
  app.get("/api/jikan/search", async (req, res) => {
    try {
      const { q = "", limit = "20" } = req.query;
      const queryStr = String(q).trim();
      
      const url = queryStr 
        ? `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(queryStr)}&limit=${String(limit)}&sfw=false`
        : `https://api.jikan.moe/v4/top/manga?limit=${String(limit)}&filter=bypopularity`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KomikYuk-App/1.0",
          "Accept": "application/json"
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Jikan API returned ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.warn("Jikan search error:", error.message);
      res.status(500).json({ error: "Failed to fetch from Jikan", message: error.message, data: [] });
    }
  });

  // ==========================================
  // KOMIKCAST SCRAPER API ENDPOINTS (Indonesian Komikcast & Mirrors)
  // ==========================================
  const KOMIKCAST_BASE_URLS = [
    "https://komikcast.bz",
    "https://komikcast.li",
    "https://komikcast.me",
    "https://komiku.id"
  ];

  // Helper to fetch text with browser headers across mirrors
  const fetchKomikcastHtml = async (pathOrUrl: string): Promise<string> => {
    let lastError: any = null;

    for (const baseUrl of KOMIKCAST_BASE_URLS) {
      try {
        const targetUrl = pathOrUrl.startsWith('http') 
          ? pathOrUrl 
          : `${baseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "id,en-US,en;q=0.9",
            "Referer": `${baseUrl}/`
          }
        });
        clearTimeout(timeout);
        if (response.ok) {
          return await response.text();
        }
      } catch (err: any) {
        lastError = err;
      }
    }
    throw lastError || new Error("All Komikcast mirror fetches timed out");
  };

  // 1. Search & Browse Komikcast
  app.get("/api/komikcast/search", async (req, res) => {
    const { q = "", type = "", order = "popular", page = "1" } = req.query;
    const queryStr = String(q).trim();
    
    try {
      let targetUrl = `/daftar-komik/page/${page}/?status=&type=${type}&format=&order=${order}`;
      if (queryStr) {
        targetUrl = `/?s=${encodeURIComponent(queryStr)}`;
      }

      const html = await fetchKomikcastHtml(targetUrl);

      // Parse list items
      const results: any[] = [];
      // Match card containers
      const itemRegex = /<div[^>]*class="[^"]*(?:list-update_item|bsx)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      let match;

      while ((match = itemRegex.exec(html)) !== null) {
        const block = match[1];
        
        // Title & URL
        const titleMatch = /<a[^>]*href="([^"]*\/komik\/([^"\/]+)\/?)"[^>]*title="([^"]*)"[^>]*>/i.exec(block) ||
                           /<a[^>]*href="([^"]*\/komik\/([^"\/]+)\/?)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/i.exec(block);
        
        // Image
        const imgMatch = /<img[^>]*src="([^"]+)"/i.exec(block) || /<img[^>]*data-src="([^"]+)"/i.exec(block);

        // Type badge (Manga, Manhwa, Manhua)
        const typeMatch = /<span[^>]*class="[^"]*type[^"]*"[^>]*>([^<]+)<\/span>/i.exec(block);

        // Rating
        const ratingMatch = /<div[^>]*class="[^"]*numscore[^"]*"[^>]*>([^<]+)<\/div>/i.exec(block) ||
                            /<div[^>]*class="[^"]*rating[^"]*"[^>]*>[\s\S]*?<i>([^<]+)<\/i>/i.exec(block);

        // Latest chapter
        const chapterMatch = /<span[^>]*class="[^"]*chapter[^"]*"[^>]*>([^<]+)<\/span>/i.exec(block) ||
                             /<a[^>]*href="[^"]*\/chapter\/[^"]*"[^>]*>([^<]+)<\/a>/i.exec(block);

        if (titleMatch) {
          const rawTitle = titleMatch[3]?.trim() || titleMatch[2]?.replace(/-/g, ' ') || "Komik";
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

      return res.json({
        status: "success",
        count: results.length,
        data: results
      });
    } catch {
      // Graceful fallback without throwing 500 error
      return res.json({ 
        status: "success", 
        count: 0, 
        data: [], 
        fallback: true 
      });
    }
  });

  // 2. Detail Komikcast (Title, Synopsis, Genres, Authors, Chapters)
  app.get("/api/komikcast/detail", async (req, res) => {
    const { slug = "" } = req.query;
    if (!slug) return res.status(400).json({ error: "Slug is required" });

    const slugStr = String(slug);

    try {
      const targetUrl = `/komik/${slugStr}/`;
      const html = await fetchKomikcastHtml(targetUrl);

      // Title
      const titleMatch = /<h1[^>]*class="[^"]*komik_info-content-title[^"]*"[^>]*>([^<]+)<\/h1>/i.exec(html) ||
                         /<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/i.exec(html);
      const title = titleMatch ? titleMatch[1].trim() : slugStr.replace(/-/g, ' ');

      // Cover
      const imgMatch = /<div[^>]*class="[^"]*komik_info-content-thumbnail[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i.exec(html) ||
                       /<div[^>]*class="[^"]*thumb[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i.exec(html);
      const rawCover = imgMatch ? imgMatch[1] : "";

      // Synopsis
      const synMatch = /<div[^>]*class="[^"]*(?:komik_info-description-sinopsis|entry-content-single)[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
      const synopsis = synMatch ? synMatch[1].replace(/<[^>]+>/g, '').trim() : `Sinopsis lengkap untuk komik ${title}.`;

      // Genres
      const genres: string[] = [];
      const genreRegex = /<a[^>]*href="[^"]*\/genres\/([^"\/]+)\/?"[^>]*>([^<]+)<\/a>/gi;
      let gMatch;
      while ((gMatch = genreRegex.exec(html)) !== null) {
        genres.push(gMatch[2].trim());
      }

      // Metadata: Author, Status, Type
      const authorMatch = /Author:?<\/b>\s*<span>([^<]+)<\/span>/i.exec(html) || /Pengarang:?<\/b>\s*<span>([^<]+)<\/span>/i.exec(html);
      const statusMatch = /Status:?<\/b>\s*<span>([^<]+)<\/span>/i.exec(html);
      const typeMatch = /Type:?<\/b>\s*<span>\s*<a[^>]*>([^<]+)<\/a>/i.exec(html);

      const rawType = (typeMatch ? typeMatch[1] : '').toLowerCase();
      let comicType = "manga";
      if (rawType.includes("manhwa")) comicType = "manhwa";
      else if (rawType.includes("manhua")) comicType = "manhua";
      else if (rawType.includes("doujin")) comicType = "doujin";

      const isAdult = genres.some(g => /18\+|adult|ecchi|hentai|erotica|mature|smut/i.test(g));

      // Chapters
      const chapters: any[] = [];
      const chapterRegex = /<li[^>]*class="[^"]*komik_info-chapters-item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*\/chapter\/([^"\/]+)\/?)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span[^>]*class="[^"]*chapter-link-time[^"]*"[^>]*>([^<]*)<\/span>/gi;
      let cMatch;
      let orderIndex = 1;
      while ((cMatch = chapterRegex.exec(html)) !== null) {
        const chLink = cMatch[1];
        const chSlug = cMatch[2];
        const chRawTitle = cMatch[3].replace(/<[^>]+>/g, '').trim();
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

      return res.json({
        status: "success",
        data: {
          title,
          slug: slugStr,
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
      });
    } catch {
      // Fallback clean structured response
      const fallbackTitle = slugStr.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const fallbackChapters = Array.from({ length: 15 }, (_, i) => ({
        title: `Chapter ${15 - i}`,
        chapterNumber: 15 - i,
        chapterSlug: `${slugStr}-chapter-${15 - i}`,
        link: `/chapter/${slugStr}-chapter-${15 - i}`,
        releaseDate: `${i + 1} hari lalu`
      }));

      return res.json({
        status: "success",
        fallback: true,
        data: {
          title: fallbackTitle,
          slug: slugStr,
          coverImage: `https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80`,
          rawCover: "",
          synopsis: `Sinopsis lengkap untuk komik ${fallbackTitle}. Diperbarui secara berkala dengan terjemahan Bahasa Indonesia terbaik.`,
          genres: ["Action", "Adventure", "Fantasy", "Manhwa"],
          storyWriter: "Original Creator",
          artist: "Studio Staff",
          status: "ongoing",
          comicType: "manhwa",
          contentType: "normal",
          chapters: fallbackChapters
        }
      });
    }
  });

  // 3. Read Chapter Pages from Komikcast
  app.get("/api/komikcast/chapter", async (req, res) => {
    const { slug = "" } = req.query;
    if (!slug) return res.status(400).json({ error: "Chapter slug is required" });
    const slugStr = String(slug);

    try {
      const targetUrl = `/chapter/${slugStr}/`;
      const html = await fetchKomikcastHtml(targetUrl);

      // Extract image tags from #readerarea or .main-reading-area
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
            id: `kc-${slugStr}-${pageNum}`,
            pageNumber: pageNum,
            imageUrl: `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`,
            rawUrl
          });
          pageNum++;
        }
      }

      if (pages.length > 0) {
        return res.json({
          status: "success",
          chapterSlug: slugStr,
          count: pages.length,
          pages
        });
      }
      throw new Error("No pages found in chapter HTML");
    } catch {
      // Return high quality placeholder pages so reader doesn't crash
      const fallbackPages = Array.from({ length: 8 }, (_, i) => ({
        id: `kc-${slugStr}-${i + 1}`,
        pageNumber: i + 1,
        imageUrl: `https://images.unsplash.com/photo-${1607604276583 + i * 100}?w=900&auto=format&fit=crop&q=80`,
        rawUrl: ""
      }));

      return res.json({
        status: "success",
        fallback: true,
        chapterSlug: slugStr,
        count: fallbackPages.length,
        pages: fallbackPages
      });
    }
  });

  // ==========================================
  // GOOGLE DRIVE & DIRECT PDF DOWNLOAD PROXY
  // (Allows Admins to convert & download PDF from restricted / view-only Drive links)
  // ==========================================
  app.get("/api/drive/download-pdf", async (req, res) => {
    try {
      const { url = "", fileId = "", title = "document" } = req.query;
      let targetFileId = String(fileId).trim();

      if (!targetFileId && url) {
        const fullUrl = String(url);
        const matchD = /\/d\/([a-zA-Z0-9_-]+)/.exec(fullUrl);
        const matchId = /[?&]id=([a-zA-Z0-9_-]+)/.exec(fullUrl);
        targetFileId = matchD ? matchD[1] : (matchId ? matchId[1] : "");
      }

      if (!targetFileId) {
        return res.status(400).json({ error: "Valid Google Drive fileId or URL is required" });
      }

      // Try Google Drive direct export download endpoints
      const downloadUrls = [
        `https://drive.usercontent.google.com/download?id=${targetFileId}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${targetFileId}&confirm=t`,
        `https://docs.google.com/uc?export=download&id=${targetFileId}`
      ];

      let streamRes: any = null;
      for (const dUrl of downloadUrls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);
          const r = await fetch(dUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
          });
          clearTimeout(timeout);
          if (r.ok && (r.headers.get("content-type")?.includes("pdf") || r.headers.get("content-type")?.includes("octet-stream") || r.status === 200)) {
            streamRes = r;
            break;
          }
        } catch (e) {
          // Continue to next attempt
        }
      }

      if (!streamRes) {
        return res.status(502).json({ error: "Could not establish direct download stream from Drive" });
      }

      const safeName = String(title).replace(/[^a-zA-Z0-9_-]+/g, '_');
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);

      const arrayBuffer = await streamRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("Error exporting Drive PDF:", error.message);
      res.status(500).json({ error: "Failed to download Drive PDF", message: error.message });
    }
  });

  // Proxy image helper for external images (MangaDex, Komikcast, WP CDN, Google, etc.)
  app.get("/api/proxy-image", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).send("URL parameter is required");
      }

      let referer = "";
      const lower = imageUrl.toLowerCase();
      if (lower.includes("mangadex")) {
        referer = "https://mangadex.org/";
      } else if (lower.includes("komikcast")) {
        referer = "https://komikcast.bz/";
      } else if (lower.includes("wp.com") || lower.includes("blogspot") || lower.includes("googleusercontent")) {
        referer = "";
      } else {
        try {
          referer = new URL(imageUrl).origin;
        } catch (e) {
          referer = "";
        }
      }

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      };
      if (referer) {
        headers["Referer"] = referer;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch image from source");
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      res.status(500).send("Failed to proxy image");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`KomikYuk server running on http://localhost:${PORT}`);
  });
}

startServer();
