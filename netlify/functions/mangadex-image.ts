export const handler = async (event: any, _context: any) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const params = event.queryStringParameters || {};
    const { 
      chapterId = "", 
      hash = "", 
      filename = "", 
      quality = "data",
      url = ""
    } = params;

    if (!url && (!filename || (!chapterId && !hash))) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "chapterId/hash and filename (or url) are required" })
      };
    }

    const folder = quality === "data-saver" ? "data-saver" : "data";
    const targetKey = hash || chapterId;

    // List of candidate URLs to try in order
    const candidateUrls: string[] = [];

    if (url) {
      candidateUrls.push(url);
    }

    if (targetKey && filename) {
      // 1. Standard uploads.mangadex.org with hash/chapterId and requested quality
      candidateUrls.push(`https://uploads.mangadex.org/${folder}/${targetKey}/${filename}`);

      // 2. High quality fallback if data-saver requested or vice versa
      const altFolder = folder === "data" ? "data-saver" : "data";
      candidateUrls.push(`https://uploads.mangadex.org/${altFolder}/${targetKey}/${filename}`);

      // 3. If hash was provided and differs from chapterId, also try chapterId
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
    let successfulUrl = "";

    for (const targetUrl of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8500);
        const res = await fetch(targetUrl, {
          signal: controller.signal,
          headers
        });
        clearTimeout(timeout);

        if (res.ok) {
          imageResponse = res;
          successfulUrl = targetUrl;
          break;
        }
      } catch (e) {
        // Try next candidate
      }
    }

    if (!imageResponse) {
      return {
        statusCode: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to fetch MangaDex image from all candidate URLs", attempted: candidateUrls })
      };
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Proxied-From": successfulUrl
      },
      body: buffer.toString("base64")
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "MangaDex image proxy failure", message: error.message })
    };
  }
};
