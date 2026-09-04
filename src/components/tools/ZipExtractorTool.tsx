import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { 
  FolderArchive, 
  FileUp, 
  Search, 
  Download, 
  Eye, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  File as GenericFile, 
  Trash2, 
  AlertCircle, 
  Folder, 
  Sparkles,
  X,
  Copy,
  Check
} from 'lucide-react';
import { ZipExtractedFile } from '../../types';
import { formatBytes, downloadBlob } from '../../utils/fileUtils';
import { playAnimeSparkleSound } from '../../utils/audioUtils';

export const ZipExtractorTool: React.FC = () => {
  const [zipFileName, setZipFileName] = useState<string>('');
  const [zipFileSize, setZipFileSize] = useState<number>(0);
  const [files, setFiles] = useState<ZipExtractedFile[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'images' | 'text'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-memory references to loaded archive and raw file
  const loadedZipRef = useRef<JSZip | null>(null);
  const rawZipFileRef = useRef<File | null>(null);

  // Preview Modal
  const [previewFile, setPreviewFile] = useState<ZipExtractedFile | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let zipFile: File | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        zipFile = e.dataTransfer.files[0];
      }
    } else if (e.target.files && e.target.files.length > 0) {
      zipFile = e.target.files[0];
    }

    if ('target' in e && e.target) {
      (e.target as HTMLInputElement).value = '';
    }

    if (!zipFile) return;

    if (!zipFile.name.toLowerCase().endsWith('.zip') && zipFile.type !== 'application/zip') {
      setErrorMessage('Please upload a valid .zip archive.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setZipFileName(zipFile.name);
    setZipFileSize(zipFile.size);
    rawZipFileRef.current = zipFile;

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipFile);
      loadedZipRef.current = loadedZip;
      const extractedList: ZipExtractedFile[] = [];

      const entries = Object.keys(loadedZip.files);
      for (const relativePath of entries) {
        const zipEntry = loadedZip.files[relativePath];
        if (zipEntry.dir) continue; // skip pure directories from list

        const name = relativePath.split('/').pop() || relativePath;
        const ext = name.split('.').pop()?.toLowerCase() || '';

        const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif', 'tiff', 'jfif'].includes(ext);
        const isText = ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'xml', 'csv', 'yml', 'yaml', 'env', 'log', 'ini', 'sql'].includes(ext);

        const uncompressedSize = (zipEntry as any)._data?.uncompressedSize || 0;
        const compressedSize = (zipEntry as any)._data?.compressedSize || 0;

        extractedList.push({
          id: Math.random().toString(36).substring(2, 9),
          name,
          path: relativePath,
          size: uncompressedSize,
          compressedSize,
          isDirectory: false,
          date: zipEntry.date,
          isImage,
          isText,
        });
      }

      setFiles(extractedList);
      playAnimeSparkleSound();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to read ZIP file';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      avif: 'image/avif',
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      ts: 'text/plain',
      md: 'text/markdown',
      csv: 'text/csv',
      xml: 'application/xml',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
    };
    return mimeMap[ext] || 'application/octet-stream';
  };

  const getFileBlob = async (fileItem: ZipExtractedFile): Promise<Blob> => {
    if (fileItem.blob) return fileItem.blob;

    let loaded = loadedZipRef.current;
    if (!loaded && rawZipFileRef.current) {
      const zip = new JSZip();
      loaded = await zip.loadAsync(rawZipFileRef.current);
      loadedZipRef.current = loaded;
    }

    if (!loaded) {
      throw new Error('ZIP archive is not loaded in memory. Please upload again.');
    }

    // Try finding the entry directly or fallback to matching path/name
    let entry = loaded.file(fileItem.path);
    if (!entry) {
      const allKeys = Object.keys(loaded.files);
      const matchedKey = allKeys.find(
        (k) =>
          k === fileItem.path ||
          k.toLowerCase() === fileItem.path.toLowerCase() ||
          k.endsWith('/' + fileItem.name) ||
          k.toLowerCase().endsWith('/' + fileItem.name.toLowerCase()) ||
          k === fileItem.name
      );
      if (matchedKey) {
        entry = loaded.file(matchedKey);
      }
    }

    if (!entry) {
      throw new Error(`File "${fileItem.name}" was not found inside the ZIP archive.`);
    }

    const rawBlob = await entry.async('blob');
    const mime = getMimeType(fileItem.name);
    const typedBlob = new Blob([rawBlob], { type: mime });
    fileItem.blob = typedBlob;
    return typedBlob;
  };

  const handleDownloadSingle = async (fileItem: ZipExtractedFile) => {
    try {
      setErrorMessage(null);
      const blob = await getFileBlob(fileItem);
      downloadBlob(blob, fileItem.name);
      playAnimeSparkleSound();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download file';
      setErrorMessage(msg);
    }
  };

  const handlePreview = async (fileItem: ZipExtractedFile) => {
    try {
      setErrorMessage(null);
      const blob = await getFileBlob(fileItem);
      const url = URL.createObjectURL(blob);
      fileItem.previewUrl = url;

      if (fileItem.isText) {
        const text = await blob.text();
        fileItem.textContent = text.slice(0, 10000); // cap to 10k chars for preview
      }

      setPreviewFile({ ...fileItem, previewUrl: url });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to preview this file';
      setErrorMessage(msg);
    }
  };

  const handleDownloadAll = async () => {
    for (const f of files) {
      try {
        const blob = await getFileBlob(f);
        downloadBlob(blob, f.name);
        await new Promise((r) => setTimeout(r, 150)); // small stagger
      } catch {
        // continue
      }
    }
    playAnimeSparkleSound();
  };

  const clearAll = () => {
    files.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFiles([]);
    setZipFileName('');
    setZipFileSize(0);
    setErrorMessage(null);
    loadedZipRef.current = null;
    rawZipFileRef.current = null;
  };

  // Filtered files
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.path.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCategory === 'images') return f.isImage;
    if (selectedCategory === 'text') return f.isText;
    return true;
  });

  const getFileIcon = (file: ZipExtractedFile) => {
    if (file.isImage) return <ImageIcon className="w-4 h-4 text-pink-400" />;
    if (file.isText) return <FileCode className="w-4 h-4 text-sky-400" />;
    return <GenericFile className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ZIP Extractor
            </span>
            <span className="text-xs text-slate-400 font-mono">Unpack & Inspect</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">ZIP Archive Extractor & Inspector</h2>
          <p className="text-sm text-slate-400">
            Unpack and inspect ZIP files entirely inside your browser. Preview images, read text files, and download items individually or all at once.
          </p>
        </div>
        {files.length > 0 && (
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-slate-700/60 transition"
          >
            Close Archive
          </button>
        )}
      </div>

      {/* Upload Dropzone */}
      {files.length === 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleZipUpload}
          className="border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 rounded-2xl p-10 text-center bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md transition group cursor-pointer relative"
        >
          <input
            type="file"
            id="zip-archive-input"
            accept=".zip,application/zip"
            onChange={handleZipUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition duration-300 mb-3 shadow-lg shadow-indigo-500/10">
              <FolderArchive className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-lg font-semibold text-white">
              Drop your .ZIP file here or <span className="text-indigo-400 underline decoration-indigo-400/50">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports standard ZIP archives of all sizes • 100% Client-Side Privacy
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Extracted File Viewer */}
      {files.length > 0 && (
        <div className="space-y-4">
          {/* Archive Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <FolderArchive className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{zipFileName}</h3>
                <p className="text-xs text-slate-400">
                  {files.length} files • Compressed: {formatBytes(zipFileSize)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadAll}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Extract & Download All Files</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search files inside archive..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-900/70 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['all', 'images', 'text'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* File Entries Table / List */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60 backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Name & Path</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-800/40 transition group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                            {getFileIcon(file)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate max-w-xs sm:max-w-md">{file.name}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-xs sm:max-w-md">{file.path}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {file.size > 0 ? formatBytes(file.size) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(file.isImage || file.isText) && (
                            <button
                              onClick={() => handlePreview(file)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadSingle(file)}
                            className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 hover:text-white border border-indigo-500/30 transition"
                            title="Download this file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredFiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No files matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-slate-800 text-pink-400">
                  {getFileIcon(previewFile)}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white truncate max-w-sm">{previewFile.name}</h4>
                  <span className="text-xs text-slate-400">{formatBytes(previewFile.size)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadSingle(previewFile)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-slate-950/80 rounded-xl border border-slate-800/80">
              {previewFile.isImage && previewFile.previewUrl && (
                <div className="max-w-full max-h-full flex items-center justify-center p-2">
                  <img
                    src={previewFile.previewUrl}
                    alt={previewFile.name}
                    referrerPolicy="no-referrer"
                    className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}

              {previewFile.isText && (
                <div className="w-full h-full flex flex-col">
                  <div className="flex justify-end pb-2">
                    <button
                      onClick={() => {
                        if (previewFile.textContent) {
                          navigator.clipboard.writeText(previewFile.textContent);
                          setCopiedText(true);
                          setTimeout(() => setCopiedText(false), 2000);
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition"
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText ? 'Copied!' : 'Copy Content'}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 rounded-lg text-slate-300 font-mono text-xs overflow-auto max-h-[50vh] whitespace-pre-wrap select-text">
                    {previewFile.textContent || 'No preview available'}
                  </pre>
                </div>
              )}

              {!previewFile.isImage && !previewFile.isText && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <GenericFile className="w-12 h-12 text-slate-500 mb-3" />
                  <p className="text-sm font-semibold text-slate-200">
                    Preview not available for this file type
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Please use the download button above to save and view this file on your device.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
