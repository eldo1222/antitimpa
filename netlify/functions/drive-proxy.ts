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
    const { url = "", fileId = "", title = "document" } = params;
    let targetFileId = String(fileId).trim();

    if (!targetFileId && url) {
      const fullUrl = String(url);
      const matchD = /\/d\/([a-zA-Z0-9_-]+)/.exec(fullUrl);
      const matchId = /[?&]id=([a-zA-Z0-9_-]+)/.exec(fullUrl);
      targetFileId = matchD ? matchD[1] : (matchId ? matchId[1] : "");
    }

    if (!targetFileId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Valid Google Drive fileId or URL is required" })
      };
    }

    const downloadUrls = [
      `https://drive.usercontent.google.com/download?id=${targetFileId}&export=download&confirm=t`,
      `https://drive.google.com/uc?export=download&id=${targetFileId}&confirm=t`,
      `https://docs.google.com/uc?export=download&id=${targetFileId}`
    ];

    let streamRes: any = null;
    for (const dUrl of downloadUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
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
        // Try next
      }
    }

    if (!streamRes) {
      return {
        statusCode: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Could not establish direct download stream from Drive" })
      };
    }

    const safeName = String(title).replace(/[^a-zA-Z0-9_-]+/g, "_");
    const arrayBuffer = await streamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`
      },
      body: buffer.toString("base64")
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to download Drive PDF", message: error.message })
    };
  }
};
