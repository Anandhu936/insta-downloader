import { Camera, Zap } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass-card border-b border-white/5">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="relative">
          <div className="w-8 h-8 rounded-xl ig-gradient flex items-center justify-center shadow-lg group-hover:shadow-sky-500/30 transition-shadow">
            <Camera className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <span className="font-bold text-lg tracking-tight">
          <span className="ig-gradient-text">Insta</span>
          <span className="text-white">Get</span>
        </span>
      </Link>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Zap className="w-3.5 h-3.5 text-yellow-500" />
        <span>Free · Fast · No Login</span>
      </div>
    </nav>
  );
}
