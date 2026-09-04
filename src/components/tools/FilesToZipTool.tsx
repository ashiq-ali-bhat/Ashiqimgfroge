import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { 
  FileArchive, 
  Trash2, 
  Download, 
  FileUp, 
  Sliders, 
  AlertCircle,
  RefreshCw,
  Sparkles,
  PackageCheck,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Code,
  FolderPlus,
  Plus,
  FolderUp,
  Info
} from 'lucide-react';
import { formatBytes, downloadBlob } from '../../utils/fileUtils';
import { playAnimeSparkleSound } from '../../utils/audioUtils';

interface ArchiveItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  targetFolder: string; // optional subfolder path inside zip
}

export const FilesToZipTool: React.FC = () => {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [zipName, setZipName] = useState<string>('archive.zip');
  const [compressionLevel, setCompressionLevel] = useState<number>(6);
  const [renameScheme, setRenameScheme] = useState<'original' | 'prefix'>('original');
  const [filePrefix, setFilePrefix] = useState<string>('file');
  const [subfolderCategory, setSubfolderCategory] = useState<boolean>(false);
  const [isPacking, setIsPacking] = useState<boolean>(false);
  const [packedZipBlob, setPackedZipBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const getCategoryFolder = (file: File): string => {
    const type = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
      return 'images';
    }
    if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
      return 'audio';
    }
    if (type.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)) {
      return 'videos';
    }
    if (type.includes('pdf') || type.includes('document') || ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) {
      return 'documents';
    }
    if (type.includes('json') || type.includes('javascript') || type.includes('html') || type.includes('css') || ['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'html', 'css'].includes(ext)) {
      return 'code';
    }
    return 'others';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let rawFiles: File[] = [];
    if ('dataTransfer' in e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files) {
        rawFiles = Array.from(e.dataTransfer.files);
      }
    } else if (e.target.files) {
      rawFiles = Array.from(e.target.files);
    }

    // Reset input value so re-selecting same files works seamlessly
    if ('target' in e && e.target) {
      (e.target as HTMLInputElement).value = '';
    }

    if (rawFiles.length === 0) return;

    setErrorMessage(null);
    const newItems: ArchiveItem[] = rawFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9) + Date.now(),
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      targetFolder: '',
    }));

    setItems((prev) => [...prev, ...newItems]);
    setPackedZipBlob(null);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setPackedZipBlob(null);
  };

  const clearAll = () => {
    setItems([]);
    setPackedZipBlob(null);
    setErrorMessage(null);
  };

  const getFileIcon = (fileName: string, type: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-pink-400" />;
    }
    if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(ext)) {
      return <Music className="w-4 h-4 text-purple-400" />;
    }
    if (type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) {
      return <Video className="w-4 h-4 text-amber-400" />;
    }
    if (type.includes('pdf') || ['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
      return <FileText className="w-4 h-4 text-emerald-400" />;
    }
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'html', 'css'].includes(ext)) {
      return <Code className="w-4 h-4 text-cyan-400" />;
    }
    return <FileIcon className="w-4 h-4 text-slate-400" />;
  };

  const packIntoZip = async () => {
    if (items.length === 0) {
      setErrorMessage('Please add at least one file to compress.');
      return;
    }

    setIsPacking(true);
    setErrorMessage(null);

    try {
      const zip = new JSZip();

      // Track names to prevent collisions
      const usedNames = new Set<string>();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let filename = item.name;

        if (renameScheme === 'prefix') {
          const ext = item.name.includes('.') ? item.name.split('.').pop() : '';
          const pad = String(i + 1).padStart(2, '0');
          filename = ext ? `${filePrefix}_${pad}.${ext}` : `${filePrefix}_${pad}`;
        }

        // Folder categorization
        let fullPath = filename;
        if (subfolderCategory) {
          const folder = getCategoryFolder(item.file);
          fullPath = `${folder}/${filename}`;
        } else if (item.targetFolder.trim()) {
          const cleanFolder = item.targetFolder.trim().replace(/^\/+|\/+$/g, '');
          fullPath = `${cleanFolder}/${filename}`;
        }

        // Handle duplicates
        let uniquePath = fullPath;
        let counter = 1;
        while (usedNames.has(uniquePath.toLowerCase())) {
          const parts = fullPath.split('/');
          const baseFile = parts.pop() || '';
          const ext = baseFile.includes('.') ? '.' + baseFile.split('.').pop() : '';
          const rawName = baseFile.includes('.') ? baseFile.substring(0, baseFile.lastIndexOf('.')) : baseFile;
          const duplicateName = `${rawName}_(${counter})${ext}`;
          uniquePath = parts.length > 0 ? `${parts.join('/')}/${duplicateName}` : duplicateName;
          counter++;
        }

        usedNames.add(uniquePath.toLowerCase());
        zip.file(uniquePath, item.file);
      }

      const content = await zip.generateAsync({
        type: 'blob',
        compression: compressionLevel === 0 ? 'STORE' : 'DEFLATE',
        compressionOptions: { level: compressionLevel },
      });

      setPackedZipBlob(content);
      playAnimeSparkleSound();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create ZIP archive.';
      setErrorMessage(message);
    } finally {
      setIsPacking(false);
    }
  };

  const handleDownload = () => {
    if (!packedZipBlob) return;
    const finalName = zipName.toLowerCase().endsWith('.zip') ? zipName : `${zipName}.zip`;
    downloadBlob(packedZipBlob, finalName);
    playAnimeSparkleSound();
  };

  const totalRawSize = items.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Multi-File Compressor
            </span>
            <span className="text-xs text-slate-400 font-mono">Multiple Files into 1 ZIP</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Files to ZIP Archive Maker</h2>
          <p className="text-sm text-slate-400">
            Pack multiple files of any type (documents, images, videos, audio, code) into a single compressed ZIP archive.
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-slate-700/60 transition"
          >
            Clear All ({items.length})
          </button>
        )}
      </div>

      {/* Hidden File and Folder Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
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
        className="border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 rounded-2xl p-6 sm:p-8 text-center bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md transition group"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition duration-300 mb-3 shadow-lg shadow-indigo-500/10">
            <FileUp className="w-7 h-7 text-indigo-400" />
          </div>
          <p className="text-base font-semibold text-white">
            Drag & drop multiple files here, or choose an option below
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Accepts any file formats • Documents, images, archives, audio, video & code
          </p>

          {/* Action buttons for multi-selection */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Select Multiple Files</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
            >
              <FolderUp className="w-4 h-4 text-cyan-400" />
              <span>Select Entire Folder</span>
            </button>
          </div>

          {/* Helper tip banner */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
            <span>
              <strong>Tip:</strong> In the file picker window, hold <kbd className="px-1 py-0.5 rounded bg-indigo-900/60 font-mono text-[10px]">Ctrl</kbd> (or <kbd className="px-1 py-0.5 rounded bg-indigo-900/60 font-mono text-[10px]">Cmd ⌘</kbd> on Mac) to select multiple files, or press <kbd className="px-1 py-0.5 rounded bg-indigo-900/60 font-mono text-[10px]">Ctrl+A</kbd> to select all.
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

      {items.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Files Queued List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
              <div>
                <span className="font-semibold text-white">{items.length}</span> file{items.length !== 1 ? 's' : ''} queued • Total Raw Size: <span className="font-mono text-indigo-300">{formatBytes(totalRawSize)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Add More Files</span>
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FolderUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Add Folder</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800">
                      {getFileIcon(item.name, item.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
                        {renameScheme === 'prefix'
                          ? `${filePrefix}_${String(idx + 1).padStart(2, '0')}.${item.name.split('.').pop() || ''}`
                          : item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{formatBytes(item.size)}</span>
                        {subfolderCategory && (
                          <span className="text-indigo-400 font-mono">
                            folder: /{getCategoryFolder(item.file)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: ZIP Compression Controls */}
          <div className="space-y-5 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Compression Settings</span>
            </div>

            {/* Archive Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Output ZIP Name</label>
              <input
                type="text"
                value={zipName}
                onChange={(e) => setZipName(e.target.value)}
                placeholder="archive.zip"
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Renaming */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">File Naming Scheme</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setRenameScheme('original'); setPackedZipBlob(null); }}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                    renameScheme === 'original'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Keep Original
                </button>
                <button
                  onClick={() => { setRenameScheme('prefix'); setPackedZipBlob(null); }}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                    renameScheme === 'prefix'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Sequential Prefix
                </button>
              </div>

              {renameScheme === 'prefix' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={filePrefix}
                    placeholder="e.g. project_asset, document"
                    onChange={(e) => setFilePrefix(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Output: {filePrefix}_01.ext, {filePrefix}_02.ext</p>
                </div>
              )}
            </div>

            {/* Folder Organization Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-200">Auto-organize by file type</p>
                <p className="text-[10px] text-slate-400">Places files into /images, /documents, /code subfolders</p>
              </div>
              <input
                type="checkbox"
                checked={subfolderCategory}
                onChange={(e) => {
                  setSubfolderCategory(e.target.checked);
                  setPackedZipBlob(null);
                }}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Compression Level */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Deflate Compression</span>
                <span className="text-indigo-400 font-mono">
                  {compressionLevel === 0 ? 'Store (Fastest)' : `Level ${compressionLevel} (Max 9)`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="9"
                step="1"
                value={compressionLevel}
                onChange={(e) => {
                  setCompressionLevel(Number(e.target.value));
                  setPackedZipBlob(null);
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Level 0 (Store)</span>
                <span>Level 6 (Standard)</span>
                <span>Level 9 (Ultra)</span>
              </div>
            </div>

            {/* Pack Action Button */}
            <div className="pt-2 space-y-2">
              <button
                onClick={packIntoZip}
                disabled={isPacking}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-cyan-600 hover:from-indigo-600 hover:to-cyan-700 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isPacking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compressing {items.length} Files...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Compress Files into 1 ZIP</span>
                  </>
                )}
              </button>

              {packedZipBlob && (
                <div className="pt-2 space-y-2 animate-fadeIn">
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-xs">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>ZIP Archive Created!</span>
                    </div>
                    <span className="font-bold text-white">{formatBytes(packedZipBlob.size)}</span>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="w-full py-2.5 px-3 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {zipName.toLowerCase().endsWith('.zip') ? zipName : `${zipName}.zip`}</span>
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
