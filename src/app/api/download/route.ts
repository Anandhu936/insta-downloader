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
    return (
      host === "www.instagram.com" ||
      host === "instagram.com" ||
      host === "instagr.am" ||
      host === "www.instagr.am"
    );
  } catch {
    return false;
  }
}

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function tryFetch(url: string, retries = 2): Promise<any> {
  let lastError: any;
  
  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) {
        console.log(`[API] Retry ${i} for URL: ${url}`);
        await delay(1000 * i); // Exponential backoff
      }
      
      const result = await instagramGetUrl(url);
      
      // If we got mediaItems, we're good
      if (result && (result.media_details?.length > 0 || result.url_list?.length > 0)) {
        return result;
      }
      
      // If we got a result but no media, it might be a block or empty response
      console.warn(`[API] Attempt ${i+1}: Result received but no media found.`, result);
      lastError = new Error("No media found in response");
    } catch (error) {
      console.error(`[API] Attempt ${i+1} failed:`, error);
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * Fallback fetch using manual scraping if the library fails
 * This is a simplified version and might not catch all cases
 */
async function fallbackFetch(url: string): Promise<MediaItem[] | null> {
  try {
    console.log(`[API] Attempting fallback fetch for: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (!response.ok) return null;
    const html = await response.text();

    let mediaItems: MediaItem[] = [];

    const isReel = url.includes("/reel/") || url.includes("/reels/");

    // Try to find JSON data structures that contain all media (including carousels)
    const jsonMatches = [
      ...html.matchAll(/"display_url":"([^"]*)"/g),
      ...html.matchAll(/"video_url":"([^"]*)"/g)
    ];

    if (jsonMatches.length > 0) {
      const uniqueUrls = new Set<string>();
      jsonMatches.forEach(match => {
        const url = match[1].replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
        if (!uniqueUrls.has(url)) {
          uniqueUrls.add(url);
          const isVideo = url.includes(".mp4") || url.includes("video") || url.includes("mime=video");
          
          // Only add if we don't have it yet, or if it's a video (preferring videos)
          mediaItems.push({ url, type: isVideo ? "video" : "image" });
        }
      });
    }

    // Heuristic for carousels: Instagram often lists many display_resources
    // We should filter to keep only the highest resolution ones
    if (mediaItems.length > 1) {
      // Filter out duplicates and keep unique URLs
      const seen = new Set();
      mediaItems = mediaItems.filter(item => {
        const k = item.url.split('?')[0]; // Use base URL as key
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }

    // 1. Check og:video tags (if not found in JSON)
    if (mediaItems.length === 0) {
      const videoMetaMatch = 
        html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]*)"/i) ||
        html.match(/<meta[^>]*property="og:video:secure_url"[^>]*content="([^"]*)"/i);
      
      if (videoMetaMatch && videoMetaMatch[1]) {
        mediaItems.push({
          url: videoMetaMatch[1].replace(/\\u0026/g, "&").replace(/&amp;/g, "&"),
          type: "video",
        });
      }
    }

    // 2. Check og:image tags (if not found in JSON)
    if (mediaItems.length === 0) {
      const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i);
      if (imageMatch && imageMatch[1]) {
        const imageUrl = imageMatch[1].replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
        const isVideo = imageUrl.includes(".mp4") || imageUrl.includes("video") || isReel;
        mediaItems.push({
          url: imageUrl,
          type: isVideo ? "video" : "image",
        });
      }
    }
    
    return mediaItems.length > 0 ? mediaItems : null;
  } catch (error) {
    console.error("[API] Fallback fetch error:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { url } = body as { url: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required." },
        { status: 400 }
      );
    }

    url = url.trim();

    // Normalize URL: remove query params and ensure it's a valid format
    try {
      const urlObj = new URL(url);
      urlObj.search = ""; // Clear query params like ?igsh=...
      url = urlObj.toString();
      
      // Ensure it ends with / for consistency
      if (!url.endsWith("/")) {
        url += "/";
      }

      // Some scrapers prefer /reel/ over /reels/
      if (url.includes("/reels/")) {
        url = url.replace("/reels/", "/reel/");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format." },
        { status: 400 }
      );
    }

    if (!isValidInstagramUrl(url)) {
      return NextResponse.json(
        { error: "Please enter a valid Instagram URL." },
        { status: 400 }
      );
    }

    console.log(`[API] Fetching: ${url}`);

    let mediaItems: MediaItem[] = [];
    let result: any;

    try {
      // Use retry logic for better reliability on Vercel
      result = await tryFetch(url);

      const isReel = url.includes("/reel/") || url.includes("/reels/");

      if (result && result.media_details && result.media_details.length > 0) {
        mediaItems = result.media_details.map((detail: any) => {
          const detailType = String(detail.type).toLowerCase();
          const mediaUrl = detail.url.toLowerCase();
          const isImage = mediaUrl.includes(".jpg") || mediaUrl.includes(".jpeg") || mediaUrl.includes(".png") || mediaUrl.includes(".webp");
          const isVideo = !isImage && (
            detailType === "video" || 
            mediaUrl.includes(".mp4") || 
            mediaUrl.includes("video") || 
            mediaUrl.includes("_v") ||
            mediaUrl.includes("mime=video") ||
            (isReel && result.media_details.length === 1)
          );

          return {
            url: detail.url,
            type: isVideo ? "video" : "image",
          };
        });
      } else if (result && result.url_list && result.url_list.length > 0) {
        mediaItems = result.url_list.map((mediaUrl: string) => {
          const lowerUrl = mediaUrl.toLowerCase();
          const isImage = lowerUrl.includes(".jpg") || lowerUrl.includes(".jpeg") || lowerUrl.includes(".png") || lowerUrl.includes(".webp");
          const isVideo = !isImage && (
            lowerUrl.includes(".mp4") ||
            lowerUrl.includes("video") ||
            lowerUrl.includes("vid_") ||
            lowerUrl.includes("_v") ||
            lowerUrl.includes("mime=video") ||
            (isReel && result.url_list.length === 1)
          );
            
          return {
            url: mediaUrl,
            type: isVideo ? "video" : "image",
          };
        });
      }
    } catch (error) {
      console.warn("[API] Primary fetch failed, trying fallback...", error);
    }

    // If primary failed or returned nothing, try fallback
    if (mediaItems.length === 0) {
      const fallbackResult = await fallbackFetch(url);
      if (fallbackResult) {
        mediaItems = fallbackResult;
        console.log(`[API] Fallback success: Found ${mediaItems.length} items.`);
      }
    }

    if (mediaItems.length === 0) {
      console.error("[API] No media found for URL after retries and fallback:", url);
      return NextResponse.json(
        {
          error:
            "Instagram is currently blocking this request. This often happens on cloud hosting like Vercel. Please try again in a few minutes or try a different link.",
        },
        { status: 404 }
      );
    }

    console.log(`[API] Final Success: Found ${mediaItems.length} items.`);

    const response: DownloadResult = {
      mediaItems,
      postUrl: url,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("[API] Fatal error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message.includes("403") || message.includes("429") || message.includes("No media found")) {
      return NextResponse.json(
        { error: "Instagram is temporarily blocking requests (Rate Limited). This is common on Vercel. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to connect to Instagram. Please make sure the post is public and try again.",
      },
      { status: 500 }
    );
  }
}
