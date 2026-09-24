import React from 'react';
import { Shield } from 'lucide-react';
import { ToolId } from '../types';

interface FooterProps {
  onSelectTool: (id: ToolId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTool }) => {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80 backdrop-blur-md mt-16 py-10 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand info */}
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="font-heading font-extrabold text-white text-base tracking-wide">
                IMGFORGE
              </span>
              <span className="text-xs text-pink-400 font-mono">PRO</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm">
              Built for creators, designers, and developers. Process documents, archives, and high-res media privately.
            </p>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Files processed securely in client memory • Zero cloud storage</span>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <button
              onClick={() => onSelectTool('files-to-zip')}
              className="hover:text-cyan-300 transition cursor-pointer"
            >
              Files → ZIP
            </button>
            <button
              onClick={() => onSelectTool('images-to-zip')}
              className="hover:text-purple-300 transition cursor-pointer"
            >
              Images → ZIP
            </button>
            <button
              onClick={() => onSelectTool('images-to-pdf')}
              className="hover:text-pink-300 transition cursor-pointer"
            >
              Images → PDF
            </button>
            <button
              onClick={() => onSelectTool('zip-extractor')}
              className="hover:text-indigo-300 transition cursor-pointer"
            >
              ZIP Extractor
            </button>
            <button
              onClick={() => onSelectTool('reduce-size')}
              className="hover:text-emerald-300 transition cursor-pointer"
            >
              Reduce Size
            </button>
            <button
              onClick={() => onSelectTool('json-formatter')}
              className="hover:text-teal-300 transition cursor-pointer"
            >
              JSON Tool
            </button>
            <button
              onClick={() => onSelectTool('qr-generator')}
              className="hover:text-pink-300 transition cursor-pointer"
            >
              QR Generator
            </button>
            <button
              onClick={() => onSelectTool('qr-scanner')}
              className="hover:text-indigo-300 transition cursor-pointer"
            >
              QR Scanner
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
