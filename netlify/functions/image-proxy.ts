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
    const imageUrl = params.url as string;

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
        body: "URL parameter is required"
      };
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
    const timeout = setTimeout(() => controller.abort(), 9500);
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
        body: `Failed to fetch image from source: ${response.status}`
      };
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400"
      },
      body: buffer.toString("base64")
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
      body: `Failed to proxy image: ${error.message}`
    };
  }
};
