import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Sunset,
  Image as ImageIcon,
  ShieldCheck, 
  FileText, 
  FileArchive, 
  FolderArchive, 
  Minimize2, 
  ArrowLeftRight, 
  Stamp, 
  Binary, 
  Archive,
  User,
  ChevronDown,
  Flame,
  Braces,
  QrCode,
  Scan
} from 'lucide-react';
import { ToolId, AnimeTheme } from '../types';
import { playAnimeSparkleSound, playWindChimeSound } from '../utils/audioUtils';

interface HeaderProps {
  activeTool: ToolId | null;
  setActiveTool: (tool: ToolId | null) => void;
  theme: AnimeTheme;
  setTheme: (theme: AnimeTheme) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTool,
  setActiveTool,
  theme,
  setTheme,
  soundEnabled,
  setSoundEnabled,
}) => {
  const [bgMenuOpen, setBgMenuOpen] = useState(false);
  const bgMenuRef = useRef<HTMLDivElement>(null);

  const backgroundOptions: {
    id: AnimeTheme;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }[] = [
    {
      id: 'twilight',
      name: 'Twilight Sky',
      description: 'Anime clouds & twilight horizon',
      icon: Sparkles,
      accentColor: 'text-purple-400',
    },
    {
      id: 'sakura',
      name: 'Sakura Shrine',
      description: 'Cherry blossom petals & torii shrine',
      icon: Sun,
      accentColor: 'text-pink-400',
    },
    {
      id: 'sunset',
      name: 'Sunset Meadow',
      description: 'Golden hour hills & sunset clouds',
      icon: Sunset,
      accentColor: 'text-amber-400',
    },
    {
      id: 'cyber',
      name: 'Cyber City',
      description: 'Neon futuristic Tokyo night',
      icon: ImageIcon,
      accentColor: 'text-cyan-400',
    },
    {
      id: 'night',
      name: 'Celestial Nebula',
      description: 'Deep cosmic galaxy & shooting stars',
      icon: Moon,
      accentColor: 'text-indigo-400',
    },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bgMenuRef.current && !bgMenuRef.current.contains(event.target as Node)) {
        setBgMenuOpen(false);
      }
    };
    if (bgMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [bgMenuOpen]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      playWindChimeSound();
    }
  };

  const handleSelectTheme = (newTheme: AnimeTheme) => {
    setTheme(newTheme);
    setBgMenuOpen(false);
    if (soundEnabled) playAnimeSparkleSound();
  };

  const currentThemeMeta = backgroundOptions.find((b) => b.id === theme) || backgroundOptions[0];
  const CurrentIcon = currentThemeMeta.icon;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/75 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <button
          onClick={() => {
            setActiveTool(null);
            if (soundEnabled) playAnimeSparkleSound();
          }}
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 p-0.5 shadow-lg shadow-pink-500/20 group-hover:shadow-pink-500/40 transition">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Flame className="w-4 h-4 text-pink-400 group-hover:scale-110 transition duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-base tracking-tight text-white group-hover:text-pink-300 transition">
                IMGFORGE
              </span>
              <span className="text-[10px] font-mono text-pink-400 font-semibold px-1.5 py-0.2 rounded bg-pink-500/10 border border-pink-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
              Client-Side Image Forge
            </p>
          </div>
        </button>

        {/* Quick Nav Tools (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
          {[
            { id: 'files-to-zip' as ToolId, label: 'Files to ZIP', icon: Archive },
            { id: 'images-to-zip' as ToolId, label: 'Images to ZIP', icon: FileArchive },
            { id: 'images-to-pdf' as ToolId, label: 'Images to PDF', icon: FileText },
            { id: 'zip-extractor' as ToolId, label: 'ZIP Extractor', icon: FolderArchive },
            { id: 'reduce-size' as ToolId, label: 'Reduce Size', icon: Minimize2 },
            { id: 'format-converter' as ToolId, label: 'Convert Format', icon: ArrowLeftRight },
            { id: 'base64-studio' as ToolId, label: 'Base64 Studio', icon: Binary },
            { id: 'watermark' as ToolId, label: 'Watermark', icon: Stamp },
            { id: 'json-formatter' as ToolId, label: 'JSON Tool', icon: Braces },
            { id: 'qr-generator' as ToolId, label: 'QR Generator', icon: QrCode },
            { id: 'qr-scanner' as ToolId, label: 'QR Scanner', icon: Scan },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTool === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTool(item.id);
                  if (soundEnabled) playAnimeSparkleSound();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Controls & Theme */}
        <div className="flex items-center gap-2">
          {/* Developer Contact link */}
          <a
            href="#developer-contact-section"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-pink-300 hover:border-pink-500/40 transition cursor-pointer"
            title="Developer Information & Contact"
          >
            <User className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Developer</span>
          </a>

          {/* Privacy badge */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Private</span>
          </div>

          {/* Background Image / Theme Picker Dropdown */}
          <div className="relative" ref={bgMenuRef}>
            <button
              onClick={() => setBgMenuOpen(!bgMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-pink-300 hover:border-pink-500/30 transition shadow-sm cursor-pointer"
              title={`Active Background: ${currentThemeMeta.name} (Click to change background)`}
            >
              <CurrentIcon className={`w-4 h-4 ${currentThemeMeta.accentColor}`} />
              <span className="hidden xl:inline text-xs font-medium text-slate-200">
                {currentThemeMeta.name}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition duration-200 ${bgMenuOpen ? 'rotate-180 text-pink-400' : ''}`} />
            </button>

            {bgMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl z-50 animate-fadeIn">
                <div className="px-2.5 py-1.5 mb-1 border-b border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Select Background Image
                  </span>
                </div>
                <div className="space-y-1">
                  {backgroundOptions.map((opt) => {
                    const OptIcon = opt.icon;
                    const isSelected = opt.id === theme;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectTheme(opt.id)}
                        className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-pink-500/15 border border-pink-500/40 text-white'
                            : 'hover:bg-slate-800/60 border border-transparent text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 mt-0.5 ${isSelected ? 'border-pink-500/40' : ''}`}>
                          <OptIcon className={`w-4 h-4 ${opt.accentColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold truncate">{opt.name}</span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{opt.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Ambient Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              soundEnabled
                ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={soundEnabled ? 'Mute Ambient Sounds' : 'Enable Ambient Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
