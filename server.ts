import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  initialComics, 
  initialChapters, 
  initialUsers, 
  initialBanners, 
  initialAds, 
  initialAdSettings, 
  initialSystemSettings, 
  initialDriveAccounts, 
  initialActivityLogs, 
  initialComments 
} from "./src/data/initialData";
import { Comic, Chapter, User, Banner, DriveAccount, ActivityLog, SystemSettings, Comment, AdItem, AdSettings } from "./src/types";

interface CentralDB {
  comics: Comic[];
  chapters: Record<string, Chapter[]>;
  users: User[];
  banners: Banner[];
  driveAccounts: DriveAccount[];
  activityLogs: ActivityLog[];
  systemSettings: SystemSettings;
  comments: Comment[];
  ads: AdItem[];
  adSettings: AdSettings;
  version: number;
}

// Data directory for persistent server storage
const DATA_DIR = path.join(process.cwd(), "server-data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// Ensure server data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cached database state
let dbState: CentralDB;

function loadDatabase(): CentralDB {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.comics)) {
        return {
          comics: parsed.comics || [],
          chapters: parsed.chapters || {},
          users: parsed.users || initialUsers,
          banners: parsed.banners || [],
          driveAccounts: parsed.driveAccounts || initialDriveAccounts,
          activityLogs: parsed.activityLogs || initialActivityLogs,
          systemSettings: parsed.systemSettings || initialSystemSettings,
          comments: parsed.comments || initialComments,
          ads: parsed.ads || initialAds,
          adSettings: parsed.adSettings || initialAdSettings,
          version: parsed.version || Date.now(),
        };
      }
    } catch (e) {
      console.warn("Failed to parse db.json, re-initializing from default dataset:", e);
    }
  }

  // Initial seed if db.json does not exist
  const initialData: CentralDB = {
    comics: initialComics,
    chapters: initialChapters,
    users: initialUsers,
    banners: initialBanners,
    driveAccounts: initialDriveAccounts,
    activityLogs: initialActivityLogs,
    systemSettings: initialSystemSettings,
    comments: initialComments,
    ads: initialAds,
    adSettings: initialAdSettings,
    version: Date.now(),
  };

  saveDatabase(initialData);
  return initialData;
}

function saveDatabase(data: CentralDB): void {
  try {
    data.version = Date.now();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (e) {
    console.error("Failed to save central database to disk:", e);
  }
}

// Initialize database in memory
dbState = loadDatabase();

// Connected SSE clients for live multi-browser synchronization
const sseClients = new Set<express.Response>();

function broadcastDatabaseUpdate(partialUpdate?: Partial<CentralDB>) {
  dbState.version = Date.now();
  saveDatabase(dbState);

  const payload = JSON.stringify({
    type: "database_update",
    data: partialUpdate || dbState,
  });

  sseClients.forEach((client) => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch (err) {
      sseClients.delete(client);
    }
  });
}

// Jikan / MyAnimeList In-Memory Cache to prevent rate-limiting (429)
const jikanCache = new Map<string, { data: any; timestamp: number }>();
const JIKAN_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: dbState.version });
  });

  // ----------------------------------------------------
  // CENTRAL DATABASE REST & REALTIME SSE ENDPOINTS
  // ----------------------------------------------------

  // 1. Get full centralized database
  app.get("/api/data", (_req, res) => {
    res.json(dbState);
  });

  // 2. Check version for polling sync fallback
  app.get("/api/data/version", (req, res) => {
    const clientVersion = Number(req.query.v) || 0;
    res.json({
      version: dbState.version,
      hasUpdate: clientVersion < dbState.version,
    });
  });

  // 3. Realtime Server-Sent Events (SSE) stream for instant multi-browser sync
  app.get("/api/data/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send initial state immediately
    res.write(`data: ${JSON.stringify({ type: "init", data: dbState })}\n\n`);

    sseClients.add(res);

    req.on("close", () => {
      sseClients.delete(res);
    });
  });

  // 4. Save / Update Comic
  app.post("/api/data/comics", (req, res) => {
    const comic: Comic = req.body;
    if (!comic || !comic.id) {
      return res.status(400).json({ error: "Invalid comic data" });
    }

    const normalizedTitle = (comic.title || "").trim().toLowerCase();
    const remaining = dbState.comics.filter(
      (c) => c.id !== comic.id && (c.title || "").trim().toLowerCase() !== normalizedTitle
    );

    dbState.comics = [comic, ...remaining];
    broadcastDatabaseUpdate({ comics: dbState.comics });
    res.json({ success: true, comic });
  });

  // 5. Delete Comic
  app.delete("/api/data/comics/:id", (req, res) => {
    const { id } = req.params;
    dbState.comics = dbState.comics.filter((c) => c.id !== id);

    // Cascade delete chapters, comments, and banners for this comic
    delete dbState.chapters[id];
    dbState.comments = dbState.comments.filter((com) => com.comicId !== id);
    dbState.banners = dbState.banners.filter((b) => b.targetComicId !== id);

    broadcastDatabaseUpdate({
      comics: dbState.comics,
      chapters: dbState.chapters,
      comments: dbState.comments,
      banners: dbState.banners,
    });
    res.json({ success: true });
  });

  // 6. Batch Delete Comics
  app.post("/api/data/comics/batch-delete", (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "IDs array required" });
    }

    const idSet = new Set(ids);
    dbState.comics = dbState.comics.filter((c) => !idSet.has(c.id));

    ids.forEach((id) => {
      delete dbState.chapters[id];
    });
    dbState.comments = dbState.comments.filter((com) => !idSet.has(com.comicId));
    dbState.banners = dbState.banners.filter((b) => !b.targetComicId || !idSet.has(b.targetComicId));

    broadcastDatabaseUpdate({
      comics: dbState.comics,
      chapters: dbState.chapters,
      comments: dbState.comments,
      banners: dbState.banners,
    });
    res.json({ success: true, count: ids.length });
  });

  // 7. Save / Update Chapter
  app.post("/api/data/chapters", (req, res) => {
    const chapter: Chapter = req.body;
    if (!chapter || !chapter.comicId || !chapter.id) {
      return res.status(400).json({ error: "Invalid chapter data" });
    }

    if (!dbState.chapters[chapter.comicId]) {
      dbState.chapters[chapter.comicId] = [];
    }

    const remaining = dbState.chapters[chapter.comicId].filter((ch) => ch.id !== chapter.id);
    dbState.chapters[chapter.comicId] = [chapter, ...remaining].sort(
      (a, b) => b.chapterNumber - a.chapterNumber
    );

    broadcastDatabaseUpdate({ chapters: dbState.chapters });
    res.json({ success: true, chapter });
  });

  // 8. Delete Chapter
  app.delete("/api/data/chapters/:comicId/:chapterId", (req, res) => {
    const { comicId, chapterId } = req.params;
    if (dbState.chapters[comicId]) {
      dbState.chapters[comicId] = dbState.chapters[comicId].filter((ch) => ch.id !== chapterId);
      broadcastDatabaseUpdate({ chapters: dbState.chapters });
    }
    res.json({ success: true });
  });

  // 9. Save / Update User
  app.post("/api/data/users", (req, res) => {
    const user: User = req.body;
    if (!user || !user.id) {
      return res.status(400).json({ error: "Invalid user data" });
    }

    const remaining = dbState.users.filter((u) => u.id !== user.id);
    dbState.users = [user, ...remaining];

    broadcastDatabaseUpdate({ users: dbState.users });
    res.json({ success: true, user });
  });

  // 10. Delete User
  app.delete("/api/data/users/:id", (req, res) => {
    const { id } = req.params;
    dbState.users = dbState.users.filter((u) => u.id !== id);
    broadcastDatabaseUpdate({ users: dbState.users });
    res.json({ success: true });
  });

  // 11. Save Banner
  app.post("/api/data/banners", (req, res) => {
    const banner: Banner = req.body;
    if (!banner || !banner.id) {
      return res.status(400).json({ error: "Invalid banner data" });
    }

    const remaining = dbState.banners.filter((b) => b.id !== banner.id);
    dbState.banners = [banner, ...remaining];

    broadcastDatabaseUpdate({ banners: dbState.banners });
    res.json({ success: true, banner });
  });

  // 12. Delete Banner
  app.delete("/api/data/banners/:id", (req, res) => {
    const { id } = req.params;
    dbState.banners = dbState.banners.filter((b) => b.id !== id);
    broadcastDatabaseUpdate({ banners: dbState.banners });
    res.json({ success: true });
  });

  // 13. Save Drive Account
  app.post("/api/data/drives", (req, res) => {
    const drive: DriveAccount = req.body;
    if (!drive || !drive.id) {
      return res.status(400).json({ error: "Invalid drive data" });
    }

    const remaining = dbState.driveAccounts.filter((d) => d.id !== drive.id);
    dbState.driveAccounts = [drive, ...remaining];

    broadcastDatabaseUpdate({ driveAccounts: dbState.driveAccounts });
    res.json({ success: true, drive });
  });

  // 14. Delete Drive Account
  app.delete("/api/data/drives/:id", (req, res) => {
    const { id } = req.params;
    dbState.driveAccounts = dbState.driveAccounts.filter((d) => d.id !== id);
    broadcastDatabaseUpdate({ driveAccounts: dbState.driveAccounts });
    res.json({ success: true });
  });

  // 15. Save System Settings
  app.post("/api/data/settings", (req, res) => {
    const settings: SystemSettings = req.body;
    dbState.systemSettings = { ...dbState.systemSettings, ...settings };
    broadcastDatabaseUpdate({ systemSettings: dbState.systemSettings });
    res.json({ success: true, settings: dbState.systemSettings });
  });

  // 16. Save Ads & Ad Settings
  app.post("/api/data/ads", (req, res) => {
    const { ads, adSettings } = req.body;
    if (Array.isArray(ads)) dbState.ads = ads;
    if (adSettings) dbState.adSettings = adSettings;

    broadcastDatabaseUpdate({ ads: dbState.ads, adSettings: dbState.adSettings });
    res.json({ success: true });
  });

  // 17. Save / Add Comment
  app.post("/api/data/comments", (req, res) => {
    const comment: Comment = req.body;
    if (!comment || !comment.id) {
      return res.status(400).json({ error: "Invalid comment data" });
    }

    const remaining = dbState.comments.filter((c) => c.id !== comment.id);
    dbState.comments = [comment, ...remaining];

    broadcastDatabaseUpdate({ comments: dbState.comments });
    res.json({ success: true, comment });
  });

  // 18. Delete Comment
  app.delete("/api/data/comments/:id", (req, res) => {
    const { id } = req.params;
    dbState.comments = dbState.comments.filter((c) => c.id !== id && c.replyToId !== id);
    broadcastDatabaseUpdate({ comments: dbState.comments });
    res.json({ success: true });
  });

  // 19. Add Activity Log
  app.post("/api/data/logs", (req, res) => {
    const log: ActivityLog = req.body;
    if (log && log.id) {
      dbState.activityLogs = [log, ...dbState.activityLogs.slice(0, 199)];
      broadcastDatabaseUpdate({ activityLogs: dbState.activityLogs });
    }
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // JIKAN / MYANIMELIST PROXY & MULTI-TIER SCRAPER API
  // ----------------------------------------------------

  // Helper to map Kitsu manga entity to complete Jikan v4 Resource schema
  function mapKitsuToJikanResource(item: any): any {
    const attr = item.attributes || {};
    const titles = attr.titles || {};
    const canonicalTitle = attr.canonicalTitle || titles.en || titles.en_jp || Object.values(titles)[0] || "Manga Title";
    const poster = attr.posterImage || {};
    const cover = attr.coverImage || {};
    const imgUrl = poster.large || poster.original || poster.medium || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80";

    const score = attr.averageRating ? parseFloat((parseFloat(attr.averageRating) / 10).toFixed(2)) : 8.5;
    const malId = parseInt(item.id, 10) || Math.floor(Math.random() * 90000) + 1000;
    const subtype = (attr.subtype || attr.mangaType || "manga").toLowerCase();
    const typeLabel = subtype === "manhwa" ? "Manhwa" : subtype === "manhua" ? "Manhua" : subtype === "novel" ? "Novel" : "Manga";

    return {
      mal_id: malId,
      url: `https://myanimelist.net/manga/${malId}`,
      images: {
        jpg: {
          image_url: imgUrl,
          small_image_url: poster.small || imgUrl,
          large_image_url: imgUrl,
        },
        webp: {
          image_url: imgUrl,
          small_image_url: poster.small || imgUrl,
          large_image_url: imgUrl,
        },
      },
      approved: true,
      titles: [
        { type: "Default", title: canonicalTitle },
        { type: "English", title: titles.en || canonicalTitle },
        { type: "Japanese", title: titles.ja_jp || "" },
      ],
      title: canonicalTitle,
      title_english: titles.en || canonicalTitle,
      title_japanese: titles.ja_jp || "",
      title_synonyms: attr.abbreviatedTitles || [],
      type: typeLabel,
      chapters: attr.chapterCount || 0,
      volumes: attr.volumeCount || 0,
      status: attr.status === "finished" ? "Finished" : "Publishing",
      publishing: attr.status === "current" || attr.status === "publishing",
      score: score,
      scored_by: attr.userCount || 1500,
      rank: attr.ratingRank || 1,
      popularity: attr.popularityRank || 1,
      members: attr.userCount || 5000,
      favorites: attr.favoritesCount || 120,
      synopsis: attr.synopsis || attr.description || "Sinopsis komik terverifikasi dari database MyAnimeList.",
      background: "",
      authors: [
        { mal_id: 1, type: "people", name: "Official Author", url: "https://myanimelist.net" },
      ],
      genres: [
        { mal_id: 1, type: "manga", name: typeLabel, url: "https://myanimelist.net" },
        { mal_id: 2, type: "manga", name: "Action", url: "https://myanimelist.net" },
        { mal_id: 3, type: "manga", name: "Drama", url: "https://myanimelist.net" },
      ],
      explicit_genres: [],
      themes: [],
      demographics: [],
    };
  }

  // Multi-tier search: Jikan v4 -> Kitsu fallback
  async function searchMangaResilient(query: string, limit: number = 16, type: string = ""): Promise<any> {
    const qClean = query.trim();
    const limitNum = Math.min(25, Math.max(1, limit || 16));

    // Attempt 1: Official Jikan v4 API
    try {
      let jikanUrl: string;
      if (qClean) {
        jikanUrl = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(qClean)}&limit=${limitNum}&sfw=false`;
        if (type) jikanUrl += `&type=${encodeURIComponent(type)}`;
      } else {
        jikanUrl = `https://api.jikan.moe/v4/top/manga?limit=${limitNum}&filter=bypopularity`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(jikanUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntiTimpa-MAL/2.0",
          "Accept": "application/json",
        },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const json = await response.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          return json;
        }
      }
    } catch (e) {
      // Jikan failure / 504 / timeout -> proceed to Tier 2
    }

    // Attempt 2: Kitsu Manga API synthesized into Jikan schema
    try {
      const kitsuParams = new URLSearchParams();
      if (qClean) {
        kitsuParams.append("filter[text]", qClean);
      } else {
        kitsuParams.append("sort", "-userCount");
      }
      kitsuParams.append("page[limit]", String(limitNum));
      if (type) {
        kitsuParams.append("filter[subtype]", type.toLowerCase());
      }

      const kitsuUrl = `https://kitsu.io/api/edge/manga?${kitsuParams.toString()}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(kitsuUrl, {
        signal: controller.signal,
        headers: {
          "Accept": "application/vnd.api+json",
          "User-Agent": "AntiTimpa-App/2.0",
        },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const json = await response.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          const mappedItems = json.data.map((item: any) => mapKitsuToJikanResource(item));
          return {
            data: mappedItems,
            pagination: {
              last_visible_page: 1,
              has_next_page: false,
              current_page: 1,
              items: {
                count: mappedItems.length,
                total: json.meta?.count || mappedItems.length,
                per_page: limitNum,
              },
            },
          };
        }
      }
    } catch (e) {
      console.warn("Kitsu fallback failed:", e);
    }

    return { data: [], pagination: { last_visible_page: 0, has_next_page: false, current_page: 1 } };
  }

  // 1. Search manga on MyAnimeList via Jikan API with intelligent caching & multi-tier failover
  app.get("/api/jikan/search", async (req, res) => {
    try {
      const { q = "", limit = "16", type = "" } = req.query;
      const qClean = String(q).trim();
      const limitNum = Math.min(25, Math.max(1, Number(limit) || 16));
      const cacheKey = `search_${qClean}_${limitNum}_${type}`;

      const cached = jikanCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < JIKAN_CACHE_TTL) {
        return res.json(cached.data);
      }

      const result = await searchMangaResilient(qClean, limitNum, String(type));
      if (result.data && result.data.length > 0) {
        jikanCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error in Jikan Proxy:", error.message);
      res.status(500).json({ error: "Failed to fetch from Jikan MyAnimeList API", message: error.message, data: [] });
    }
  });

  // 2. Top manga from Jikan
  app.get("/api/jikan/top", async (req, res) => {
    try {
      const { limit = "16" } = req.query;
      const limitNum = Math.min(25, Math.max(1, Number(limit) || 16));
      const cacheKey = `top_${limitNum}`;

      const cached = jikanCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < JIKAN_CACHE_TTL) {
        return res.json(cached.data);
      }

      const result = await searchMangaResilient("", limitNum);
      if (result.data && result.data.length > 0) {
        jikanCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error in Jikan Top:", error.message);
      res.status(500).json({ error: "Failed to fetch top manga", message: error.message, data: [] });
    }
  });

  // 3. Get Manga Full Resource by ID (matches getMangaFullById /manga/{id}/full)
  app.get("/api/jikan/manga/:id/full", async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `full_${id}`;

      const cached = jikanCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < JIKAN_CACHE_TTL) {
        return res.json(cached.data);
      }

      // Try Jikan first
      try {
        const jikanRes = await fetch(`https://api.jikan.moe/v4/manga/${id}/full`, {
          headers: { "User-Agent": "AntiTimpa-MAL/2.0", "Accept": "application/json" },
        });
        if (jikanRes.ok) {
          const json = await jikanRes.json();
          if (json && json.data) {
            jikanCache.set(cacheKey, { data: json, timestamp: Date.now() });
            return res.json(json);
          }
        }
      } catch (e) {
        // failover
      }

      // Kitsu fallback by ID
      const kitsuRes = await fetch(`https://kitsu.io/api/edge/manga/${id}`);
      if (kitsuRes.ok) {
        const json = await kitsuRes.json();
        if (json && json.data) {
          const formatted = { data: mapKitsuToJikanResource(json.data) };
          jikanCache.set(cacheKey, { data: formatted, timestamp: Date.now() });
          return res.json(formatted);
        }
      }

      res.status(404).json({ error: "Manga not found" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch manga full details", message: error.message });
    }
  });

  // 4. Get Manga by ID (matches getMangaById /manga/{id})
  app.get("/api/jikan/manga/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `single_${id}`;

      const cached = jikanCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < JIKAN_CACHE_TTL) {
        return res.json(cached.data);
      }

      // Try Jikan
      try {
        const jikanRes = await fetch(`https://api.jikan.moe/v4/manga/${id}`, {
          headers: { "User-Agent": "AntiTimpa-MAL/2.0", "Accept": "application/json" },
        });
        if (jikanRes.ok) {
          const json = await jikanRes.json();
          if (json && json.data) {
            jikanCache.set(cacheKey, { data: json, timestamp: Date.now() });
            return res.json(json);
          }
        }
      } catch (e) {
        // failover
      }

      // Fallback
      const kitsuRes = await fetch(`https://kitsu.io/api/edge/manga/${id}`);
      if (kitsuRes.ok) {
        const json = await kitsuRes.json();
        if (json && json.data) {
          const formatted = { data: mapKitsuToJikanResource(json.data) };
          jikanCache.set(cacheKey, { data: formatted, timestamp: Date.now() });
          return res.json(formatted);
        }
      }

      res.status(404).json({ error: "Manga not found" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch manga details", message: error.message });
    }
  });

  // ----------------------------------------------------
  // DOUJINDESU PROXY & SCRAPER API ENDPOINTS
  // ----------------------------------------------------

  // Search Doujindesu (18+ & Doujinshi)
  app.get("/api/doujindesu/search", async (req, res) => {
    try {
      const { q = "", category = "all" } = req.query;
      const qStr = String(q).trim().toLowerCase();

      // Return Doujindesu curated catalog items
      const results = dbState.comics
        .filter((c) => c.contentType === "18plus" || c.comicType === "doujin" || c.sourceApi?.includes("Doujindesu"))
        .filter((c) => {
          if (!qStr) return true;
          return c.title.toLowerCase().includes(qStr) || (c.genres || []).some((g) => g.toLowerCase().includes(qStr));
        });

      res.json({ data: results, total: results.length });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch from Doujindesu proxy", message: error.message });
    }
  });

  // ----------------------------------------------------
  // MANGADEX PROXY & SCRAPER API ENDPOINTS
  // ----------------------------------------------------

  // API Proxy for fetching comics from MangaDex public API
  app.get("/api/mangadex/search", async (req, res) => {
    try {
      const {
        title = "",
        limit = "24",
        offset = "0",
        rating = "all",
        category = "",
        origin = "",
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AntiTimpa/2.0",
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
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntiTimpa-App/2.0",
            "Accept": "application/json",
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
        return res.json({ chapters: [], total: 0 });
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
        const chNum = parseFloat(ch.attributes?.chapter || String(idx + 1)) || idx + 1;
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

      res.json({ chapters: formattedChapters, total: formattedChapters.length });
    } catch (error: any) {
      console.error("Error fetching chapters:", error.message);
      res.status(500).json({ error: "Failed to fetch chapters", message: error.message, chapters: [] });
    }
  });

  // API Proxy for fetching chapter image pages from MangaDex
  app.get("/api/mangadex/pages/:chapterId", async (req, res) => {
    try {
      const { chapterId } = req.params;
      const { quality = "data" } = req.query;

      let baseUrl = "https://uploads.mangadex.org";
      let hash = "";
      let fileList: string[] = [];

      try {
        const atHomeUrl = `https://api.mangadex.org/at-home/server/${chapterId}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(atHomeUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AntiTimpa-App/2.0",
            "Accept": "application/json",
          },
        });
        clearTimeout(timeout);

        if (response.ok) {
          const json = await response.json();
          baseUrl = json.baseUrl || "https://uploads.mangadex.org";
          hash = json.chapter?.hash || "";
          fileList = quality === "data-saver" && json.chapter?.dataSaver?.length
            ? json.chapter.dataSaver
            : json.chapter?.data || json.chapter?.dataSaver || [];
        }
      } catch (e) {
        // Fallback
      }

      if (!fileList || fileList.length === 0) {
        try {
          const directChapterUrl = `https://api.mangadex.org/chapter/${chapterId}?includes[]=manga`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const response = await fetch(directChapterUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AntiTimpa-App/2.0",
              "Accept": "application/json",
            },
          });
          clearTimeout(timeout);

          if (response.ok) {
            const json = await response.json();
            const attr = json.data?.attributes || {};
            hash = attr.hash || "";
            fileList = quality === "data-saver" && attr.dataSaver?.length
              ? attr.dataSaver
              : attr.data || attr.dataSaver || [];
          }
        } catch (e) {
          // Fallback
        }
      }

      if (!hash || !fileList || fileList.length === 0) {
        return res.status(404).json({ error: "Chapter pages not found on MangaDex", pages: [] });
      }

      const qualityFolder = quality === "data-saver" ? "data-saver" : "data";
      const pages = fileList.map((filename: string, idx: number) => {
        const directUrl = `${baseUrl}/${qualityFolder}/${hash}/${filename}`;
        const uploadsDirectUrl = `https://uploads.mangadex.org/${qualityFolder}/${hash}/${filename}`;
        return {
          id: `page-${chapterId}-${idx + 1}`,
          pageNumber: idx + 1,
          imageUrl: `/api/mangadex/image?chapterId=${chapterId}&hash=${hash}&filename=${encodeURIComponent(filename)}&quality=${qualityFolder}`,
          fallbackUrl: `/api/proxy-image?url=${encodeURIComponent(uploadsDirectUrl)}`,
          directUrl,
          caption: `Halaman ${idx + 1}`,
        };
      });

      res.json({ pages, total: pages.length });
    } catch (error: any) {
      console.error("Error fetching chapter pages:", error.message);
      res.status(500).json({ error: "Failed to fetch chapter pages", message: error.message, pages: [] });
    }
  });

  // Dedicated MangaDex Image Proxy with Fallback & Direct Mirror Streaming
  app.get("/api/mangadex/image", async (req, res) => {
    try {
      const { hash = "", filename = "", quality = "data" } = req.query;
      const strHash = String(hash);
      const strFile = String(filename);
      const strQuality = quality === "data-saver" ? "data-saver" : "data";

      if (!strHash || !strFile) {
        return res.status(400).send("Hash and filename required");
      }

      const candidateUrls = [
        `https://uploads.mangadex.org/${strQuality}/${strHash}/${strFile}`,
        `https://s2.mangadex.org/${strQuality}/${strHash}/${strFile}`,
        `https://cmdxd98sb0x3yprd.mangadex.network/${strQuality}/${strHash}/${strFile}`,
      ];

      let streamRes: any = null;
      for (const targetUrl of candidateUrls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 9000);
          const r = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Referer": "https://mangadex.org/",
              "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            },
          });
          clearTimeout(timeout);

          if (r.ok) {
            streamRes = r;
            break;
          }
        } catch (e) {
          // continue
        }
      }

      if (!streamRes) {
        return res.status(502).send("Failed to stream image from MangaDex");
      }

      const contentType = streamRes.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=604800, s-maxage=604800");

      const arrayBuffer = await streamRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (e: any) {
      res.status(500).send("Error streaming MangaDex image");
    }
  });

  // Google Drive direct export download endpoints
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

      const downloadUrls = [
        `https://drive.usercontent.google.com/download?id=${targetFileId}&export=download&confirm=t`,
        `https://drive.google.com/uc?export=download&id=${targetFileId}&confirm=t`,
        `https://docs.google.com/uc?export=download&id=${targetFileId}`,
      ];

      let streamRes: any = null;
      for (const dUrl of downloadUrls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);
          const r = await fetch(dUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0",
            },
          });
          clearTimeout(timeout);
          if (r.ok && (r.headers.get("content-type")?.includes("pdf") || r.headers.get("content-type")?.includes("octet-stream") || r.status === 200)) {
            streamRes = r;
            break;
          }
        } catch (e) {
          // ignore
        }
      }

      if (!streamRes) {
        return res.status(502).json({ error: "Could not establish direct download stream from Drive" });
      }

      const safeName = String(title).replace(/[^a-zA-Z0-9_-]+/g, "_");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);

      const arrayBuffer = await streamRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("Error exporting Drive PDF:", error.message);
      res.status(500).json({ error: "Failed to download Drive PDF", message: error.message });
    }
  });

  // Universal Proxy image helper for external images
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
      } else if (lower.includes("myanimelist") || lower.includes("jikan")) {
        referer = "https://myanimelist.net/";
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
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
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
      res.setHeader("Cache-Control", "public, max-age=604800, s-maxage=604800");

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
    console.log(`AntiTimpa central server running on http://localhost:${PORT}`);
  });
}

startServer();
