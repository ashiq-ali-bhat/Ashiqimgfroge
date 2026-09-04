import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { 
  FileArchive, 
  Trash2, 
  Download, 
  FileUp, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Sparkles,
  PackageCheck,
  Plus,
  FolderUp,
  Info
} from 'lucide-react';
import { ProcessedImageItem } from '../../types';
import { formatBytes, loadImage, downloadBlob } from '../../utils/fileUtils';
import { playAnimeSparkleSound } from '../../utils/audioUtils';

export const ImagesToZipTool: React.FC = () => {
  const [images, setImages] = useState<ProcessedImageItem[]>([]);
  const [zipName, setZipName] = useState<string>('images_archive.zip');
  const [renameScheme, setRenameScheme] = useState<'original' | 'sequential'>('original');
  const [sequentialPrefix, setSequentialPrefix] = useState<string>('photo');
  const [targetFormat, setTargetFormat] = useState<'original' | 'image/png' | 'image/jpeg' | 'image/webp'>('original');
  const [quality, setQuality] = useState<number>(0.9);
  const [isPacking, setIsPacking] = useState<boolean>(false);
  const [packedZipBlob, setPackedZipBlob] = useState<Blob | null>(null);
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

    // Reset input value so re-selecting same files works seamlessly
    if ('target' in e && e.target) {
      (e.target as HTMLInputElement).value = '';
    }

    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) {
      if (files.length > 0) {
        setErrorMessage('Please select valid image files (PNG, JPG, WebP, GIF, SVG, AVIF, etc.)');
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
          // fallback
        }
        return {
          id: Math.random().toString(36).substring(2, 9) + Date.now(),
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'image/png',
          previewUrl,
          width,
          height,
          status: 'idle',
        };
      })
    );

    setImages(prev => [...prev, ...newItems]);
    setPackedZipBlob(null);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      const target = prev.find(img => img.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return filtered;
    });
    setPackedZipBlob(null);
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setPackedZipBlob(null);
    setErrorMessage(null);
  };

  const packIntoZip = async () => {
    if (images.length === 0) return;
    setIsPacking(true);
    setErrorMessage(null);

    try {
      const zip = new JSZip();

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        let fileData: Blob | File = item.file;
        let ext = item.name.split('.').pop() || 'png';

        // Check if format conversion or compression requested
        if (targetFormat !== 'original' || quality < 1.0) {
          const img = await loadImage(item.previewUrl);
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context error');

          const finalFormat = targetFormat === 'original' ? item.type : targetFormat;
          if (finalFormat === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0);

          const convertedBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (blob) => (blob ? resolve(blob) : reject(new Error('Conversion failed'))),
              finalFormat,
              quality
            );
          });

          fileData = convertedBlob;
          if (finalFormat === 'image/jpeg') ext = 'jpg';
          else if (finalFormat === 'image/png') ext = 'png';
          else if (finalFormat === 'image/webp') ext = 'webp';
        }

        // Determine output filename
        let outName = item.name;
        if (renameScheme === 'sequential') {
          const padIndex = String(i + 1).padStart(2, '0');
          outName = `${sequentialPrefix}_${padIndex}.${ext}`;
        } else if (targetFormat !== 'original') {
          const base = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
          outName = `${base}.${ext}`;
        }

        zip.file(outName, fileData);
      }

      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      setPackedZipBlob(content);
      playAnimeSparkleSound();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create ZIP';
      setErrorMessage(message);
    } finally {
      setIsPacking(false);
    }
  };

  const handleDownload = () => {
    if (!packedZipBlob) return;
    const finalName = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
    downloadBlob(packedZipBlob, finalName);
    playAnimeSparkleSound();
  };

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ZIP Archiver
            </span>
            <span className="text-xs text-slate-400 font-mono">Batch Compression</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Images into ZIP Packager</h2>
          <p className="text-sm text-slate-400">
            Batch bundle your images into a clean, portable compressed ZIP archive with optional renaming and format tuning.
          </p>
        </div>
        {images.length > 0 && (
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-slate-700/60 transition"
          >
            Clear All ({images.length})
          </button>
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
        className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 rounded-2xl p-6 sm:p-8 text-center bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md transition group"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition duration-300 mb-3 shadow-lg shadow-purple-500/10">
            <FileUp className="w-7 h-7 text-purple-400" />
          </div>
          <p className="text-base font-semibold text-white">
            Drag & drop multiple images here, or choose an option below
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Fast in-browser compression • Supports PNG, JPG, WebP, GIF, SVG, AVIF, HEIC
          </p>

          {/* Multi-selection action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Select Multiple Images</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
            >
              <FolderUp className="w-4 h-4 text-purple-400" />
              <span>Select Entire Image Folder</span>
            </button>
          </div>

          {/* Helper tip banner */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/20 text-[11px] text-purple-300">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-purple-400" />
            <span>
              <strong>Tip:</strong> In the file picker window, hold <kbd className="px-1 py-0.5 rounded bg-purple-900/60 font-mono text-[10px]">Ctrl</kbd> (or <kbd className="px-1 py-0.5 rounded bg-purple-900/60 font-mono text-[10px]">Cmd ⌘</kbd> on Mac) to select multiple files at once, or press <kbd className="px-1 py-0.5 rounded bg-purple-900/60 font-mono text-[10px]">Ctrl+A</kbd> to select all.
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

      {images.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Images Grid/List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
              <div>
                <span className="font-semibold text-white">{images.length}</span> images queued • Total Raw: <span className="font-mono text-purple-300">{formatBytes(images.reduce((acc, curr) => acc + curr.size, 0))}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span>Add More Images</span>
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FolderUp className="w-3.5 h-3.5 text-purple-400" />
                  <span>Add Folder</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {images.map((item, idx) => (
                <div
                  key={item.id}
                  className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 mb-2">
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-slate-300 font-mono">
                      #{idx + 1}
                    </span>
                    <button
                      onClick={() => removeImage(item.id)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/60 hover:bg-rose-600 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] truncate text-slate-300 font-medium">
                    {renameScheme === 'sequential' 
                      ? `${sequentialPrefix}_${String(idx + 1).padStart(2, '0')}`
                      : item.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {formatBytes(item.size)} • {item.width}×{item.height}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: ZIP Configuration */}
          <div className="space-y-5 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Packaging Settings</span>
            </div>

            {/* Archive Filename */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">ZIP Archive Filename</label>
              <input
                type="text"
                value={zipName}
                onChange={(e) => setZipName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* Batch Renaming */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Filename Scheme</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setRenameScheme('original'); setPackedZipBlob(null); }}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                    renameScheme === 'original'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Keep Original
                </button>
                <button
                  onClick={() => { setRenameScheme('sequential'); setPackedZipBlob(null); }}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                    renameScheme === 'sequential'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Sequential (01, 02)
                </button>
              </div>

              {renameScheme === 'sequential' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={sequentialPrefix}
                    placeholder="e.g. photo, trip_img"
                    onChange={(e) => setSequentialPrefix(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Example: {sequentialPrefix}_01.png, {sequentialPrefix}_02.png</p>
                </div>
              )}
            </div>

            {/* Format Conversion */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Convert Images To</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Original', value: 'original' },
                  { label: 'WEBP (Smallest)', value: 'image/webp' },
                  { label: 'JPEG (Standard)', value: 'image/jpeg' },
                  { label: 'PNG (Lossless)', value: 'image/png' },
                ].map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => { setTargetFormat(fmt.value as any); setPackedZipBlob(null); }}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                      targetFormat === fmt.value
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Slider (if converting) */}
            {targetFormat !== 'original' && targetFormat !== 'image/png' && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Compression Quality</span>
                  <span className="text-purple-400">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={quality}
                  onChange={(e) => { setQuality(Number(e.target.value)); setPackedZipBlob(null); }}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            )}

            {/* Pack Button */}
            <div className="pt-2 space-y-2">
              <button
                onClick={packIntoZip}
                disabled={isPacking}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isPacking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Packing Archive...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Pack Images into ZIP</span>
                  </>
                )}
              </button>

              {packedZipBlob && (
                <div className="pt-2 space-y-2 animate-fadeIn">
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-xs">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Archive ready!</span>
                    </div>
                    <span className="font-bold text-white">{formatBytes(packedZipBlob.size)}</span>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="w-full py-2.5 px-3 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {zipName.endsWith('.zip') ? zipName : `${zipName}.zip`}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
