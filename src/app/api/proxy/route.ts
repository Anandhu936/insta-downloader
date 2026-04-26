import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const decoded = url;

    // Only allow Instagram CDN domains
    const allowed = [
      "cdninstagram.com",
      "instagram.com",
      "scontent",
      "fbcdn.net",
      "fbcdninstagram.com",
    ];
    const isAllowed = allowed.some((domain) => decoded.includes(domain));

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Unauthorized domain" },
        { status: 403 }
      );
    }

    const response = await fetch(decoded, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.instagram.com/",
        Origin: "https://www.instagram.com",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    
    // If we get HTML instead of media, it means Instagram is blocking the proxy
    if (contentType.includes("text/html") && !decoded.includes(".html")) {
      return NextResponse.json(
        { error: "Instagram is blocking the server request. Try downloading directly by right-clicking the preview." },
        { status: 403 }
      );
    }

    const download = searchParams.get("download") === "true";
    
    // Use the response body directly as a stream for better reliability
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": download ? "attachment" : "inline",
        "Cache-Control": download ? "no-store" : "public, max-age=86400",
        "Content-Length": response.headers.get("content-length") || "",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy the file" },
      { status: 500 }
    );
  }
}
