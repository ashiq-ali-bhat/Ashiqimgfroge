import React, { useState } from 'react';
import { 
  FileText, 
  FileArchive, 
  FolderArchive, 
  Minimize2, 
  ArrowLeftRight, 
  Stamp, 
  Binary, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  FileUp, 
  ArrowRight,
  Archive,
  Braces,
  QrCode,
  Scan
} from 'lucide-react';
import { ToolId, ToolMeta } from '../types';
import { playAnimeSparkleSound } from '../utils/audioUtils';

interface Hero3DProps {
  onSelectTool: (toolId: ToolId) => void;
  onUniversalFileDrop?: (files: FileList) => void;
  soundEnabled: boolean;
}

const TOOLS_CATALOG: ToolMeta[] = [
  {
    id: 'files-to-zip',
    title: 'Files into ZIP Archive',
    categorySubtitle: 'Multiple Files to 1 ZIP',
    shortDesc: 'Pack multiple files of any format (documents, images, audio, video, code) into a single high-efficiency compressed ZIP file.',
    iconName: 'Archive',
    accentColor: 'from-indigo-500/20 to-cyan-500/20 text-indigo-400 border-indigo-500/30',
  },
  {
    id: 'images-to-zip',
    title: 'Images into ZIP',
    categorySubtitle: 'Batch Photo Packaging',
    shortDesc: 'Package photo sets into compressed ZIP archives with batch sequential renaming and on-the-fly format conversions.',
    iconName: 'FileArchive',
    accentColor: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30',
  },
  {
    id: 'images-to-pdf',
    title: 'Images into PDF',
    categorySubtitle: 'Multi-Image Document',
    shortDesc: 'Merge multiple PNG, JPG, or WebP images into a formatted PDF document with customizable page sizes, margins, and layout.',
    iconName: 'FileText',
    accentColor: 'from-pink-500/20 to-purple-500/20 text-pink-400 border-pink-500/30',
  },
  {
    id: 'zip-extractor',
    title: 'ZIP Extractor & Inspector',
    categorySubtitle: 'Archive Explorer',
    shortDesc: 'Unpack and inspect ZIP files entirely inside your browser. Preview images, read source code, and download items individually.',
    iconName: 'FolderArchive',
    accentColor: 'from-blue-500/20 to-sky-500/20 text-blue-400 border-blue-500/30',
  },
  {
    id: 'reduce-size',
    title: 'Reduce Image Size',
    categorySubtitle: 'Smart Compression',
    shortDesc: 'Compress images up to 80% with interactive side-by-side and split before/after comparison sliders, scaling, and WebP encoding.',
    iconName: 'Minimize2',
    accentColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'format-converter',
    title: 'Format Converter',
    categorySubtitle: 'Universal Codec',
    shortDesc: 'Batch convert image formats between modern WebP, lossless PNG, and universal JPEG with background transparency options.',
    iconName: 'ArrowLeftRight',
    accentColor: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
  },
  {
    id: 'base64-studio',
    title: 'Image Base64 Studio',
    categorySubtitle: 'Data URI Generator',
    shortDesc: 'Encode images into clean Base64 Data URIs, HTML image tags, and CSS backgrounds, or decode strings back to files.',
    iconName: 'Binary',
    accentColor: 'from-cyan-500/20 to-sky-500/20 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'watermark',
    title: 'Image Watermark',
    categorySubtitle: 'Asset Protection',
    shortDesc: 'Brand your photos with customizable text or diagonal tiled pattern watermarks to protect your artwork.',
    iconName: 'Stamp',
    accentColor: 'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30',
  },
  {
    id: 'json-formatter',
    title: 'JSON Format & Converter',
    categorySubtitle: 'Developer Data Tool',
    shortDesc: 'Format, validate, minify, explore interactive tree hierarchies, and convert JSON to YAML, CSV, XML, and key paths.',
    iconName: 'Braces',
    badge: 'NEW',
    accentColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'qr-generator',
    title: 'QR Code Generator',
    categorySubtitle: 'Universal QR Studio',
    shortDesc: 'Generate QR codes for Links, Text, Images, animated GIFs, Wi-Fi passwords, vCard contacts, emails, and crypto addresses.',
    iconName: 'QrCode',
    badge: 'NEW',
    accentColor: 'from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/30',
  },
  {
    id: 'qr-scanner',
    title: 'QR to Image & Media',
    categorySubtitle: 'Decode & Convert',
    shortDesc: 'Scan any QR code from file or camera. Extract decoded images & GIFs, and convert them to PNG, JPG, or WebP formats.',
    iconName: 'Scan',
    badge: 'NEW',
    accentColor: 'from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30',
  },
];

export const Hero3D: React.FC<Hero3DProps> = ({ onSelectTool, onUniversalFileDrop, soundEnabled }) => {
  const [tiltCardId, setTiltCardId] = useState<string | null>(null);
  const [cardRotation, setCardRotation] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Calculate rotation angles
    const rotX = -(y / (rect.height / 2)) * 12;
    const rotY = (x / (rect.width / 2)) * 12;
    setTiltCardId(cardId);
    setCardRotation({ x: rotX, y: rotY });
  };

  const handleCardMouseLeave = () => {
    setTiltCardId(null);
    setCardRotation({ x: 0, y: 0 });
  };

  const renderIcon = (name: string) => {
    switch (name) {
      case 'Archive': return <Archive className="w-6 h-6" />;
      case 'FileText': return <FileText className="w-6 h-6" />;
      case 'FileArchive': return <FileArchive className="w-6 h-6" />;
      case 'FolderArchive': return <FolderArchive className="w-6 h-6" />;
      case 'Minimize2': return <Minimize2 className="w-6 h-6" />;
      case 'ArrowLeftRight': return <ArrowLeftRight className="w-6 h-6" />;
      case 'Binary': return <Binary className="w-6 h-6" />;
      case 'Stamp': return <Stamp className="w-6 h-6" />;
      case 'Braces': return <Braces className="w-6 h-6" />;
      case 'QrCode': return <QrCode className="w-6 h-6" />;
      case 'Scan': return <Scan className="w-6 h-6" />;
      default: return <Sparkles className="w-6 h-6" />;
    }
  };

  return (
    <div className="relative pt-8 pb-16 space-y-12">
      {/* Hero Headline Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-semibold tracking-wide backdrop-blur-md shadow-lg shadow-pink-500/10">
          <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
          <span>Next-Gen Media Engine • 100% Client-Side Processing</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          IMGFORGE
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          The all-in-one private suite to pack <span className="text-indigo-300 font-semibold">multiple files into 1 ZIP</span>, 
          convert <span className="text-pink-300 font-semibold">images to PDF</span>, inspect archives, 
          <span className="text-emerald-300 font-semibold"> reduce image sizes</span>, and convert formats with instant browser privacy.
        </p>

        {/* Feature Highlights Pill Bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Zero Upload Wait Times</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Files Never Leave Your Device</span>
          </div>
        </div>
      </div>

      {/* 3D Interactive Tool Cards Grid */}
      <div className="perspective-1000 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {TOOLS_CATALOG.map((tool) => {
            const isHovered = tiltCardId === tool.id;
            return (
              <div
                key={tool.id}
                onMouseMove={(e) => handleCardMouseMove(e, tool.id)}
                onMouseLeave={handleCardMouseLeave}
                onClick={() => {
                  onSelectTool(tool.id);
                  if (soundEnabled) playAnimeSparkleSound();
                }}
                style={{
                  transform: isHovered
                    ? `rotateX(${cardRotation.x}deg) rotateY(${cardRotation.y}deg) scale3d(1.02, 1.02, 1.02)`
                    : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                  transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
                }}
                className="transform-style-3d glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
              >
                {/* Top card bar with icon & badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${tool.accentColor} flex items-center justify-center border shadow-md group-hover:scale-110 transition duration-300`}>
                      {renderIcon(tool.iconName)}
                    </div>
                    {tool.badge && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-slate-300">
                        {tool.badge}
                      </span>
                    )}
                  </div>

                  {/* Subtitle & Title */}
                  <div className="text-[10px] font-mono text-pink-400/90 font-medium mb-0.5">
                    {tool.categorySubtitle}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition flex items-center gap-1.5">
                    <span>{tool.title}</span>
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {tool.shortDesc}
                  </p>
                </div>

                {/* Bottom Action Hint */}
                <div className="pt-4 mt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-pink-400 transition">
                  <span>Launch Tool</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
