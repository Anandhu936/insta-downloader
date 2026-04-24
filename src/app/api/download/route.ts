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
    return (
      parsed.hostname === "www.instagram.com" ||
      parsed.hostname === "instagram.com"
    );
  } catch {
    return false;
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

    // Use instagram-url-direct to extract media URLs
    const result = await instagramGetUrl(url);

    if (
      !result ||
      !result.url_list ||
      result.url_list.length === 0
    ) {
      console.error("[API] No media found for URL:", url, result);
      return NextResponse.json(
        {
          error:
            "Could not fetch media. The post might be private, deleted, or Instagram is blocking the request. Try again in a few minutes.",
        },
        { status: 404 }
      );
    }

    const mediaItems: MediaItem[] = result.url_list.map((mediaUrl: string) => {
      // Detect if it's a video based on URL patterns or content
      const isVideo =
        mediaUrl.includes(".mp4") ||
        mediaUrl.includes("video") ||
        mediaUrl.includes("vid_") ||
        mediaUrl.toLowerCase().includes("mime=video");
      return {
        url: mediaUrl,
        type: isVideo ? "video" : "image",
      };
    });

    console.log(`[API] Success: Found ${mediaItems.length} items.`);

    const response: DownloadResult = {
      mediaItems,
      postUrl: url,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("[API] Fatal error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message.includes("403") || message.includes("429")) {
      return NextResponse.json(
        { error: "Instagram is temporarily blocking requests. Please try again later." },
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
