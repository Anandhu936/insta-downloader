"use client";

import { useState, useCallback } from "react";
import { Download, Play, Image, Film, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { MediaItem } from "@/app/api/download/route";

interface DownloadCardProps {
  item: MediaItem;
  index: number;
  total: number;
}

async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}&download=true`);
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

export default function DownloadCard({ item, index, total }: DownloadCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [imgError, setImgError] = useState(false);

  const label = total > 1 ? `Media ${index + 1} of ${total}` : "Media";
  const ext = item.type === "video" ? "mp4" : "jpg";
  const filename = `instaget_${Date.now()}_${index + 1}.${ext}`;

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadFile(item.url, filename);
      setDownloaded(true);
      toast.success(
        `${item.type === "video" ? "Video" : "Image"} downloaded successfully!`
      );
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error(err);
      // Fallback: open in new tab
      window.open(item.url, "_blank", "noopener,noreferrer");
      toast.success("Opened in new tab — right-click to save!");
    } finally {
      setDownloading(false);
    }
  }, [item.url, filename, item.type]);

  return (
    <div
      className="glass-card rounded-2xl overflow-hidden slide-up group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Media Preview */}
      <div className="relative w-full aspect-square bg-black/30 overflow-hidden">
        {item.type === "video" ? (
          <div className="relative w-full h-full">
            {!imgError ? (
              <video
                src={useProxy ? `/api/proxy?url=${encodeURIComponent(item.url)}` : item.url}
                className="w-full h-full object-contain"
                controls
                preload="metadata"
                playsInline
                onError={() => {
                  if (!useProxy) setUseProxy(true);
                  else setImgError(true);
                }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
                <Film className="w-12 h-12 text-sky-400" />
                <span className="text-sm text-gray-400">Video preview unavailable</span>
              </div>
            )}
            {/* Video badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-xs font-medium text-white border border-white/10">
              <Play className="w-3 h-3 fill-white" />
              Video
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {!imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={useProxy ? `/api/proxy?url=${encodeURIComponent(item.url)}` : item.url}
                alt={`Instagram media ${index + 1}`}
                className="w-full h-full object-contain"
                onError={() => {
                  if (!useProxy) setUseProxy(true);
                  else setImgError(true);
                }}
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-sky-900/20 to-violet-900/20">
                <Image className="w-12 h-12 text-violet-400" />
                <span className="text-sm text-gray-400">Image preview unavailable</span>
              </div>
            )}
            {/* Image badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-xs font-medium text-white border border-white/10">
              <Image className="w-3 h-3" />
              Photo
            </div>
          </div>
        )}

        {/* Count badge */}
        {total > 1 && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-xs font-medium text-gray-300 border border-white/10">
            {index + 1}/{total}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{item.type} file</p>
        </div>

        <button
          id={`download-item-${index}`}
          onClick={handleDownload}
          disabled={downloading}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white
            transition-all duration-200 shadow-lg
            ${downloaded
              ? "bg-green-500/20 border border-green-500/40 text-green-400"
              : "ig-button"
            }
          `}
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 spinner" />
              <span>Saving...</span>
            </>
          ) : downloaded ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
