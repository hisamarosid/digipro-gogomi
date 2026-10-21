import React from 'react';
import {
  Palette,
  Bot,
  Code,
  Film,
  Share2,
  Sparkles,
  Layers,
  Tv,
  Music,
  Globe,
  Users,
  Smartphone,
  Video,
  Cpu,
  Zap,
  ShieldCheck,
  CheckSquare,
  GraduationCap,
  Flame,
  FolderTree,
  Terminal,
  Server,
  Key,
  Database,
  Cloud,
  Headphones,
  Laptop,
} from 'lucide-react';

interface CategoryIconProps {
  name?: string | null;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  palette: Palette,
  bot: Bot,
  code: Code,
  film: Film,
  share2: Share2,
  share: Share2,
  sparkles: Sparkles,
  layers: Layers,
  tv: Tv,
  music: Music,
  globe: Globe,
  users: Users,
  smartphone: Smartphone,
  video: Video,
  cpu: Cpu,
  zap: Zap,
  shieldcheck: ShieldCheck,
  shield: ShieldCheck,
  checksquare: CheckSquare,
  graduationcap: GraduationCap,
  flame: Flame,
  foldertree: FolderTree,
  terminal: Terminal,
  server: Server,
  key: Key,
  database: Database,
  cloud: Cloud,
  headphones: Headphones,
  laptop: Laptop,
};

export function CategoryIcon({
  name,
  className = 'h-5 w-5',
  fallbackIcon,
}: CategoryIconProps) {
  if (!name || !name.trim()) {
    return fallbackIcon ? <>{fallbackIcon}</> : <Layers className={className} />;
  }

  const normalized = name.trim().toLowerCase().replace(/[-_]/g, '');

  // Check if standard Lucide component matches
  const IconComponent = ICON_MAP[normalized];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // If name is an emoji or custom string symbol (e.g. 🎨, 🤖)
  if (/\p{Emoji}/u.test(name)) {
    return <span className="text-xl leading-none">{name}</span>;
  }

  // Default fallback
  return fallbackIcon ? <>{fallbackIcon}</> : <Sparkles className={className} />;
}
