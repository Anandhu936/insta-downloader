import { Camera, Heart } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-10 px-6 mt-20">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl ig-gradient flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg">
            <span className="ig-gradient-text">Insta</span>
            <span className="text-white">Get</span>
          </span>
        </Link>

        <p className="text-sm text-gray-600 text-center max-w-md">
          Download Instagram videos, reels, and stories instantly. Only works
          with public accounts. We do not store any media or personal data.
        </p>

        <div className="flex items-center gap-4 text-xs text-gray-700">
          <span>© {new Date().getFullYear()} InstaGet</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for creators
          </span>
        </div>

        <p className="text-xs text-gray-800 text-center max-w-lg">
          Disclaimer: This tool is not affiliated with Instagram or Meta.
          Use responsibly and respect copyright. Only download content you
          have the right to save.
        </p>
      </div>
    </footer>
  );
}
