import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
}: FeatureCardProps) {
  return (
    <div className="glass-card rounded-2xl p-6 hover:bg-white/[0.06] transition-all duration-300 group">
      <div
        className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
      >
        <Icon className="w-5 h-5 text-white" strokeWidth={2} />
      </div>
      <h3 className="font-semibold text-white text-base mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
