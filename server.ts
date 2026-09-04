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
import { scrapeKomiktapSearch, scrapeKomiktapDetail, scrapeKomiktapChapterPages } from "./api/komiktap-proxy";
import { scrapeKomikindoSearch, scrapeKomikindoSearchWithDiagnostics, scrapeKomikindoDetail, scrapeKomikindoChapterPages } from "./api/komikindo-proxy";

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

function sanitizeChaptersMap(rawChapters: Record<string, Chapter[]> | undefined): Record<string, Chapter[]> {
  if (!rawChapters || typeof rawChapters !== "object") return {};
  const result: Record<string, Chapter[]> = {};

  for (const [comicId, chList] of Object.entries(rawChapters)) {
    if (!Array.isArray(chList)) continue;
    const seenIds = new Set<string>();
    const sanitized: Chapter[] = [];
    for (let i = 0; i < chList.length; i++) {
      const ch = chList[i];
      if (!ch) continue;
      let chId = ch.id || `ch-${comicId}-${ch.chapterNumber || i + 1}`;
      if (seenIds.has(chId)) {
        chId = `${chId}-v${i + 1}`;
      }
      seenIds.add(chId);
      sanitized.push({
        ...ch,
        id: chId,
      });
    }
    result[comicId] = sanitized;
  }
  return result;
}

const GOOD_BACKUP_FILE = path.join(DATA_DIR, "db.good.json");

function loadDatabase(): CentralDB {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.comics)) {
        // Save known good copy
        try {
          fs.writeFileSync(GOOD_BACKUP_FILE, content, "utf-8");
        } catch (_) {}

        return {
          comics: parsed.comics || [],
          chapters: sanitizeChaptersMap(parsed.chapters),
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
      console.error("[SERVER DB ERROR] Gagal mem-parse db.json. Mencoba pulihkan dari backup:", e);
      try {
        const backupFile = `${DB_FILE}.corrupt.${Date.now()}`;
        fs.copyFileSync(DB_FILE, backupFile);
        console.error(`[SERVER DB BACKUP] File db.json yang rusak telah dibackup ke: ${backupFile}`);
      } catch (backupErr) {
        console.error("[SERVER DB BACKUP FAILED]", backupErr);
      }

      // Try fallback to known good backup if available
      if (fs.existsSync(GOOD_BACKUP_FILE)) {
        try {
          const goodContent = fs.readFileSync(GOOD_BACKUP_FILE, "utf-8");
          const goodParsed = JSON.parse(goodContent);
          if (goodParsed && Array.isArray(goodParsed.comics)) {
            console.log("[SERVER DB] Berhasil memulihkan database dari db.good.json!");
            return {
              comics: goodParsed.comics || [],
              chapters: sanitizeChaptersMap(goodParsed.chapters),
              users: goodParsed.users || initialUsers,
              banners: goodParsed.banners || [],
              driveAccounts: goodParsed.driveAccounts || initialDriveAccounts,
              activityLogs: goodParsed.activityLogs || initialActivityLogs,
              systemSettings: goodParsed.systemSettings || initialSystemSettings,
              comments: goodParsed.comments || initialComments,
              ads: goodParsed.ads || initialAds,
              adSettings: goodParsed.adSettings || initialAdSettings,
              version: goodParsed.version || Date.now(),
            };
          }
        } catch (goodErr) {
          console.error("[SERVER DB] Gagal membaca db.good.json:", goodErr);
        }
      }
    }
  }

  // Initial seed if db.json does not exist or cannot be recovered
  console.log("[SERVER DB] Menginisialisasi dataset fallback lokal (DEVELOPMENT ONLY)...");
  const initialData: CentralDB = {
    comics: initialComics,
    chapters: sanitizeChaptersMap(initialChapters),
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

let isSavingDb = false;
let pendingSaveDbData: CentralDB | null = null;

function saveDatabase(data: CentralDB): void {
  data.version = Date.now();
  pendingSaveDbData = data;

  if (isSavingDb) {
    return;
  }

  isSavingDb = true;
  setImmediate(() => {
    while (pendingSaveDbData) {
      const currentData = pendingSaveDbData;
      pendingSaveDbData = null;

      try {
        const jsonContent = JSON.stringify(currentData, null, 2);
        // Verify that JSON string is valid before writing to disk
        JSON.parse(jsonContent);

        const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`;
        fs.writeFileSync(tempFile, jsonContent, "utf-8");
        fs.renameSync(tempFile, DB_FILE);

        // Keep good backup updated
        try {
          fs.writeFileSync(GOOD_BACKUP_FILE, jsonContent, "utf-8");
        } catch (_) {}
      } catch (e) {
        console.error("Failed to save central database to disk safely:", e);
      }
    }
    isSavingDb = false;
  });
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
    data: {
      ...(partialUpdate || dbState),
      version: dbState.version,
    },
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

  // Supabase Universal Config endpoint (Strictly authoritative Environment Variables)
  app.get("/api/supabase-config", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
    res.json({ url, anonKey });
  });

  app.post("/api/supabase-config", (_req, res) => {
    res.status(200).json({ 
      success: true, 
      message: "Supabase config is managed centrally via environment variables." 
    });
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
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Send initial state immediately
    res.write(`data: ${JSON.stringify({ type: "init", data: dbState })}\n\n`);

    sseClients.add(res);

    const pingInterval = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch (_) {
        clearInterval(pingInterval);
        sseClients.delete(res);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(pingInterval);
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

  // 4b. Batch Upsert Comics
  app.post("/api/data/comics/batch-upsert", (req, res) => {
    const { comics } = req.body;
    if (!Array.isArray(comics) || comics.length === 0) {
      return res.status(400).json({ error: "Comics array required" });
    }

    const incomingIds = new Set(comics.map((c) => c.id));
    const incomingTitles = new Set(comics.map((c) => (c.title || "").trim().toLowerCase()));

    const remaining = dbState.comics.filter(
      (c) => !incomingIds.has(c.id) && !incomingTitles.has((c.title || "").trim().toLowerCase())
    );

    dbState.comics = [...comics, ...remaining];
    broadcastDatabaseUpdate({ comics: dbState.comics });
    res.json({ success: true, count: comics.length });
  });

  // 4c. Batch Inject Comics with Chapters (All-in-one atomic endpoint)
  app.post("/api/data/batch-inject", (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array required" });
    }

    const newComics: Comic[] = [];
    items.forEach((item) => {
      if (item.comic && item.comic.id) {
        newComics.push(item.comic);
        if (Array.isArray(item.chapters)) {
          dbState.chapters[item.comic.id] = item.chapters;
        }
      }
    });

    const incomingIds = new Set(newComics.map((c) => c.id));
    const incomingTitles = new Set(newComics.map((c) => (c.title || "").trim().toLowerCase()));

    const remaining = dbState.comics.filter(
      (c) => !incomingIds.has(c.id) && !incomingTitles.has((c.title || "").trim().toLowerCase())
    );

    dbState.comics = [...newComics, ...remaining];
    broadcastDatabaseUpdate({ comics: dbState.comics, chapters: dbState.chapters });
    res.json({ success: true, count: newComics.length });
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

    const cleanUsername = (user.username || "").trim().toLowerCase();
    const remaining = dbState.users.filter(
      (u) =>
        u.id !== user.id &&
        (u.username || "").trim().toLowerCase() !== cleanUsername &&
        (user.role === "admin" ? u.role !== "admin" : true)
    );
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
  // KOMIKTAP SCRAPER & PROXY API ENDPOINTS (Komiktap.info)
  // ----------------------------------------------------

  // Search or browse catalog from Komiktap.info
  app.get("/api/komiktap/search", async (req, res) => {
    try {
      const { q = "", category = "all", page = "1", order = "popular" } = req.query;
      const items = await scrapeKomiktapSearch(
        String(q),
        String(category),
        Math.max(1, parseInt(String(page)) || 1),
        String(order)
      );
      res.json({ data: items, total: items.length });
    } catch (error: any) {
      console.error("Komiktap search error:", error.message);
      res.status(500).json({ error: "Failed to fetch from Komiktap", message: error.message, data: [] });
    }
  });

  // Get comic details & chapters list from Komiktap.info
  app.get("/api/komiktap/comic/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const detail = await scrapeKomiktapDetail(slug);
      res.json({ data: detail });
    } catch (error: any) {
      console.error("Komiktap comic detail error:", error.message);
      res.status(500).json({ error: "Failed to fetch comic detail from Komiktap", message: error.message });
    }
  });

  // Get chapter image pages from Komiktap.info
  app.get("/api/komiktap/chapter", async (req, res) => {
    try {
      const { url = "", slug = "" } = req.query;
      const target = String(url || slug).trim();
      if (!target) {
        return res.status(400).json({ error: "Chapter url or slug parameter is required" });
      }
      const result = await scrapeKomiktapChapterPages(target);
      res.json(result);
    } catch (error: any) {
      console.error("Komiktap chapter pages error:", error.message);
      res.status(500).json({ error: "Failed to fetch chapter pages from Komiktap", message: error.message, pages: [] });
    }
  });

  // Backward compatibility alias for legacy Doujindesu search
  app.get("/api/doujindesu/search", async (req, res) => {
    try {
      const { q = "", category = "all", page = "1" } = req.query;
      const items = await scrapeKomiktapSearch(
        String(q),
        String(category),
        Math.max(1, parseInt(String(page)) || 1),
        "popular"
      );
      res.json({ data: items, total: items.length });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch from Komiktap", message: error.message, data: [] });
    }
  });

  // ----------------------------------------------------
  // KOMIKINDO SCRAPER & PROXY API ENDPOINTS (komikindo.ch)
  // ----------------------------------------------------

  // Search or browse catalog from komikindo.ch
  app.get("/api/komikindo/search", async (req, res) => {
    try {
      const rawQ = String(req.query.searchQuery || req.query.q || req.query.search || "").trim();
      const isAll = rawQ.toLowerCase() === "all" || rawQ.toLowerCase() === "semua";
      const q = isAll ? "" : rawQ;
      const category = String(req.query.category || "all");
      const page = Math.max(1, parseInt(String(req.query.page || "1")) || 1);
      const order = String(req.query.order || "popular");

      const result = await scrapeKomikindoSearchWithDiagnostics(q, category, page, order);
      res.json(result);
    } catch (error: any) {
      console.error("Komikindo search error:", error.message);
      res.status(500).json({ error: "Failed to fetch from Komikindo", message: error.message, data: [] });
    }
  });

  // Get comic details & chapters list from komikindo.ch
  app.get("/api/komikindo/comic/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const detail = await scrapeKomikindoDetail(slug);
      res.json({ data: detail });
    } catch (error: any) {
      console.error("Komikindo comic detail error:", error.message);
      res.status(500).json({ error: "Failed to fetch comic detail from Komikindo", message: error.message });
    }
  });

  // Detail alias endpoint with query params
  app.get("/api/komikindo/detail", async (req, res) => {
    try {
      const { slug = "", url = "" } = req.query;
      const target = String(slug || url).trim();
      if (!target) {
        return res.status(400).json({ error: "Slug or url parameter is required" });
      }
      const detail = await scrapeKomikindoDetail(target);
      res.json({ data: detail });
    } catch (error: any) {
      console.error("Komikindo comic detail error:", error.message);
      res.status(500).json({ error: "Failed to fetch comic detail from Komikindo", message: error.message });
    }
  });

  // Get chapter image pages from komikindo.ch
  app.get("/api/komikindo/chapter", async (req, res) => {
    try {
      const { url = "", slug = "" } = req.query;
      const target = String(url || slug).trim();
      if (!target) {
        return res.status(400).json({ error: "Chapter url or slug parameter is required" });
      }
      const result = await scrapeKomikindoChapterPages(target);
      res.json(result);
    } catch (error: any) {
      console.error("Komikindo chapter pages error:", error.message);
      res.status(500).json({ error: "Failed to fetch chapter pages from Komikindo", message: error.message, pages: [] });
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
        limit = "50",
        offset = "0",
        rating = "all",
        category = "",
        origin = "",
      } = req.query;

      const qTitle = String(title).trim();
      const requestedLimit = Math.min(500, Math.max(1, Number(limit) || 50));
      const baseOffset = Math.max(0, Number(offset) || 0);

      const buildParams = (chunkLimit: number, currentOffset: number) => {
        const params = new URLSearchParams();
        if (qTitle) {
          params.append("title", qTitle);
          params.append("order[relevance]", "desc");
        } else {
          params.append("order[followedCount]", "desc");
        }

        params.append("limit", String(chunkLimit));
        params.append("offset", String(currentOffset));
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
        return params;
      };

      const fetchMangaDexChunk = async (chunkLimit: number, currentOffset: number) => {
        const params = buildParams(chunkLimit, currentOffset);
        const mangadexUrl = `https://api.mangadex.org/manga?${params.toString()}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);

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
        return await response.json();
      };

      // Fetch first batch (up to 100 items)
      const firstChunkLimit = Math.min(100, requestedLimit);
      const firstData = await fetchMangaDexChunk(firstChunkLimit, baseOffset);

      let allData = Array.isArray(firstData.data) ? [...firstData.data] : [];
      const totalAvailable = typeof firstData.total === "number" ? firstData.total : allData.length;

      // If requested limit > 100 and more items exist, fetch subsequent batches
      if (requestedLimit > 100 && totalAvailable > allData.length && allData.length > 0) {
        const targetCount = Math.min(requestedLimit, totalAvailable);
        let currentOffset = baseOffset + allData.length;

        while (allData.length < targetCount && currentOffset < totalAvailable) {
          const nextChunkLimit = Math.min(100, targetCount - allData.length);
          try {
            const nextData = await fetchMangaDexChunk(nextChunkLimit, currentOffset);
            if (nextData && Array.isArray(nextData.data) && nextData.data.length > 0) {
              allData.push(...nextData.data);
              currentOffset += nextData.data.length;
              if (nextData.data.length < nextChunkLimit) break;
            } else {
              break;
            }
          } catch (chunkErr) {
            console.warn("MangaDex subsequent chunk error:", chunkErr);
            break;
          }
        }
      }

      res.json({
        result: "ok",
        response: "collection",
        data: allData,
        limit: requestedLimit,
        offset: baseOffset,
        total: totalAvailable,
      });
    } catch (error: any) {
      console.error("Error fetching from MangaDex proxy:", error.message);
      res.status(500).json({
        error: "Failed to fetch from comic API",
        message: error.message,
        data: [],
      });
    }
  });

  // API Proxy for fetching chapters of a specific manga from MangaDex (with high-capacity multi-page support)
  app.get("/api/mangadex/chapters/:mangaId", async (req, res) => {
    try {
      const { mangaId } = req.params;
      const { lang = "" } = req.query;

      const fetchChaptersChunk = async (currentOffset: number, withLangFilter: boolean) => {
        const params = new URLSearchParams();
        params.append("limit", "100");
        params.append("offset", String(currentOffset));
        params.append("order[chapter]", "asc");
        params.append("includes[]", "scanlation_group");

        if (withLangFilter && lang) {
          const languages = String(lang).split(",");
          languages.forEach((l) => params.append("translatedLanguage[]", l.trim()));
        }

        const url = `https://api.mangadex.org/manga/${mangaId}/feed?${params.toString()}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
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

      let firstJson = await fetchChaptersChunk(0, Boolean(lang));
      if (!firstJson || !firstJson.data || firstJson.data.length === 0) {
        firstJson = await fetchChaptersChunk(0, false);
      }

      if (!firstJson || !firstJson.data) {
        return res.json({ chapters: [], total: 0 });
      }

      let rawItems = [...(firstJson.data || [])];
      const totalChaptersInFeed = typeof firstJson.total === "number" ? firstJson.total : rawItems.length;

      // If more chapters exist, fetch additional pages up to 500 chapters
      if (totalChaptersInFeed > rawItems.length && rawItems.length > 0) {
        let currentOffset = rawItems.length;
        const maxOffset = Math.min(500, totalChaptersInFeed);

        while (currentOffset < maxOffset) {
          try {
            const nextJson = await fetchChaptersChunk(currentOffset, Boolean(lang));
            if (nextJson && Array.isArray(nextJson.data) && nextJson.data.length > 0) {
              rawItems.push(...nextJson.data);
              currentOffset += nextJson.data.length;
              if (nextJson.data.length < 100) break;
            } else {
              break;
            }
          } catch (e) {
            break;
          }
        }
      }

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
          imageUrl: `/api/mangadex/image?chapterId=${chapterId}&hash=${hash}&filename=${encodeURIComponent(filename)}&quality=${qualityFolder}&baseUrl=${encodeURIComponent(baseUrl)}`,
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

  // Dedicated MangaDex Image Proxy with Multi-Tier Fallback & Dynamic Live Node Resolution
  app.get("/api/mangadex/image", async (req, res) => {
    try {
      const { hash = "", filename = "", quality = "data", baseUrl = "", chapterId = "" } = req.query;
      const strHash = String(hash);
      const strFile = String(filename);
      const strQuality = quality === "data-saver" ? "data-saver" : "data";
      const strBaseUrl = String(baseUrl || "").trim();
      const strChapterId = String(chapterId || "").trim();

      if (!strHash || !strFile) {
        return res.status(400).send("Hash and filename required");
      }

      const candidateUrls: string[] = [];
      if (strBaseUrl && strBaseUrl.startsWith("http")) {
        candidateUrls.push(`${strBaseUrl}/${strQuality}/${strHash}/${strFile}`);
      }
      candidateUrls.push(
        `https://uploads.mangadex.org/${strQuality}/${strHash}/${strFile}`,
        `https://s2.mangadex.org/${strQuality}/${strHash}/${strFile}`
      );

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

      // Dynamic fallback: If static candidates failed and chapterId is available, ask at-home server for current alive node
      if (!streamRes && strChapterId) {
        try {
          const atHomeRes = await fetch(`https://api.mangadex.org/at-home/server/${strChapterId}`);
          if (atHomeRes.ok) {
            const atHomeJson = await atHomeRes.json();
            const liveNode = atHomeJson.baseUrl;
            const liveHash = atHomeJson.chapter?.hash || strHash;
            if (liveNode) {
              const liveUrl = `${liveNode}/${strQuality}/${liveHash}/${strFile}`;
              const r = await fetch(liveUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                  "Referer": "https://mangadex.org/",
                  "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                }
              });
              if (r.ok) {
                streamRes = r;
              }
            }
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

  // ----------------------------------------------------
  // AUTOMATED MASS SCRAPER ENGINE (MANGADEX & MAL HIGH-CAPACITY)
  // ----------------------------------------------------
  interface AutoScraperState {
    isRunning: boolean;
    lastRun: string | null;
    totalComicsInDB: number;
    totalChaptersInDB: number;
    scrapedThisSession: number;
    targetCount: number;
    currentCategory: string;
    statusMessage: string;
    logs: string[];
    offsets: Record<string, number>;
  }

  const SCRAPER_CURSOR_FILE = path.join(DATA_DIR, "scraper-cursor.json");

  function loadScraperCursor(): Record<string, number> {
    if (fs.existsSync(SCRAPER_CURSOR_FILE)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(SCRAPER_CURSOR_FILE, "utf-8"));
        if (parsed && typeof parsed === "object") return parsed;
      } catch (e) {
        // ignore
      }
    }
    return {};
  }

  function saveScraperCursor(offsets: Record<string, number>) {
    try {
      fs.writeFileSync(SCRAPER_CURSOR_FILE, JSON.stringify(offsets, null, 2), "utf-8");
    } catch (e) {
      // ignore
    }
  }

  let persistentOffsets: Record<string, number> = loadScraperCursor();
  let stopScraperRequested = false;

  const autoScraperState: AutoScraperState = {
    isRunning: false,
    lastRun: null,
    totalComicsInDB: dbState.comics.length,
    totalChaptersInDB: Object.values(dbState.chapters).reduce((acc, c) => acc + (c?.length || 0), 0),
    scrapedThisSession: 0,
    targetCount: 500,
    currentCategory: "Standby",
    statusMessage: "Siap (Idle)",
    logs: [],
    offsets: persistentOffsets,
  };

  function addScraperLog(msg: string) {
    const timestamp = new Date().toLocaleTimeString("id-ID");
    autoScraperState.logs = [`[${timestamp}] ${msg}`, ...autoScraperState.logs.slice(0, 79)];
    console.log(`[AutoScraper] ${msg}`);
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function fetchMangaDexChaptersInternal(mangaId: string): Promise<Chapter[]> {
    try {
      const url = `https://api.mangadex.org/manga/${mangaId}/feed?limit=96&order[chapter]=asc&includes[]=scanlation_group`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 AntiTimpa/2.0",
          Accept: "application/json",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return [];
      const json = await res.json();
      if (!json || !json.data || !Array.isArray(json.data)) return [];

      const chapterMap = new Map<string, any>();
      for (const item of json.data) {
        const chNumStr = item.attributes?.chapter || "1";
        const itemLang = item.attributes?.translatedLanguage || "";
        const existing = chapterMap.get(chNumStr);
        if (!existing) {
          chapterMap.set(chNumStr, item);
        } else if (itemLang === "id") {
          chapterMap.set(chNumStr, item);
        } else if (itemLang === "en" && existing.attributes?.translatedLanguage !== "id") {
          chapterMap.set(chNumStr, item);
        }
      }

      const deduplicated = Array.from(chapterMap.values()).sort((a, b) => {
        const numA = parseFloat(a.attributes?.chapter || "0");
        const numB = parseFloat(b.attributes?.chapter || "0");
        return numA - numB;
      });

      const now = new Date().toISOString().split("T")[0];
      const seenChapterIds = new Set<string>();

      return deduplicated.map((ch: any, idx: number) => {
        const rawChNum = parseFloat(ch.attributes?.chapter || String(idx + 1));
        const chNum = isNaN(rawChNum) ? idx + 1 : rawChNum;
        const rawTitle = ch.attributes?.title || "";
        const displayTitle = rawTitle.trim() ? `Chapter ${chNum}: ${rawTitle.trim()}` : `Chapter ${chNum}`;
        
        let uniqueId = ch.id ? `ch-${ch.id}` : `ch-${mangaId}-${chNum}`;
        if (seenChapterIds.has(uniqueId)) {
          uniqueId = `${uniqueId}-${idx + 1}`;
        }
        seenChapterIds.add(uniqueId);

        return {
          id: uniqueId,
          comicId: `comic-md-${mangaId}`,
          chapterNumber: chNum,
          title: displayTitle,
          pagesCount: ch.attributes?.pages || 10,
          releaseDate: (ch.attributes?.publishAt || now).split("T")[0],
          isNew: idx >= deduplicated.length - 2,
          isLocked: false,
          sourceType: "images" as const,
          pages: [],
          viewsCount: Math.floor(Math.random() * 800) + 120,
          mangadexChapterId: ch.id,
          mangadexMangaId: mangaId,
        };
      });
    } catch (err) {
      return [];
    }
  }

  // All diverse MangaDex query streams (High capacity 100 limit each)
  const MANGADEX_STREAMS = [
    { key: "md_manhwa_popular", label: "Top Korean Manhwa (Populer)", params: "originalLanguage[]=ko&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_manhwa_rating", label: "Top Korean Manhwa (Rating Tinggi)", params: "originalLanguage[]=ko&order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_manhwa_latest", label: "Korean Manhwa (Rilis Terbaru)", params: "originalLanguage[]=ko&order[latestUploadedChapter]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_manhua_popular", label: "Top Chinese Manhua (Populer)", params: "originalLanguage[]=zh&originalLanguage[]=zh-hk&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_manhua_rating", label: "Top Chinese Manhua (Rating)", params: "originalLanguage[]=zh&originalLanguage[]=zh-hk&order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_manga_popular", label: "Top Japanese Manga (Populer)", params: "originalLanguage[]=ja&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_manga_rating", label: "Top Japanese Manga (Rating)", params: "originalLanguage[]=ja&order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_18plus_popular", label: "18+ VIP Dewasa / Erotica (Populer)", params: "contentRating[]=erotica&contentRating[]=pornographic&order[followedCount]=desc" },
    { key: "md_18plus_rating", label: "18+ VIP Dewasa / Erotica (Rating)", params: "contentRating[]=erotica&contentRating[]=pornographic&order[rating]=desc" },
    { key: "md_action_fantasy", label: "Action & Fantasy Super", params: "includedTags[]=391b0423-d847-456f-aff0-8b04c36f3b7b&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_isekai", label: "Isekai & Reincarnation", params: "includedTags[]=0a39e5ac-30ab-443a-96e7-b6e7732a0313&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_martial_arts", label: "Murim & Martial Arts", params: "includedTags[]=799c43e2-a302-490d-854f-e271a32237ce&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_romance_drama", label: "Romance & Drama Favorit", params: "includedTags[]=423e2eae-a7a2-4a8b-ac03-a8351462d71d&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive" },
    { key: "md_all_rating", label: "Semua Komik (Rating Tertinggi)", params: "order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica" },
    { key: "md_all_latest", label: "Semua Komik (Update Terbaru)", params: "order[latestUploadedChapter]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica" },
  ];

  // MAL / Jikan Stream categories
  const JIKAN_STREAMS = [
    { key: "jikan_top_manga", label: "MAL Top Japanese Manga", type: "manga" },
    { key: "jikan_top_manhwa", label: "MAL Top Korean Manhwa", type: "manhwa" },
    { key: "jikan_top_manhua", label: "MAL Top Chinese Manhua", type: "manhua" },
    { key: "jikan_top_doujin", label: "MAL Top 18+ Doujinshi", type: "doujin" },
    { key: "jikan_top_popular", label: "MAL Top by Popularity", filter: "bypopularity" },
    { key: "jikan_top_favorite", label: "MAL Top by Favorite", filter: "favorite" },
  ];

  async function runBackgroundAutoScraper(options: { 
    force?: boolean; 
    targetCount?: number; 
    categoryFilter?: string;
    preFetchChapters?: boolean;
  } = {}) {
    if (autoScraperState.isRunning) {
      addScraperLog("Auto-scraper sedang berjalan di background...");
      return;
    }

    const targetLimit = options.targetCount && options.targetCount > 0 ? options.targetCount : 500;
    const catFilter = (options.categoryFilter || "all").toLowerCase();
    stopScraperRequested = false;

    autoScraperState.isRunning = true;
    autoScraperState.targetCount = targetLimit;
    autoScraperState.scrapedThisSession = 0;
    autoScraperState.statusMessage = `Memulai penarikan massal (Target: ${targetLimit} Komik)...`;
    addScraperLog(`🚀 Memulai Mass Ingest Scraper — Target: ${targetLimit} komik baru (Filter: ${catFilter.toUpperCase()})`);

    let newlyAdded = 0;
    const now = new Date().toISOString().split("T")[0];

    // Filter active streams
    let activeMdStreams = MANGADEX_STREAMS;
    let activeJikanStreams = JIKAN_STREAMS;

    if (catFilter === "manhwa") {
      activeMdStreams = MANGADEX_STREAMS.filter(s => s.key.includes("manhwa"));
      activeJikanStreams = JIKAN_STREAMS.filter(s => s.type === "manhwa");
    } else if (catFilter === "manhua") {
      activeMdStreams = MANGADEX_STREAMS.filter(s => s.key.includes("manhua"));
      activeJikanStreams = JIKAN_STREAMS.filter(s => s.type === "manhua");
    } else if (catFilter === "manga") {
      activeMdStreams = MANGADEX_STREAMS.filter(s => s.key.includes("manga"));
      activeJikanStreams = JIKAN_STREAMS.filter(s => s.type === "manga");
    } else if (catFilter === "18plus") {
      activeMdStreams = MANGADEX_STREAMS.filter(s => s.key.includes("18plus"));
      activeJikanStreams = JIKAN_STREAMS.filter(s => s.type === "doujin");
    } else if (catFilter === "isekai") {
      activeMdStreams = MANGADEX_STREAMS.filter(s => s.key.includes("isekai"));
      activeJikanStreams = [];
    } else if (catFilter === "action") {
      activeMdStreams = MANGADEX_STREAMS.filter(s => s.key.includes("action") || s.key.includes("martial"));
      activeJikanStreams = [];
    }

    try {
      let streamIndex = 0;
      let consecutiveEmptyBatches = 0;

      // CONTINUOUS MULTI-STREAM MASS INGESTION LOOP
      while (newlyAdded < targetLimit && !stopScraperRequested) {
        // Stop if all streams exhausted
        if (consecutiveEmptyBatches >= activeMdStreams.length * 3 && activeMdStreams.length > 0) {
          addScraperLog("ℹ️ Seluruh halaman kategori telah dicapai atau tidak ada item baru.");
          break;
        }

        // 1. MANGA DEX STREAM INGESTION (Limit=100 per request)
        if (activeMdStreams.length > 0) {
          const stream = activeMdStreams[streamIndex % activeMdStreams.length];
          const currentOffset = persistentOffsets[stream.key] || 0;

          autoScraperState.currentCategory = `${stream.label} (Offset: ${currentOffset})`;
          autoScraperState.statusMessage = `Sedang menyedot ${stream.label} (Offset ${currentOffset})...`;

          try {
            const mdUrl = `https://api.mangadex.org/manga?${stream.params}&limit=100&offset=${currentOffset}&includes[]=cover_art&includes[]=author&includes[]=artist`;
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000);
            const res = await fetch(mdUrl, {
              signal: controller.signal,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntiTimpa-App/3.0",
                Accept: "application/json",
              },
            });
            clearTimeout(timeout);

            if (res.ok) {
              const data = await res.json();
              const items = data.data || [];

              if (items.length === 0) {
                consecutiveEmptyBatches++;
                // Reset stream offset if reached end (> 10000)
                persistentOffsets[stream.key] = 0;
              } else {
                consecutiveEmptyBatches = 0;
                // Advance cursor by 100 for this category stream
                persistentOffsets[stream.key] = (currentOffset + 100) % 10000;
                saveScraperCursor(persistentOffsets);

                let batchAdded = 0;
                for (const item of items) {
                  if (newlyAdded >= targetLimit || stopScraperRequested) break;

                  const mangaId = item.id;
                  const attributes = item.attributes || {};
                  const titleObj = attributes.title || {};
                  const altTitles = attributes.altTitles || [];
                  let title = titleObj.en || titleObj.ja || titleObj.ko || titleObj.zh || titleObj.id || Object.values(titleObj)[0];
                  if (!title && altTitles.length > 0) {
                    for (const alt of altTitles) {
                      if (alt.en || alt.ja || alt.ko || alt.id || alt.zh) {
                        title = alt.en || alt.ja || alt.ko || alt.id || alt.zh;
                        break;
                      }
                    }
                  }
                  if (!title) title = "Manga Title";

                  // Check if already in DB
                  const existing = dbState.comics.find(
                    (c) => c.mangaDexId === mangaId || c.id === `comic-md-${mangaId}` || c.title.toLowerCase() === title.toLowerCase()
                  );
                  if (existing) continue;

                  const descObj = attributes.description || {};
                  let synopsis = descObj.en || descObj.id || descObj.ja || descObj.ko || Object.values(descObj)[0] || "";
                  if (!synopsis || synopsis.trim().length < 10) {
                    synopsis = `${title} adalah serial komik resmi terpopuler dari jaringan MangaDex dengan pembaruan berkala.`;
                  }

                  let coverFileName = "";
                  let authorName = "Official Writer";
                  let artistName = "Official Artist";

                  if (Array.isArray(item.relationships)) {
                    for (const rel of item.relationships) {
                      if (rel.type === "cover_art" && rel.attributes?.fileName) {
                        coverFileName = rel.attributes.fileName;
                      }
                      if (rel.type === "author" && rel.attributes?.name) {
                        authorName = rel.attributes.name;
                      }
                      if (rel.type === "artist" && rel.attributes?.name) {
                        artistName = rel.attributes.name;
                      }
                    }
                  }

                  const coverImage = coverFileName
                    ? `https://uploads.mangadex.org/covers/${mangaId}/${coverFileName}.512.jpg`
                    : `https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80`;

                  const genres = (attributes.tags || [])
                    .map((t: any) => t.attributes?.name?.en)
                    .filter(Boolean);

                  const contentRating = attributes.contentRating || "safe";
                  const isAdult = contentRating === "erotica" || contentRating === "pornographic";
                  const rawOriginalLang = (attributes.originalLanguage || "").toLowerCase();
                  let comicType: "manga" | "manhwa" | "manhua" | "doujin" | "webtoon" = "manga";
                  if (rawOriginalLang === "ko") comicType = "manhwa";
                  else if (rawOriginalLang === "zh" || rawOriginalLang === "zh-hk") comicType = "manhua";
                  else if (isAdult) comicType = "doujin";

                  const comicId = `comic-md-${mangaId}`;
                  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

                  // If user requests pre-fetching chapters for the first few items
                  let realChapters: Chapter[] = [];
                  if (options.preFetchChapters && newlyAdded < 20) {
                    await sleep(200);
                    realChapters = await fetchMangaDexChaptersInternal(mangaId);
                  }

                  const newComic: Comic = {
                    id: comicId,
                    title,
                    slug,
                    coverImage,
                    bannerImage: coverImage,
                    synopsis: synopsis.slice(0, 500),
                    genres: genres.length > 0 ? genres.slice(0, 5) : [comicType === "manhwa" ? "Manhwa" : "Action", "Drama"],
                    status: attributes.status === "completed" ? "completed" : "ongoing",
                    storyWriter: authorName,
                    artist: artistName,
                    rating: isAdult ? 4.9 : 4.88,
                    ratingCount: Math.floor(Math.random() * 4000) + 1200,
                    totalChapters: realChapters.length > 0 ? realChapters.length : (attributes.lastChapter ? parseFloat(attributes.lastChapter) || 0 : 0),
                    totalReaders: Math.floor(Math.random() * 15000) + 3500,
                    createdAt: now,
                    updatedAt: now,
                    isTrending: true,
                    isFeatured: true,
                    contentType: isAdult ? "18plus" : "normal",
                    comicType,
                    type: comicType,
                    isFree: !isAdult,
                    isVisibleOnHome: true,
                    showOnHome: true,
                    isPublished: true,
                    sourceApi: "MangaDex Live API",
                    sourceUrl: `https://mangadex.org/title/${mangaId}`,
                    mangaDexId: mangaId,
                  };

                  dbState.comics = [newComic, ...dbState.comics.filter((c) => c.id !== newComic.id)];
                  if (realChapters.length > 0) {
                    dbState.chapters[comicId] = realChapters;
                  }
                  newlyAdded++;
                  batchAdded++;
                  autoScraperState.scrapedThisSession = newlyAdded;
                  autoScraperState.totalComicsInDB = dbState.comics.length;

                  if (newlyAdded % 25 === 0) {
                    addScraperLog(`📦 [${newlyAdded}/${targetLimit}] Menyimpan batch DB (Total: ${dbState.comics.length} komik)`);
                    broadcastDatabaseUpdate({
                      comics: dbState.comics,
                      chapters: dbState.chapters,
                    });
                  }
                }

                if (batchAdded > 0) {
                  addScraperLog(`+ [MangaDex] +${batchAdded} komik baru dari "${stream.label}" (Offset: ${currentOffset})`);
                }
              }
            } else {
              addScraperLog(`MangaDex response HTTP ${res.status} pada ${stream.label}`);
            }
          } catch (streamErr: any) {
            addScraperLog(`Stream error (${stream.label}): ${streamErr.message}`);
          }
        }

        // 2. JIKAN / MYANIMELIST INGESTION
        if (activeJikanStreams.length > 0 && newlyAdded < targetLimit && !stopScraperRequested) {
          const jStream = activeJikanStreams[streamIndex % activeJikanStreams.length];
          const curPage = persistentOffsets[jStream.key] || 1;

          try {
            let jUrl = `https://api.jikan.moe/v4/top/manga?page=${curPage}&limit=25`;
            if (jStream.type) jUrl += `&type=${jStream.type}`;
            if (jStream.filter) jUrl += `&filter=${jStream.filter}`;

            const jRes = await fetch(jUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntiTimpa-App/3.0",
                Accept: "application/json",
              },
            });

            if (jRes.ok) {
              const jData = await jRes.json();
              const jItems = jData.data || [];

              if (jItems.length > 0) {
                persistentOffsets[jStream.key] = curPage + 1;
                saveScraperCursor(persistentOffsets);

                let jAdded = 0;
                for (const item of jItems) {
                  if (newlyAdded >= targetLimit || stopScraperRequested) break;

                  const malId = item.mal_id;
                  const title = item.title_english || item.title || "Manga Title";
                  const existing = dbState.comics.find(
                    (c) => c.id === `comic-mal-${malId}` || c.title.toLowerCase() === title.toLowerCase()
                  );
                  if (existing) continue;

                  const genres = (item.genres || []).map((g: any) => (typeof g === "string" ? g : g.name)).filter(Boolean);
                  const isAdult = (item.explicit_genres && item.explicit_genres.length > 0) ||
                    genres.some((g: string) => /hentai|ecchi|erotica|adult/i.test(g));

                  const typeLower = (item.type || "").toLowerCase();
                  let comicType: "manga" | "manhwa" | "manhua" | "doujin" | "webtoon" = "manga";
                  if (typeLower === "manhwa") comicType = "manhwa";
                  else if (typeLower === "manhua") comicType = "manhua";

                  const comicId = `comic-mal-${malId}`;
                  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  const coverImage = item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80";

                  const newComic: Comic = {
                    id: comicId,
                    title,
                    slug,
                    coverImage,
                    bannerImage: coverImage,
                    synopsis: (item.synopsis || `Sinopsis resmi ${title} dari database MyAnimeList.`).slice(0, 500),
                    genres: genres.length > 0 ? genres.slice(0, 5) : ["Action", "Fantasy"],
                    status: item.publishing ? "ongoing" : "completed",
                    storyWriter: item.authors?.[0]?.name || "Official Author",
                    artist: item.authors?.[1]?.name || item.authors?.[0]?.name || "Official Artist",
                    rating: item.score ? Math.min(5, Math.max(1, item.score / 2)) : 4.85,
                    ratingCount: item.scored_by || 2500,
                    totalChapters: item.chapters || 0,
                    totalReaders: item.members || 5000,
                    createdAt: now,
                    updatedAt: now,
                    isTrending: true,
                    isFeatured: true,
                    contentType: isAdult ? "18plus" : "normal",
                    comicType,
                    type: comicType,
                    isFree: !isAdult,
                    isVisibleOnHome: true,
                    showOnHome: true,
                    isPublished: true,
                    sourceApi: "MyAnimeList (MAL Official)",
                    sourceUrl: item.url || `https://myanimelist.net/manga/${malId}`,
                  };

                  dbState.comics = [newComic, ...dbState.comics.filter((c) => c.id !== newComic.id)];
                  newlyAdded++;
                  jAdded++;
                  autoScraperState.scrapedThisSession = newlyAdded;
                  autoScraperState.totalComicsInDB = dbState.comics.length;
                }

                if (jAdded > 0) {
                  addScraperLog(`+ [MAL] +${jAdded} komik baru dari "${jStream.label}" (Page: ${curPage})`);
                }
              }
            }
          } catch (malErr) {
            // ignore
          }
        }

        streamIndex++;
        // Polite delay between batch requests (350ms)
        await sleep(350);
      }

      // Final save and broadcast
      autoScraperState.totalComicsInDB = dbState.comics.length;
      autoScraperState.totalChaptersInDB = Object.values(dbState.chapters).reduce((acc, c) => acc + (c?.length || 0), 0);
      autoScraperState.lastRun = new Date().toISOString();
      autoScraperState.statusMessage = stopScraperRequested
        ? `Dihentikan oleh admin. Menambahkan ${newlyAdded} komik. Total DB: ${dbState.comics.length}.`
        : `Selesai! Berhasil menambahkan ${newlyAdded} komik baru. Total DB: ${dbState.comics.length} judul.`;

      broadcastDatabaseUpdate({
        comics: dbState.comics,
        chapters: dbState.chapters,
      });

      addScraperLog(`🎉 Selesai Ingest! Berhasil menambahkan ${newlyAdded} komik baru. Total komik sekarang: ${dbState.comics.length} judul di database.`);
    } catch (globalErr: any) {
      autoScraperState.statusMessage = `Error: ${globalErr.message}`;
      addScraperLog(`❌ Auto-Scraper Error: ${globalErr.message}`);
    } finally {
      autoScraperState.isRunning = false;
      stopScraperRequested = false;
      autoScraperState.offsets = persistentOffsets;
    }
  }

  // Auto-Scraper REST endpoints (Directs traffic to authoritative Client Turbo Scraper / Supabase pipeline)
  app.get("/api/scraper/auto-status", (_req, res) => {
    autoScraperState.totalComicsInDB = dbState.comics.length;
    autoScraperState.totalChaptersInDB = Object.values(dbState.chapters).reduce((acc, c) => acc + (c?.length || 0), 0);
    autoScraperState.offsets = persistentOffsets;
    res.json(autoScraperState);
  });

  app.post("/api/scraper/auto-sync", async (req, res) => {
    // Return explicit response to use Client-Side Turbo Scraper which writes directly to Supabase Single Source of Truth
    res.json({ 
      success: false, 
      mode: "client_turbo", 
      message: "Scraping master data dialihkan ke Universal Turbo Scraper yang menulis langsung ke Supabase PostgreSQL." 
    });
  });

  app.post("/api/scraper/auto-stop", (_req, res) => {
    stopScraperRequested = true;
    addScraperLog("⚠️ Permintaan penghentian scraper diterima dari admin.");
    res.json({ message: "Permintaan stop dikirim", state: autoScraperState });
  });

  app.post("/api/scraper/auto-reset-cursor", (_req, res) => {
    persistentOffsets = {};
    saveScraperCursor({});
    autoScraperState.offsets = {};
    addScraperLog("🔄 Seluruh offset cursor scraper telah direset ke 0 (Mulai dari awal).");
    res.json({ message: "Offset cursor berhasil direset", state: autoScraperState });
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
      } else if (lower.includes("komikindo") || lower.includes("imageainewgeneration") || lower.includes("himmga") || lower.includes("gaimgame") || lower.includes("indocontentaising") || lower.includes("aicontentwow") || lower.includes("contentkerewnrorai")) {
        referer = "https://komikindo.ch/";
      } else if (lower.includes("komiktap") || lower.includes("cdnasu") || lower.includes("uqni") || lower.includes("desu")) {
        referer = "https://komiktap.info/";
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

  // Direct alias for /api/image-proxy (for client or serverless compatibility)
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const imageUrl = (req.query.url as string) || '';
      if (!imageUrl) {
        return res.status(400).send("URL parameter is required");
      }

      let referer = "";
      const lower = imageUrl.toLowerCase();
      if (lower.includes("mangadex")) {
        referer = "https://mangadex.org/";
      } else if (lower.includes("komikindo") || lower.includes("imageainewgeneration") || lower.includes("himmga") || lower.includes("gaimgame") || lower.includes("indocontentaising") || lower.includes("aicontentwow") || lower.includes("contentkerewnrorai")) {
        referer = "https://komikindo.ch/";
      } else if (lower.includes("komiktap") || lower.includes("cdnasu") || lower.includes("uqni") || lower.includes("desu")) {
        referer = "https://komiktap.info/";
      } else if (lower.includes("myanimelist") || lower.includes("jikan")) {
        referer = "https://myanimelist.net/";
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
