import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Stamp, 
  FileUp, 
  Download, 
  Trash2, 
  Sliders, 
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { ProcessedImageItem } from '../../types';
import { formatBytes, loadImage, downloadBlob } from '../../utils/fileUtils';
import { playAnimeSparkleSound } from '../../utils/audioUtils';

export const WatermarkTool: React.FC = () => {
  const [images, setImages] = useState<ProcessedImageItem[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [watermarkText, setWatermarkText] = useState<string>('© KOMOREBI STUDIO');
  const [opacity, setOpacity] = useState<number>(0.5);
  const [fontSize, setFontSize] = useState<number>(36);
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [position, setPosition] = useState<'center' | 'bottom-right' | 'tile'>('tile');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [watermarkedDataUrl, setWatermarkedDataUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: File[] = [];
    if ('dataTransfer' in e) {
      e.preventDefault();
      if (e.dataTransfer.files) files = Array.from(e.dataTransfer.files);
    } else if (e.target.files) {
      files = Array.from(e.target.files);
    }

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
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

  const renderWatermarkOnCanvas = async (item: ProcessedImageItem): Promise<string> => {
    const img = await loadImage(item.previewUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas error');

    // Draw base image
    ctx.drawImage(img, 0, 0);

    // Setup watermark style
    ctx.fillStyle = textColor;
    ctx.globalAlpha = opacity;
    ctx.font = `bold ${fontSize}px sans-serif`;

    if (position === 'center') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(watermarkText, canvas.width / 2, canvas.height / 2);
    } else if (position === 'bottom-right') {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(watermarkText, canvas.width - 30, canvas.height - 30);
    } else if (position === 'tile') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const stepX = 260;
      const stepY = 160;

      for (let x = 0; x < canvas.width + stepX; x += stepX) {
        for (let y = 0; y < canvas.height + stepY; y += stepY) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-Math.PI / 6); // -30 deg
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        }
      }
    }

    return canvas.toDataURL('image/png');
  };

  useEffect(() => {
    if (images.length > 0 && images[activeIdx]) {
      renderWatermarkOnCanvas(images[activeIdx]).then(url => {
        setWatermarkedDataUrl(url);
      });
    }
  }, [images, activeIdx, watermarkText, opacity, fontSize, textColor, position]);

  const handleDownloadActive = async () => {
    if (!watermarkedDataUrl || !images[activeIdx]) return;
    const a = document.createElement('a');
    a.href = watermarkedDataUrl;
    const base = images[activeIdx].name.substring(0, images[activeIdx].name.lastIndexOf('.')) || images[activeIdx].name;
    a.download = `${base}_watermarked.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playAnimeSparkleSound();
  };

  const handleDownloadAllZip = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      for (const img of images) {
        const dataUrl = await renderWatermarkOnCanvas(img);
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const base = img.name.substring(0, img.name.lastIndexOf('.')) || img.name;
        zip.file(`${base}_watermarked.png`, base64Data, { base64: true });
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'watermarked_images.zip');
      playAnimeSparkleSound();
    } catch {
      setErrorMessage('Failed to pack watermarked images');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setWatermarkedDataUrl(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Protection Studio
            </span>
            <span className="text-xs text-slate-400 font-mono">Watermark & Protect</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Image Watermark Studio</h2>
          <p className="text-sm text-slate-400">
            Brand and protect your creative assets with custom text or tile pattern watermarks.
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
        className="border-2 border-dashed border-rose-500/30 hover:border-rose-500/60 rounded-2xl p-8 text-center bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md transition group cursor-pointer relative"
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-pink-500/20 flex items-center justify-center border border-rose-500/30 group-hover:scale-110 transition duration-300 mb-3 shadow-lg shadow-rose-500/10">
            <Stamp className="w-7 h-7 text-rose-400" />
          </div>
          <p className="text-base font-semibold text-white">
            Drop images to watermark or <span className="text-rose-400 underline decoration-rose-400/50">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Live preview & custom pattern positioning</p>
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
          {/* Controls (1 col) */}
          <div className="space-y-4 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-rose-400" />
              <span>Watermark Properties</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Watermark Text</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Position</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Tile (Pattern)', value: 'tile' },
                  { label: 'Center', value: 'center' },
                  { label: 'Bottom Right', value: 'bottom-right' },
                ].map(pos => (
                  <button
                    key={pos.value}
                    onClick={() => setPosition(pos.value as any)}
                    className={`py-1.5 text-[11px] font-medium rounded-lg border transition ${
                      position === pos.value
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Opacity</span>
                <span className="text-rose-400">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Font Size</span>
                <span className="text-rose-400">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="80"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-slate-700"
                />
                <span className="text-xs font-mono text-slate-300">{textColor}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={handleDownloadActive}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Current Image</span>
              </button>

              {images.length > 1 && (
                <button
                  onClick={handleDownloadAllZip}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All as ZIP ({images.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Preview Area (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md flex flex-col items-center justify-center min-h-[350px]">
              {watermarkedDataUrl ? (
                <img
                  src={watermarkedDataUrl}
                  alt="Watermarked Preview"
                  referrerPolicy="no-referrer"
                  className="max-h-[400px] max-w-full object-contain rounded-lg shadow-xl"
                />
              ) : (
                <span className="text-xs text-slate-500">Generating preview...</span>
              )}
            </div>

            {/* Image Selector Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border transition ${
                    activeIdx === idx ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-slate-800 opacity-60'
                  }`}
                >
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
