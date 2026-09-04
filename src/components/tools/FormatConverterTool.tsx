import React, { useState } from 'react';
import JSZip from 'jszip';
import { 
  ArrowLeftRight, 
  FileUp, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { ProcessedImageItem } from '../../types';
import { formatBytes, loadImage, downloadBlob } from '../../utils/fileUtils';
import { playAnimeSparkleSound } from '../../utils/audioUtils';

export const FormatConverterTool: React.FC = () => {
  const [images, setImages] = useState<ProcessedImageItem[]>([]);
  const [targetExt, setTargetExt] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [fillTransparent, setFillTransparent] = useState<boolean>(true);
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: File[] = [];
    if ('dataTransfer' in e) {
      e.preventDefault();
      if (e.dataTransfer.files) files = Array.from(e.dataTransfer.files);
    } else if (e.target.files) {
      files = Array.from(e.target.files);
    }

    const imageFiles = files.filter(f => f.type.startsWith('image/') || f.name.endsWith('.svg'));
    if (imageFiles.length === 0) {
      setErrorMessage('Please select valid image files.');
      return;
    }

    setErrorMessage(null);

    const items: ProcessedImageItem[] = await Promise.all(
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

    setImages(prev => [...prev, ...items]);
  };

  const convertAll = async () => {
    if (images.length === 0) return;
    setIsConverting(true);
    setErrorMessage(null);

    try {
      const mime = `image/${targetExt === 'jpeg' ? 'jpeg' : targetExt}`;
      const updated: ProcessedImageItem[] = [];

      for (const item of images) {
        const img = await loadImage(item.previewUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context failed');

        if (targetExt === 'jpeg' || (fillTransparent && targetExt !== 'png')) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Conversion failed'))),
            mime,
            0.92
          );
        });

        const url = URL.createObjectURL(blob);
        updated.push({
          ...item,
          compressedBlob: blob,
          compressedSize: blob.size,
          compressedUrl: url,
          status: 'done',
        });
      }

      setImages(updated);
      playAnimeSparkleSound();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Conversion error';
      setErrorMessage(msg);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadItem = (item: ProcessedImageItem) => {
    if (!item.compressedBlob) return;
    const base = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    downloadBlob(item.compressedBlob, `${base}.${targetExt}`);
    playAnimeSparkleSound();
  };

  const downloadAllZip = async () => {
    const ready = images.filter(i => i.compressedBlob);
    if (ready.length === 0) return;

    const zip = new JSZip();
    ready.forEach(item => {
      const base = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
      zip.file(`${base}.${targetExt}`, item.compressedBlob!);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `converted_to_${targetExt}.zip`);
    playAnimeSparkleSound();
  };

  const clearAll = () => {
    images.forEach(img => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      if (img.compressedUrl) URL.revokeObjectURL(img.compressedUrl);
    });
    setImages([]);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Format Studio
            </span>
            <span className="text-xs text-slate-400 font-mono">Multi-Format Transcoding</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Image Format Converter</h2>
          <p className="text-sm text-slate-400">
            Convert image collections between PNG, JPEG, and WebP with transparency handling and background color fill.
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
        className="border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-8 text-center bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md transition group cursor-pointer relative"
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition duration-300 mb-3 shadow-lg shadow-amber-500/10">
            <ArrowLeftRight className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-base font-semibold text-white">
            Drop images to convert or <span className="text-amber-400 underline decoration-amber-400/50">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">PNG • JPG • WEBP • SVG • GIF</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-5">
          {/* Conversion Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300">Convert All To:</span>
              <div className="flex items-center gap-1.5">
                {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setTargetExt(fmt)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg uppercase border transition ${
                      targetExt === fmt
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={convertAll}
                disabled={isConverting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                {isConverting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Convert ({images.length})</span>
                  </>
                )}
              </button>

              {images.some(i => i.compressedBlob) && (
                <button
                  onClick={downloadAllZip}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ZIP</span>
                </button>
              )}
            </div>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm flex flex-col justify-between"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-700/50">
                    <img
                      src={item.compressedUrl || item.previewUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400">
                      Original: {formatBytes(item.size)}
                    </p>
                    {item.compressedSize && (
                      <p className="text-[10px] text-amber-300 font-semibold">
                        New: {formatBytes(item.compressedSize)} ({targetExt.toUpperCase()})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">
                    {item.status === 'done' ? 'Converted' : 'Pending'}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.compressedBlob && (
                      <button
                        onClick={() => downloadItem(item)}
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600/80 hover:bg-emerald-500 text-white flex items-center gap-1 transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
