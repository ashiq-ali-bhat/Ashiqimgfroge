import React, { useState } from 'react';
import { 
  Binary, 
  FileUp, 
  Copy, 
  Check, 
  Download, 
  Code, 
  Image as ImageIcon,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { fileToDataUrl, downloadBlob, formatBytes } from '../../utils/fileUtils';
import { playAnimeSparkleSound } from '../../utils/audioUtils';

export const Base64StudioTool: React.FC = () => {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  
  // Encode state
  const [encodedDataUrl, setEncodedDataUrl] = useState<string>('');
  const [imageMeta, setImageMeta] = useState<{ name: string; size: number } | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Decode state
  const [inputBase64, setInputBase64] = useState<string>('');
  const [decodedImageUrl, setDecodedImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEncodeUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) file = e.dataTransfer.files[0];
    } else if (e.target.files && e.target.files[0]) {
      file = e.target.files[0];
    }

    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setEncodedDataUrl(dataUrl);
      setImageMeta({ name: file.name, size: file.size });
      playAnimeSparkleSound();
    } catch {
      setErrorMessage('Failed to read image as Base64');
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDecode = () => {
    setErrorMessage(null);
    let trimmed = inputBase64.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('data:image/')) {
      trimmed = `data:image/png;base64,${trimmed}`;
    }

    try {
      setDecodedImageUrl(trimmed);
      playAnimeSparkleSound();
    } catch {
      setErrorMessage('Invalid Base64 image string');
    }
  };

  const handleDownloadDecoded = () => {
    if (!decodedImageUrl) return;
    const a = document.createElement('a');
    a.href = decodedImageUrl;
    a.download = 'decoded_image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playAnimeSparkleSound();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Developer Utility
            </span>
            <span className="text-xs text-slate-400 font-mono">Encode & Decode</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Image Base64 Studio</h2>
          <p className="text-sm text-slate-400">
            Convert images into Base64 Data URIs, HTML tags, and CSS codes, or decode raw Base64 strings back to files.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => setMode('encode')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'encode' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
            }`}
          >
            Image → Base64
          </button>
          <button
            onClick={() => setMode('decode')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'decode' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
            }`}
          >
            Base64 → Image
          </button>
        </div>
      </div>

      {mode === 'encode' ? (
        <div className="space-y-6">
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleEncodeUpload}
            className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/60 rounded-2xl p-8 text-center bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md transition group cursor-pointer relative"
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleEncodeUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition duration-300 mb-3 shadow-lg shadow-cyan-500/10">
                <Binary className="w-7 h-7 text-cyan-400" />
              </div>
              <p className="text-base font-semibold text-white">
                Drop image to encode or <span className="text-cyan-400 underline decoration-cyan-400/50">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Generates Data URI, HTML tag, and CSS background snippet</p>
            </div>
          </div>

          {encodedDataUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* Image Preview (1 col) */}
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md flex flex-col items-center justify-center">
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center p-2 mb-3 border border-slate-800">
                  <img
                    src={encodedDataUrl}
                    alt="Encoded Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-48 max-w-full object-contain"
                  />
                </div>
                <p className="text-xs font-bold text-white truncate max-w-xs">{imageMeta?.name}</p>
                <p className="text-[11px] text-slate-400">
                  File Size: {imageMeta && formatBytes(imageMeta.size)} • Base64 Length: {encodedDataUrl.length.toLocaleString()} chars
                </p>
              </div>

              {/* Code Snippets (2 cols) */}
              <div className="lg:col-span-2 space-y-3">
                {/* Data URI */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">Data URI (Standard)</span>
                    <button
                      onClick={() => copyToClipboard(encodedDataUrl, 'uri')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white flex items-center gap-1 transition"
                    >
                      {copiedType === 'uri' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedType === 'uri' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-2 rounded bg-slate-950 text-[11px] font-mono text-cyan-300 overflow-x-auto truncate">
                    {encodedDataUrl.slice(0, 80)}...
                  </pre>
                </div>

                {/* HTML <img> */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">HTML &lt;img&gt; Tag</span>
                    <button
                      onClick={() => copyToClipboard(`<img src="${encodedDataUrl}" alt="${imageMeta?.name || 'Image'}" />`, 'html')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition"
                    >
                      {copiedType === 'html' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedType === 'html' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-2 rounded bg-slate-950 text-[11px] font-mono text-slate-300 overflow-x-auto truncate">
                    {`<img src="${encodedDataUrl.slice(0, 50)}..." alt="Image" />`}
                  </pre>
                </div>

                {/* CSS Background */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">CSS Background</span>
                    <button
                      onClick={() => copyToClipboard(`background-image: url('${encodedDataUrl}');`, 'css')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition"
                    >
                      {copiedType === 'css' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedType === 'css' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-2 rounded bg-slate-950 text-[11px] font-mono text-slate-300 overflow-x-auto truncate">
                    {`background-image: url('${encodedDataUrl.slice(0, 50)}...');`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Decode Mode */
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Paste Base64 String or Data URI
            </label>
            <textarea
              rows={4}
              value={inputBase64}
              onChange={(e) => setInputBase64(e.target.value)}
              placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
              className="w-full p-3 text-xs font-mono rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <button
            onClick={handleDecode}
            disabled={!inputBase64.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Decode into Image</span>
          </button>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {decodedImageUrl && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col sm:flex-row items-center gap-6 animate-fadeIn">
              <div className="w-48 h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-2 flex items-center justify-center">
                <img
                  src={decodedImageUrl}
                  alt="Decoded"
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <h4 className="text-sm font-bold text-white">Image Decoded Successfully</h4>
                <p className="text-xs text-slate-400">
                  Ready to download to your computer as a PNG file.
                </p>
                <button
                  onClick={handleDownloadDecoded}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-emerald-600/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image (PNG)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
