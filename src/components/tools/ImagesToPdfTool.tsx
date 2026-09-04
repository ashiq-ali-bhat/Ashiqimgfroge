import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FileUp, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  FileText, 
  Download, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles,
  Plus,
  FolderUp,
  Info
} from 'lucide-react';
import { ProcessedImageItem } from '../../types';
import { formatBytes, loadImage } from '../../utils/fileUtils';
import { playAnimeSparkleSound } from '../../utils/audioUtils';

export const ImagesToPdfTool: React.FC = () => {
  const [images, setImages] = useState<ProcessedImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'fit'>('a4');
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [margin, setMargin] = useState<number>(5); // in mm
  const [quality, setQuality] = useState<number>(0.85);
  const [fileName, setFileName] = useState<string>('images_document.pdf');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isImageFile = (f: File): boolean => {
    if (f.type && f.type.startsWith('image/')) return true;
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif', 'tiff', 'jfif', 'heic'].includes(ext);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: File[] = [];
    if ('dataTransfer' in e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files) {
        files = Array.from(e.dataTransfer.files);
      }
    } else if (e.target.files) {
      files = Array.from(e.target.files);
    }

    if ('target' in e && e.target) {
      (e.target as HTMLInputElement).value = '';
    }

    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) {
      if (files.length > 0) {
        setErrorMessage('Please select valid image files (PNG, JPG, WebP, GIF, SVG, etc.)');
      }
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
          // fallback dimensions
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

    setImages(prev => [...prev, ...newItems]);
    setGeneratedPdfUrl(null);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      const target = prev.find(img => img.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return filtered;
    });
    setGeneratedPdfUrl(null);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    setImages(prev => {
      const copy = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setGeneratedPdfUrl(null);
    setErrorMessage(null);
  };

  const generatePdf = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // Dimensions in mm
      // A4: 210 x 297 mm
      // Letter: 215.9 x 279.4 mm
      const pdf = new jsPDF({
        orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: pageSize === 'fit' ? 'a4' : pageSize,
      });

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        const img = await loadImage(item.previewUrl);

        // Convert image to JPEG dataURL with selected compression quality
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');

        // Fill background white for transparent images
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const imgData = canvas.toDataURL('image/jpeg', quality);

        // Calculate page layout
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let isPageLandscape = false;
        if (orientation === 'auto') {
          isPageLandscape = imgAspect > 1;
        } else {
          isPageLandscape = orientation === 'landscape';
        }

        let pageWidth = 210;
        let pageHeight = 297;

        if (pageSize === 'letter') {
          pageWidth = isPageLandscape ? 279.4 : 215.9;
          pageHeight = isPageLandscape ? 215.9 : 279.4;
        } else if (pageSize === 'fit') {
          // Fit exact image proportions in mm
          const pxToMm = 0.264583;
          pageWidth = Math.max(50, Math.min(800, img.naturalWidth * pxToMm));
          pageHeight = Math.max(50, Math.min(800, img.naturalHeight * pxToMm));
        } else {
          // A4
          pageWidth = isPageLandscape ? 297 : 210;
          pageHeight = isPageLandscape ? 210 : 297;
        }

        if (i > 0) {
          pdf.addPage([pageWidth, pageHeight], isPageLandscape ? 'landscape' : 'portrait');
        } else {
          // Configure first page format
          pdf.deletePage(1);
          pdf.addPage([pageWidth, pageHeight], isPageLandscape ? 'landscape' : 'portrait');
        }

        const effectiveMargin = pageSize === 'fit' ? 0 : margin;
        const availWidth = pageWidth - effectiveMargin * 2;
        const availHeight = pageHeight - effectiveMargin * 2;

        let renderWidth = availWidth;
        let renderHeight = availWidth / imgAspect;

        if (renderHeight > availHeight) {
          renderHeight = availHeight;
          renderWidth = availHeight * imgAspect;
        }

        const posX = effectiveMargin + (availWidth - renderWidth) / 2;
        const posY = effectiveMargin + (availHeight - renderHeight) / 2;

        pdf.addImage(imgData, 'JPEG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
      }

      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setGeneratedPdfUrl(blobUrl);
      playAnimeSparkleSound();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF';
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedPdfUrl) return;
    const a = document.createElement('a');
    a.href = generatedPdfUrl;
    a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playAnimeSparkleSound();
  };

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/30">
              PDF Studio
            </span>
            <span className="text-xs text-slate-400 font-mono">Convert & Merge</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Images into PDF Converter</h2>
          <p className="text-sm text-slate-400">
            Combine multiple PNG, JPG, or WebP images into a single professional PDF document.
          </p>
        </div>
        {images.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-slate-700/60 transition"
            >
              Clear All ({images.length})
            </button>
          </div>
        )}
      </div>

      {/* Hidden File and Folder Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg,.bmp,.ico,.avif,.tiff,.jfif,.heic"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: '', directory: '' } as unknown as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleFileUpload}
        className="border-2 border-dashed border-pink-500/30 hover:border-pink-500/60 rounded-2xl p-6 sm:p-8 text-center bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md transition group"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 flex items-center justify-center border border-pink-500/30 group-hover:scale-110 transition duration-300 mb-3 shadow-lg shadow-pink-500/10">
            <FileUp className="w-7 h-7 text-pink-400" />
          </div>
          <p className="text-base font-semibold text-white">
            Drag & drop multiple images here, or choose an option below
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Combine into high-res PDF • Supports PNG, JPG, WebP, GIF, SVG, AVIF, HEIC
          </p>

          {/* Multi-selection action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-pink-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Select Multiple Images</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
            >
              <FolderUp className="w-4 h-4 text-pink-400" />
              <span>Select Entire Image Folder</span>
            </button>
          </div>

          {/* Helper tip banner */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pink-950/40 border border-pink-500/20 text-[11px] text-pink-300">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-pink-400" />
            <span>
              <strong>Tip:</strong> In the file picker window, hold <kbd className="px-1 py-0.5 rounded bg-pink-900/60 font-mono text-[10px]">Ctrl</kbd> (or <kbd className="px-1 py-0.5 rounded bg-pink-900/60 font-mono text-[10px]">Cmd ⌘</kbd> on Mac) to select multiple files at once, or press <kbd className="px-1 py-0.5 rounded bg-pink-900/60 font-mono text-[10px]">Ctrl+A</kbd> to select all.
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Image List & Reordering (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
              <div>
                <span className="font-semibold text-white">{images.length}</span> images added • Total: <span className="font-mono text-pink-300">{formatBytes(images.reduce((acc, curr) => acc + curr.size, 0))}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-pink-400" />
                  <span>Add More Images</span>
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FolderUp className="w-3.5 h-3.5 text-pink-400" />
                  <span>Add Folder</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {images.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-pink-500/30 transition group backdrop-blur-sm"
                >
                  <span className="w-6 text-center text-xs font-bold text-slate-500 group-hover:text-pink-400">
                    #{idx + 1}
                  </span>
                  
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-700/50">
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatBytes(item.size)} • {item.width} × {item.height}px
                    </p>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveImage(idx, 'up')}
                      disabled={idx === 0}
                      title="Move Up"
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveImage(idx, 'down')}
                      disabled={idx === images.length - 1}
                      title="Move Down"
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeImage(item.id)}
                      title="Remove"
                      className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Settings & Export (1 col) */}
          <div className="space-y-5 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-pink-400" />
              <span>PDF Configuration</span>
            </div>

            {/* Document Filename */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Output Filename</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500 transition"
              />
            </div>

            {/* Page Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Page Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(['a4', 'letter', 'fit'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => { setPageSize(fmt); setGeneratedPdfUrl(null); }}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                      pageSize === fmt
                        ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Page Orientation</label>
              <div className="grid grid-cols-3 gap-2">
                {(['auto', 'portrait', 'landscape'] as const).map((ori) => (
                  <button
                    key={ori}
                    onClick={() => { setOrientation(ori); setGeneratedPdfUrl(null); }}
                    className={`py-1.5 text-xs font-medium rounded-lg border capitalize transition ${
                      orientation === ori
                        ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {ori}
                  </button>
                ))}
              </div>
            </div>

            {/* Margins */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Page Margin</span>
                <span className="text-pink-400">{margin} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="5"
                value={margin}
                onChange={(e) => { setMargin(Number(e.target.value)); setGeneratedPdfUrl(null); }}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0mm (No Border)</span>
                <span>10mm</span>
                <span>25mm</span>
              </div>
            </div>

            {/* Quality Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Image Quality</span>
                <span className="text-pink-400">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1.0"
                step="0.05"
                value={quality}
                onChange={(e) => { setQuality(Number(e.target.value)); setGeneratedPdfUrl(null); }}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Compact</span>
                <span>Balanced</span>
                <span>Max Quality</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={generatePdf}
                disabled={isGenerating}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rendering PDF...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate PDF Document</span>
                  </>
                )}
              </button>

              {generatedPdfUrl && (
                <div className="pt-2 space-y-2 animate-fadeIn">
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>PDF ready! Ready to download or preview.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownload}
                      className="w-full py-2.5 px-3 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <a
                      href={generatedPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-lg font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview in Tab</span>
                    </a>
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
