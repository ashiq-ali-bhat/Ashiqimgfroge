import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Minimize2, 
  FileUp, 
  Download, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Layers, 
  ArrowRight,
  Split,
  Maximize2
} from 'lucide-react';
import { ProcessedImageItem } from '../../types';
import { formatBytes, loadImage, downloadBlob } from '../../utils/fileUtils';
import { playAnimeSparkleSound } from '../../utils/audioUtils';

export const ReduceSizeTool: React.FC = () => {
  const [images, setImages] = useState<ProcessedImageItem[]>([]);
  const [quality, setQuality] = useState<number>(0.75); // 75%
  const [scalePercent, setScalePercent] = useState<number>(100); // 100% dimensions
  const [outputFormat, setOutputFormat] = useState<'original' | 'image/webp' | 'image/jpeg'>('image/webp');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [comparisonMode, setComparisonMode] = useState<'split' | 'side-by-side'>('side-by-side');
  const [splitPosition, setSplitPosition] = useState<number>(50); // % for split slider
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: File[] = [];
    if ('dataTransfer' in e) {
      e.preventDefault();
      if (e.dataTransfer.files) {
        files = Array.from(e.dataTransfer.files);
      }
    } else if (e.target.files) {
      files = Array.from(e.target.files);
    }

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setErrorMessage('Please select valid image files.');
      return;
    }

    setErrorMessage(null);

    const newItems: ProcessedImageItem[] = await Promise.all(
      imageFiles.map(async (file) => {
        const previewUrl = URL.createObjectURL(file);
        let width = 800;
        let height = 600;
        try {
          const img = await loadImage(previewUrl);
          width = img.naturalWidth || 800;
          height = img.naturalHeight || 600;
        } catch {
          // fallback
        }
        return {
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl,
          width,
          height,
          status: 'idle',
        };
      })
    );

    setImages(prev => {
      const combined = [...prev, ...newItems];
      return combined;
    });
  };

  // Compress a single image item
  const compressSingle = async (
    item: ProcessedImageItem, 
    targetQuality: number, 
    scale: number, 
    fmt: string
  ): Promise<ProcessedImageItem> => {
    try {
      const img = await loadImage(item.previewUrl);
      const canvas = document.createElement('canvas');
      const targetW = Math.round(img.naturalWidth * (scale / 100));
      const targetH = Math.round(img.naturalHeight * (scale / 100));
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context error');

      const mimeType = fmt === 'original' ? item.type : fmt;
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
          mimeType,
          targetQuality
        );
      });

      const compressedUrl = URL.createObjectURL(blob);
      const savings = Math.max(0, Math.round(((item.size - blob.size) / item.size) * 100));

      return {
        ...item,
        compressedBlob: blob,
        compressedSize: blob.size,
        compressedUrl,
        savingsPercent: savings,
        status: 'done',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error compressing';
      return {
        ...item,
        status: 'error',
        error: msg,
      };
    }
  };

  // Run compression whenever settings change or new images are added
  const runCompression = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      const updated = await Promise.all(
        images.map(img => compressSingle(img, quality, scalePercent, outputFormat))
      );
      setImages(updated);
      playAnimeSparkleSound();
    } catch {
      setErrorMessage('Failed to compress some images');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (images.length > 0) {
      runCompression();
    }
  }, [quality, scalePercent, outputFormat]);

  const removeImage = (id: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.compressedUrl) URL.revokeObjectURL(target.compressedUrl);
      const filtered = prev.filter(img => img.id !== id);
      if (activePreviewIndex >= filtered.length) {
        setActivePreviewIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const clearAll = () => {
    images.forEach(img => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      if (img.compressedUrl) URL.revokeObjectURL(img.compressedUrl);
    });
    setImages([]);
    setErrorMessage(null);
  };

  const downloadSingle = (item: ProcessedImageItem) => {
    if (!item.compressedBlob) return;
    const ext = outputFormat === 'image/webp' ? 'webp' : outputFormat === 'image/jpeg' ? 'jpg' : item.name.split('.').pop();
    const base = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    downloadBlob(item.compressedBlob, `${base}_optimized.${ext}`);
    playAnimeSparkleSound();
  };

  const downloadAllZip = async () => {
    const readyItems = images.filter(img => img.compressedBlob);
    if (readyItems.length === 0) return;

    const zip = new JSZip();
    readyItems.forEach(item => {
      const ext = outputFormat === 'image/webp' ? 'webp' : outputFormat === 'image/jpeg' ? 'jpg' : item.name.split('.').pop();
      const base = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
      zip.file(`${base}_optimized.${ext}`, item.compressedBlob!);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, 'komorebi_optimized_images.zip');
    playAnimeSparkleSound();
  };

  const totalOriginalSize = images.reduce((acc, curr) => acc + curr.size, 0);
  const totalCompressedSize = images.reduce((acc, curr) => acc + (curr.compressedSize || curr.size), 0);
  const totalSavings = totalOriginalSize > 0 
    ? Math.max(0, Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100))
    : 0;

  const currentPreviewItem = images[activePreviewIndex] || null;

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Size Reducer
            </span>
            <span className="text-xs text-slate-400 font-mono">Smart Optimization</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Reduce Image Size & Compressor</h2>
          <p className="text-sm text-slate-400">
            Shrink image file size dramatically with smart canvas re-encoding, resolution scaling, and lossless/perceptual optimization.
          </p>
        </div>
        {images.length > 0 && (
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-slate-700/60 transition"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileUpload}
        className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-8 text-center bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md transition group cursor-pointer relative"
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition duration-300 mb-3 shadow-lg shadow-emerald-500/10">
            <Minimize2 className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-base font-semibold text-white">
            Drop images to compress or <span className="text-emerald-400 underline decoration-emerald-400/50">browse files</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Instant client-side reduction • Safe & private</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-6">
          {/* Overall Stats Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-slate-400 block">Original Size</span>
                <span className="text-sm font-bold text-slate-200">{formatBytes(totalOriginalSize)}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />
              <div>
                <span className="text-xs text-slate-400 block">Optimized Size</span>
                <span className="text-sm font-bold text-emerald-400">{formatBytes(totalCompressedSize)}</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Saved {totalSavings}%</span>
              </div>
            </div>

            <button
              onClick={downloadAllZip}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All as ZIP</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Compression Settings (1 col) */}
            <div className="space-y-5 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Optimization Controls</span>
              </div>

              {/* Quality Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Compression Quality</span>
                  <span className="text-emerald-400">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>High Compression (30%)</span>
                  <span>Recommended (75%)</span>
                  <span>Lossless (100%)</span>
                </div>
              </div>

              {/* Dimension Scaling */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Scale Dimensions</span>
                  <span className="text-emerald-400">{scalePercent}%</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[25, 50, 75, 100].map((sc) => (
                    <button
                      key={sc}
                      onClick={() => setScalePercent(sc)}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                        scalePercent === sc
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {sc}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Web Format</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'WebP (Smallest)', value: 'image/webp' },
                    { label: 'JPEG (Classic)', value: 'image/jpeg' },
                    { label: 'Keep Original', value: 'original' },
                  ].map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setOutputFormat(fmt.value as any)}
                      className={`py-1.5 text-[11px] font-medium rounded-lg border transition text-center ${
                        outputFormat === fmt.value
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="pt-2">
                {isProcessing ? (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Compressing images...</span>
                  </div>
                ) : (
                  <button
                    onClick={runCompression}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    Re-apply Compression
                  </button>
                )}
              </div>
            </div>

            {/* Visual Comparison & Preview (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              {currentPreviewItem && (
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                        {currentPreviewItem.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {formatBytes(currentPreviewItem.size)} → <span className="text-emerald-400 font-semibold">{formatBytes(currentPreviewItem.compressedSize || 0)}</span> (Saved {currentPreviewItem.savingsPercent || 0}%)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5">
                        <button
                          onClick={() => setComparisonMode('side-by-side')}
                          className={`px-2.5 py-1 text-xs rounded-md transition ${comparisonMode === 'side-by-side' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
                        >
                          Side-by-Side
                        </button>
                        <button
                          onClick={() => setComparisonMode('split')}
                          className={`px-2.5 py-1 text-xs rounded-md transition ${comparisonMode === 'split' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
                        >
                          Interactive Split
                        </button>
                      </div>

                      <button
                        onClick={() => downloadSingle(currentPreviewItem)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {/* Comparison Canvas Area */}
                  {comparisonMode === 'side-by-side' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-2 flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                          Original ({formatBytes(currentPreviewItem.size)})
                        </span>
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/40 flex items-center justify-center">
                          <img
                            src={currentPreviewItem.previewUrl}
                            alt="Original"
                            referrerPolicy="no-referrer"
                            className="max-h-56 max-w-full object-contain"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-2 flex flex-col items-center">
                        <span className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">
                          Compressed ({formatBytes(currentPreviewItem.compressedSize || 0)})
                        </span>
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/40 flex items-center justify-center">
                          <img
                            src={currentPreviewItem.compressedUrl || currentPreviewItem.previewUrl}
                            alt="Compressed"
                            referrerPolicy="no-referrer"
                            className="max-h-56 max-w-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Interactive Split View */
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 select-none">
                      {/* Under layer (Compressed) */}
                      <img
                        src={currentPreviewItem.compressedUrl || currentPreviewItem.previewUrl}
                        alt="Compressed"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-contain"
                      />

                      {/* Top clipped layer (Original) */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${splitPosition}%` }}
                      >
                        <img
                          src={currentPreviewItem.previewUrl}
                          alt="Original"
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-contain max-w-none"
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>

                      {/* Split Divider Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-pink-500 pointer-events-none shadow-[0_0_8px_rgba(236,72,153,0.8)]"
                        style={{ left: `${splitPosition}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-bold shadow-lg">
                          ↔
                        </div>
                      </div>

                      {/* Invisible Scrub Slider */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={splitPosition}
                        onChange={(e) => setSplitPosition(Number(e.target.value))}
                        className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
                      />

                      <div className="absolute bottom-2 left-3 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white">
                        Original (Left)
                      </div>
                      <div className="absolute bottom-2 right-3 px-2 py-0.5 rounded bg-emerald-950/80 text-[10px] text-emerald-300 border border-emerald-500/40">
                        Compressed (Right)
                      </div>
                    </div>
                  )}

                  {/* Thumbnail Row to pick which image to compare */}
                  <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setActivePreviewIndex(idx)}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border transition ${
                          activePreviewIndex === idx
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img.previewUrl}
                          alt={img.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-center text-slate-300 truncate">
                          -{img.savingsPercent || 0}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
