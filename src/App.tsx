import React, { useState } from 'react';
import { AnimeTheme, ToolId } from './types';
import { AnimeBackground3D } from './components/AnimeBackground3D';
import { Header } from './components/Header';
import { Hero3D } from './components/Hero3D';
import { Footer } from './components/Footer';
import { FilesToZipTool } from './components/tools/FilesToZipTool';
import { ImagesToZipTool } from './components/tools/ImagesToZipTool';
import { ImagesToPdfTool } from './components/tools/ImagesToPdfTool';
import { ZipExtractorTool } from './components/tools/ZipExtractorTool';
import { ReduceSizeTool } from './components/tools/ReduceSizeTool';
import { FormatConverterTool } from './components/tools/FormatConverterTool';
import { Base64StudioTool } from './components/tools/Base64StudioTool';
import { WatermarkTool } from './components/tools/WatermarkTool';
import { DeveloperContact } from './components/DeveloperContact';
import { playAnimeSparkleSound } from './utils/audioUtils';
import { 
  ArrowLeft, 
  Archive,
  FileText, 
  FileArchive, 
  FolderArchive, 
  Minimize2, 
  ArrowLeftRight, 
  Binary, 
  Stamp
} from 'lucide-react';

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [theme, setTheme] = useState<AnimeTheme>('twilight');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const handleSelectTool = (id: ToolId) => {
    setActiveTool(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHero = () => {
    setActiveTool(null);
    if (soundEnabled) playAnimeSparkleSound();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col relative selection:bg-pink-500 selection:text-white">
      {/* 3D Interactive Anime Canvas & Background Layers */}
      <AnimeBackground3D theme={theme} />

      {/* Main App Content */}
      <div className="relative z-20 flex-1 flex flex-col">
        <Header
          activeTool={activeTool}
          setActiveTool={handleSelectTool}
          theme={theme}
          setTheme={setTheme}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {!activeTool ? (
            /* 3D Landing Page with Anime Hero & Interactive Cards */
            <Hero3D
              onSelectTool={handleSelectTool}
              soundEnabled={soundEnabled}
            />
          ) : (
            /* Active Tool Container with Glassmorphism Card */
            <div className="space-y-6 animate-fadeIn">
              {/* Tool Navigation & Back Button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={handleBackToHero}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 backdrop-blur-md transition text-xs font-semibold group cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition duration-200" />
                  <span>Go Back To Main Page</span>
                </button>

                {/* Quick Tool Switcher Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
                  {[
                    { id: 'files-to-zip' as ToolId, label: 'Files to ZIP', icon: Archive },
                    { id: 'images-to-zip' as ToolId, label: 'Images to ZIP', icon: FileArchive },
                    { id: 'images-to-pdf' as ToolId, label: 'Images to PDF', icon: FileText },
                    { id: 'zip-extractor' as ToolId, label: 'ZIP Extractor', icon: FolderArchive },
                    { id: 'reduce-size' as ToolId, label: 'Reduce Size', icon: Minimize2 },
                    { id: 'format-converter' as ToolId, label: 'Convert', icon: ArrowLeftRight },
                    { id: 'base64-studio' as ToolId, label: 'Base64', icon: Binary },
                    { id: 'watermark' as ToolId, label: 'Watermark', icon: Stamp },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isCurrent = activeTool === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTool(tab.id);
                          if (soundEnabled) playAnimeSparkleSound();
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                          isCurrent
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tool Workspace Card */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 backdrop-blur-2xl">
                {activeTool === 'files-to-zip' && <FilesToZipTool />}
                {activeTool === 'images-to-zip' && <ImagesToZipTool />}
                {activeTool === 'images-to-pdf' && <ImagesToPdfTool />}
                {activeTool === 'zip-extractor' && <ZipExtractorTool />}
                {activeTool === 'reduce-size' && <ReduceSizeTool />}
                {activeTool === 'format-converter' && <FormatConverterTool />}
                {activeTool === 'base64-studio' && <Base64StudioTool />}
                {activeTool === 'watermark' && <WatermarkTool />}
              </div>
            </div>
          )}
        </main>

        {/* Developer Info & Contact Form */}
        <DeveloperContact />

        <Footer onSelectTool={handleSelectTool} />
      </div>
    </div>
  );
}
