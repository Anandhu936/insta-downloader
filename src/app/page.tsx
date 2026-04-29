"use client";

import { useState, useCallback } from "react";
import {
  Film,
  ImageIcon,
  Layers,
  Zap,
  Shield,
  Download,
  AlertCircle,
  RefreshCcw,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UrlInput from "@/components/UrlInput";
import DownloadCard from "@/components/DownloadCard";
import FeatureCard from "@/components/FeatureCard";
import { DownloadResult } from "@/app/api/download/route";

const EXAMPLE_STEPS = [
  {
    step: "1",
    title: "Copy the URL",
    desc: "Open Instagram and copy the link of any public post, reel, or story.",
  },
  {
    step: "2",
    title: "Paste & Download",
    desc: "Paste the URL into the box above and click Download.",
  },
  {
    step: "3",
    title: "Save to Device",
    desc: "Preview your media and hit the Download button to save it.",
  },
];

const FEATURES = [
  {
    icon: Film,
    title: "Reels & Videos",
    description:
      "Download Instagram Reels and videos in full HD quality, instantly.",
    gradient: "bg-gradient-to-br from-sky-600 to-violet-600",
  },
  {
    icon: ImageIcon,
    title: "Photos & Carousels",
    description:
      "Save single photos or all images from carousel posts in one click.",
    gradient: "bg-gradient-to-br from-violet-600 to-fuchsia-500",
  },
  {
    icon: Layers,
    title: "Multiple Media",
    description:
      "Automatically detects all media in a post — download all at once.",
    gradient: "bg-gradient-to-br from-fuchsia-500 to-rose-500",
  },
  {
    icon: Zap,
    title: "Blazing Fast",
    description:
      "Powered by Next.js edge functions. No delays, no waiting queues.",
    gradient: "bg-gradient-to-br from-yellow-500 to-green-500",
  },
  {
    icon: Shield,
    title: "No Login Required",
    description:
      "Works for all public accounts with zero sign-up or account linking.",
    gradient: "bg-gradient-to-br from-green-500 to-teal-500",
  },
  {
    icon: Download,
    title: "Free Forever",
    description:
      "100% free to use. No watermarks, no ads, no hidden charges.",
    gradient: "bg-gradient-to-br from-teal-500 to-blue-500",
  },
];

export default function HomePage() {
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = data.error || "Failed to fetch media.";
        if (data.suggestion) msg += ` ${data.suggestion}`;
        throw new Error(msg);
      }

      const downloadResult = data as DownloadResult;

      if (!downloadResult.mediaItems || downloadResult.mediaItems.length === 0) {
        throw new Error("No media found in this post.");
      }

      setResult(downloadResult);
      toast.success(
        `Found ${downloadResult.mediaItems.length} media item${downloadResult.mediaItems.length > 1 ? "s" : ""}!`
      );

      // Scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background glow orbs */}
      <div
        className="glow-orb fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-15 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, #833ab4 0%, transparent 70%)",
        }}
      />
      <div
        className="glow-orb-2 fixed bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full opacity-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, #fd1d1d 0%, transparent 70%)",
        }}
      />
      <div
        className="glow-orb fixed top-[40%] right-[20%] w-[400px] h-[400px] rounded-full opacity-8 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, #fcb045 0%, transparent 70%)",
          animationDelay: "3s",
        }}
      />

      <Navbar />

      <main className="relative z-10 pt-28 pb-10 px-4">
        {/* ── HERO ── */}
        <section className="max-w-4xl mx-auto text-center mb-16 fade-in">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-sky-500/20 text-sm text-sky-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-sky-400 pulse-ring" />
            Free Instagram Downloader — No Login Needed
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Download{" "}
            <span className="ig-gradient-text">Instagram</span>
            <br />
            Videos & Stories
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Save any public Instagram reel, video, or photo to your device. 
            Paste a link to a <span className="text-white font-medium">specific post</span> to get started.
          </p>

          {/* Input */}
          <UrlInput onFetch={handleFetch} isLoading={isLoading} />
        </section>

        {/* ── RESULTS ── */}
        {(result || error || isLoading) && (
          <section
            id="results"
            className="max-w-5xl mx-auto mb-20 fade-in"
          >
            {/* Loading skeleton */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="glass-card rounded-2xl overflow-hidden"
                  >
                    <div className="shimmer aspect-square w-full" />
                    <div className="p-4 flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="shimmer h-4 w-20 rounded" />
                        <div className="shimmer h-3 w-14 rounded" />
                      </div>
                      <div className="shimmer h-10 w-28 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="glass-card rounded-2xl p-8 text-center border border-rose-500/20">
                <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-7 h-7 text-rose-400" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">
                  Could not fetch media
                </h3>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                  {error}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-sky-400" />
                    Make sure the account is public
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-sky-400" />
                    Check that the URL is correct
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Results grid */}
            {result && !isLoading && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {result.mediaItems.length === 1
                      ? "1 item ready to download"
                      : `${result.mediaItems.length} items ready to download`}
                  </h2>
                  <a
                    href={result.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1"
                  >
                    View original
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.mediaItems.map((item, i) => (
                    <DownloadCard
                      key={i}
                      item={item}
                      index={i}
                      total={result.mediaItems.length}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── HOW IT WORKS ── */}
        <section className="max-w-4xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              How it works
            </h2>
            <p className="text-gray-500 text-base">
              Download any Instagram media in 3 simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {EXAMPLE_STEPS.map(({ step, title, desc }) => (
              <div
                key={step}
                className="glass-card rounded-2xl p-6 text-center relative group hover:bg-white/[0.06] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl ig-gradient flex items-center justify-center mx-auto mb-4 text-white font-black text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                  {step}
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="max-w-5xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Everything you need
            </h2>
            <p className="text-gray-500 text-base">
              Powerful features, zero complexity
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-3xl mx-auto mb-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">
              Frequently asked
            </h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: "Is it free to use?",
                a: "Yes, InstaGet is completely free. No sign-up, no subscription, no watermarks.",
              },
              {
                q: "Can I download private account content?",
                a: "No. InstaGet only works with public accounts. Private content requires authentication and cannot be accessed.",
              },
              {
                q: "What types of content can I download?",
                a: "You can download public posts (photos & videos), reels, carousel posts, and stories. Note: Downloading entire profiles or profile pictures is not currently supported — please use a link to a specific post.",
              },
              {
                q: "Is this safe and legal?",
                a: "InstaGet does not store any content or data. Downloading public content for personal use is generally acceptable, but always respect the creator's rights and Instagram's Terms of Service.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="glass-card rounded-xl group cursor-pointer"
              >
                <summary className="flex items-center justify-between p-5 font-medium text-white list-none">
                  <span>{q}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform duration-200 flex-shrink-0 ml-4" />
                </summary>
                <p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
