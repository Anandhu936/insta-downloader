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
      "www.instagr.am"
    ];
    
    if (!validHosts.includes(host)) return false;

    // Check if it's a post, reel, tv, or story
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
    const path = parsed.pathname.split('/').filter(Boolean);
    // Profile URL is usually just domain.com/username/
    return path.length === 1 && !["p", "reel", "reels", "tv", "stories", "explore", "reels"].includes(path[0]);
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
 * This is a sophisticated version that tries multiple endpoints
 */
async function fallbackFetch(url: string): Promise<MediaItem[] | null> {
  const tryEndpoints = [
    url, // Main URL
    url.endsWith("/") ? `${url}embed/` : `${url}/embed/`, // Embed URL (often less protected)
    url.endsWith("/") ? `${url}?__a=1&__d=dis` : `${url}/?__a=1&__d=dis`, // JSON endpoint (highly rate-limited)
  ];

  for (const endpoint of tryEndpoints) {
    try {
      console.log(`[API] Trying endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,video/mp4,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.instagram.com/",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "cross-site",
        },
      });

      if (!response.ok) {
        console.warn(`[API] Endpoint ${endpoint} returned status ${response.status}`);
        continue;
      }

      const html = await response.text();
      const mediaItems: MediaItem[] = [];
      const isReel = url.includes("/reel/") || url.includes("/reels/");

      // 1. Try to find JSON-like data structures for videos
      const videoMatches = [
        ...html.matchAll(/"video_url":"([^"]*)"/g),
        ...html.matchAll(/"video_src":"([^"]*)"/g),
        ...html.matchAll(/video_url:\s*'([^']*)'/g),
        ...html.matchAll(/video_url:\s*"([^"]*)"/g),
        ...html.matchAll(/"video_url"\s*:\s*"([^"]+)"/g),
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

      // 2. Try to find images (if we haven't found everything or for carousels)
      const imageMatches = [
        ...html.matchAll(/"display_url":"([^"]*)"/g),
        ...html.matchAll(/"display_src":"([^"]*)"/g),
        ...html.matchAll(/display_url:\s*'([^']*)'/g),
      ];

      if (imageMatches.length > 0) {
        const seenUrls = new Set<string>();
        for (const match of imageMatches) {
          let imageUrl = match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
          // Check if this is a video URL being mislabeled or just a high-res image
          const isActuallyVideo = imageUrl.includes(".mp4") || imageUrl.includes("video") || imageUrl.includes("mime=video");
          
          if (imageUrl.startsWith("http") && !seenUrls.has(imageUrl)) {
            seenUrls.add(imageUrl);
            // If we already have videos, only add if it's a high-res image we don't have
            if (isActuallyVideo) {
              mediaItems.push({ url: imageUrl, type: "video" });
            } else if (mediaItems.length === 0 || !isReel) {
              mediaItems.push({ url: imageUrl, type: "image" });
            }
          }
        }
      }

      // 3. Check Meta Tags (last resort for this endpoint)
      if (mediaItems.length === 0) {
        const ogVideo = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]*)"/i) ||
                        html.match(/<meta[^>]*property="og:video:secure_url"[^>]*content="([^"]*)"/i) ||
                        html.match(/"video_url":"([^"]*)"/);
        
        if (ogVideo && ogVideo[1]) {
          mediaItems.push({
            url: ogVideo[1].replace(/\\u0026/g, "&").replace(/\\/g, ""),
            type: "video"
          });
        }

        const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i);
        if (ogImage && ogImage[1] && mediaItems.length === 0) {
          mediaItems.push({
            url: ogImage[1].replace(/\\u0026/g, "&").replace(/\\/g, ""),
            type: isReel ? "video" : "image" // For reels, og:image is often all we get if blocked
          });
        }
      }

      if (mediaItems.length > 0) {
        // Clean and filter duplicates
        const unique = new Map<string, MediaItem>();
        mediaItems.forEach(item => {
          try {
            const baseUrl = new URL(item.url).pathname;
            // Prefer videos over images for the same path
            if (!unique.has(baseUrl) || item.type === "video") {
              unique.set(baseUrl, item);
            }
          } catch {
            unique.set(item.url, item);
          }
        });

        const finalItems = Array.from(unique.values());
        
        // If it's a reel, make sure we return at least one video if found
        if (isReel && !finalItems.some(i => i.type === "video")) {
          // If we found something that looks like an image but it's a reel, label it carefully
          // but we already handled that in the meta tag section
        }

        if (finalItems.length > 0) return finalItems;
      }
    } catch (error) {
      console.warn(`[API] Failed to scrape endpoint ${endpoint}:`, error);
    }
  }

  return null;
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

    if (isProfileUrl(url)) {
      return NextResponse.json(
        { 
          error: "You entered a profile link. Please enter a link to a specific Post, Reel, or Story.",
          suggestion: "Example: https://www.instagram.com/p/C-abc123XYZ/"
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

    // Secondary fallback: Try removing query params and trailing slashes if still nothing
    if (mediaItems.length === 0) {
      const cleanUrl = url.replace(/\/$/, "");
      if (cleanUrl !== url) {
        const secondFallback = await fallbackFetch(cleanUrl);
        if (secondFallback) {
          mediaItems = secondFallback;
        }
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
