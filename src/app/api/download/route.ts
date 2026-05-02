import { NextRequest, NextResponse } from "next/server";
import { instagramGetUrl } from "instagram-url-direct";

export interface MediaItem {
  url: string;
  type: "video" | "image";
}

export interface DownloadResult {
  mediaItems: MediaItem[];
  postUrl: string;
}

function isValidInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const validHosts = [
      "www.instagram.com",
      "instagram.com",
      "instagr.am",
      "www.instagr.am",
    ];

    if (!validHosts.includes(host)) return false;

    const path = parsed.pathname;
    return (
      path.startsWith("/p/") ||
      path.startsWith("/reel/") ||
      path.startsWith("/reels/") ||
      path.startsWith("/tv/") ||
      path.startsWith("/stories/")
    );
  } catch {
    return false;
  }
}

function isProfileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.split("/").filter(Boolean);
    return (
      path.length === 1 &&
      !["p", "reel", "reels", "tv", "stories", "explore"].includes(path[0])
    );
  } catch {
    return false;
  }
}

// ─── RapidAPI Primary Method ───────────────────────────────────────────────
// Uses instagram120.p.rapidapi.com which routes through residential proxies
// and works reliably from Vercel / cloud hosting.
async function fetchViaRapidAPI(url: string): Promise<MediaItem[] | null> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey === "your_rapidapi_key_here") {
    console.warn("[RapidAPI] No RAPIDAPI_KEY set, skipping.");
    return null;
  }

  try {
    console.log("[RapidAPI] Fetching:", url);
    const response = await fetch("https://instagram120.p.rapidapi.com/api/instagram/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "instagram120.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.warn("[RapidAPI] Response not OK:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("[RapidAPI] Raw response:", JSON.stringify(data).slice(0, 500));

    // Response is an array of media items, each with a `urls` array
    if (!Array.isArray(data) || data.length === 0) return null;

    const mediaItems: MediaItem[] = [];
    const isReel = url.includes("/reel/") || url.includes("/reels/");

    for (const item of data) {
      if (!item.urls || !Array.isArray(item.urls)) continue;

      for (const u of item.urls) {
        if (!u.url) continue;

        // Some URLs are relative paths — prefix them
        const fullUrl = u.url.startsWith("/")
          ? `https://instagram120.p.rapidapi.com${u.url}`
          : u.url;

        const ext = (u.extension || "").toLowerCase();
        const name = (u.name || "").toLowerCase();

        const isVideo =
          ext === "mp4" ||
          name === "mp4" ||
          fullUrl.includes(".mp4") ||
          fullUrl.includes("video");

        mediaItems.push({
          url: fullUrl,
          type: isVideo ? "video" : "image",
        });
      }
    }

    // For reels, prefer MP4 entries; filter out duplicates by URL
    const seen = new Set<string>();
    const unique = mediaItems.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    // Prioritize: if reel and we have both video + image, keep video only
    if (isReel) {
      const videos = unique.filter((i) => i.type === "video");
      if (videos.length > 0) return videos;
    }

    return unique.length > 0 ? unique : null;
  } catch (error) {
    console.error("[RapidAPI] Fetch error:", error);
    return null;
  }
}

// ─── Legacy Library Method ─────────────────────────────────────────────────
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function tryFetch(url: string, retries = 2): Promise<any> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) {
        console.log(`[Legacy] Retry ${i} for URL: ${url}`);
        await delay(1000 * i);
      }
      const result = await instagramGetUrl(url);
      if (result && (result.media_details?.length > 0 || result.url_list?.length > 0)) {
        return result;
      }
      console.warn(`[Legacy] Attempt ${i + 1}: No media in response.`, result);
      lastError = new Error("No media found in response");
    } catch (error) {
      console.error(`[Legacy] Attempt ${i + 1} failed:`, error);
      lastError = error;
    }
  }
  throw lastError;
}

async function fallbackFetch(url: string): Promise<MediaItem[] | null> {
  const tryEndpoints = [
    url,
    url.endsWith("/") ? `${url}embed/` : `${url}/embed/`,
    url.endsWith("/") ? `${url}?__a=1&__d=dis` : `${url}/?__a=1&__d=dis`,
  ];

  for (const endpoint of tryEndpoints) {
    try {
      console.log(`[Fallback] Trying endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,video/mp4,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.instagram.com/",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "cross-site",
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const mediaItems: MediaItem[] = [];
      const isReel = url.includes("/reel/") || url.includes("/reels/");

      const videoMatches = [
        ...html.matchAll(/"video_url":"([^"]*)"/g),
        ...html.matchAll(/"video_src":"([^"]*)"/g),
        ...html.matchAll(/video_url:\s*'([^']*)'/g),
        ...html.matchAll(/video_url:\s*"([^"]*)"/g),
      ];

      if (videoMatches.length > 0) {
        const seenUrls = new Set<string>();
        for (const match of videoMatches) {
          let videoUrl = match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
          if (videoUrl.startsWith("http") && !seenUrls.has(videoUrl)) {
            seenUrls.add(videoUrl);
            mediaItems.push({ url: videoUrl, type: "video" });
          }
        }
      }

      const imageMatches = [
        ...html.matchAll(/"display_url":"([^"]*)"/g),
        ...html.matchAll(/"display_src":"([^"]*)"/g),
      ];

      if (imageMatches.length > 0) {
        const seenUrls = new Set<string>();
        for (const match of imageMatches) {
          let imageUrl = match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
          const isActuallyVideo =
            imageUrl.includes(".mp4") ||
            imageUrl.includes("video") ||
            imageUrl.includes("mime=video");
          if (imageUrl.startsWith("http") && !seenUrls.has(imageUrl)) {
            seenUrls.add(imageUrl);
            if (isActuallyVideo) {
              mediaItems.push({ url: imageUrl, type: "video" });
            } else if (mediaItems.length === 0 || !isReel) {
              mediaItems.push({ url: imageUrl, type: "image" });
            }
          }
        }
      }

      if (mediaItems.length === 0) {
        const ogVideo =
          html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]*)"/i) ||
          html.match(/<meta[^>]*property="og:video:secure_url"[^>]*content="([^"]*)"/i) ||
          html.match(/"video_url":"([^"]*)"/);

        if (ogVideo?.[1]) {
          mediaItems.push({
            url: ogVideo[1].replace(/\\u0026/g, "&").replace(/\\/g, ""),
            type: "video",
          });
        }

        const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i);
        if (ogImage?.[1] && mediaItems.length === 0) {
          mediaItems.push({
            url: ogImage[1].replace(/\\u0026/g, "&").replace(/\\/g, ""),
            type: isReel ? "video" : "image",
          });
        }
      }

      if (mediaItems.length > 0) {
        const unique = new Map<string, MediaItem>();
        mediaItems.forEach((item) => {
          try {
            const baseUrl = new URL(item.url).pathname;
            if (!unique.has(baseUrl) || item.type === "video") {
              unique.set(baseUrl, item);
            }
          } catch {
            unique.set(item.url, item);
          }
        });
        const finalItems = Array.from(unique.values());
        if (finalItems.length > 0) return finalItems;
      }
    } catch (error) {
      console.warn(`[Fallback] Failed for endpoint ${endpoint}:`, error);
    }
  }

  return null;
}

// ─── Main Handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { url } = body as { url: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    url = url.trim();

    // Normalize URL: strip query params for cleaner requests
    try {
      const urlObj = new URL(url);
      urlObj.search = "";
      url = urlObj.toString();
      if (!url.endsWith("/")) url += "/";
      if (url.includes("/reels/")) url = url.replace("/reels/", "/reel/");
    } catch {
      return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
    }

    if (isProfileUrl(url)) {
      return NextResponse.json(
        {
          error:
            "You entered a profile link. Please enter a link to a specific Post, Reel, or Story.",
          suggestion: "Example: https://www.instagram.com/p/C-abc123XYZ/",
        },
        { status: 400 }
      );
    }

    if (!isValidInstagramUrl(url)) {
      return NextResponse.json(
        { error: "Please enter a valid Instagram Post or Reel URL." },
        { status: 400 }
      );
    }

    console.log(`[API] Processing: ${url}`);

    let mediaItems: MediaItem[] = [];

    // ── Step 1: Try RapidAPI (works on Vercel) ────────────────────────────
    const rapidResult = await fetchViaRapidAPI(url);
    if (rapidResult && rapidResult.length > 0) {
      mediaItems = rapidResult;
      console.log(`[API] RapidAPI success: ${mediaItems.length} item(s).`);
    }

    // ── Step 2: Try legacy instagram-url-direct library ───────────────────
    if (mediaItems.length === 0) {
      try {
        const result = await tryFetch(url);
        const isReel = url.includes("/reel/") || url.includes("/reels/");

        if (result?.media_details?.length > 0) {
          mediaItems = result.media_details.map((detail: any) => {
            const mediaUrl = detail.url.toLowerCase();
            const isImage =
              mediaUrl.includes(".jpg") ||
              mediaUrl.includes(".jpeg") ||
              mediaUrl.includes(".png") ||
              mediaUrl.includes(".webp");
            const isVideo =
              !isImage &&
              (String(detail.type).toLowerCase() === "video" ||
                mediaUrl.includes(".mp4") ||
                mediaUrl.includes("video") ||
                (isReel && result.media_details.length === 1));
            return { url: detail.url, type: isVideo ? "video" : "image" };
          });
        } else if (result?.url_list?.length > 0) {
          mediaItems = result.url_list.map((mediaUrl: string) => {
            const lowerUrl = mediaUrl.toLowerCase();
            const isImage =
              lowerUrl.includes(".jpg") ||
              lowerUrl.includes(".jpeg") ||
              lowerUrl.includes(".png") ||
              lowerUrl.includes(".webp");
            const isVideo =
              !isImage &&
              (lowerUrl.includes(".mp4") ||
                lowerUrl.includes("video") ||
                (isReel && result.url_list.length === 1));
            return { url: mediaUrl, type: isVideo ? "video" : "image" };
          });
        }

        if (mediaItems.length > 0) {
          console.log(`[API] Legacy library success: ${mediaItems.length} item(s).`);
        }
      } catch (error) {
        console.warn("[API] Legacy library failed:", error);
      }
    }

    // ── Step 3: HTML scrape fallback ──────────────────────────────────────
    if (mediaItems.length === 0) {
      const fallbackResult = await fallbackFetch(url);
      if (fallbackResult) {
        mediaItems = fallbackResult;
        console.log(`[API] HTML fallback success: ${mediaItems.length} item(s).`);
      }
    }

    if (mediaItems.length === 0) {
      console.error("[API] All methods failed for:", url);
      return NextResponse.json(
        {
          error:
            "Could not fetch media from Instagram. Make sure the post is public, then try again.",
        },
        { status: 404 }
      );
    }

    console.log(`[API] Done: returning ${mediaItems.length} item(s).`);
    return NextResponse.json({ mediaItems, postUrl: url } as DownloadResult);
  } catch (error: unknown) {
    console.error("[API] Fatal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    if (
      message.includes("403") ||
      message.includes("429") ||
      message.includes("No media found")
    ) {
      return NextResponse.json(
        {
          error:
            "Instagram is temporarily blocking requests. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to connect to Instagram. Make sure the post is public and try again.",
      },
      { status: 500 }
    );
  }
}
