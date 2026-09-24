import React, { useState, useEffect } from 'react';
import { 
  Braces, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  Trash2, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Minimize2, 
  Maximize2, 
  FileCode2, 
  Table, 
  ChevronRight, 
  ChevronDown,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { playAnimeSparkleSound } from '../../utils/audioUtils';
import { formatBytes } from '../../utils/fileUtils';

// Helper converter functions
function jsonToYaml(obj: any, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (obj === null) return 'null';
  if (typeof obj === 'boolean' || typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':') || obj.includes('"') || obj.trim() === '') {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => `${pad}- ${jsonToYaml(item, indent + 2).replace(/^\s+/, '')}`).join('\n');
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    return keys.map(k => {
      const val = obj[k];
      if (typeof val === 'object' && val !== null) {
        return `${pad}${k}:\n${jsonToYaml(val, indent + 2)}`;
      }
      return `${pad}${k}: ${jsonToYaml(val, indent + 2)}`;
    }).join('\n');
  }
  return String(obj);
}

function jsonToCsv(arr: any[]): string {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const headers = Array.from(new Set(arr.flatMap(item => typeof item === 'object' && item !== null ? Object.keys(item) : ['value'])));
  const headerLine = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
  const rowLines = arr.map(item => {
    return headers.map(h => {
      let val = (typeof item === 'object' && item !== null) ? item[h] : item;
      if (val === undefined || val === null) return '""';
      if (typeof val === 'object') val = JSON.stringify(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });
  return [headerLine, ...rowLines].join('\n');
}

function jsonToXml(obj: any, rootName = 'root'): string {
  function toXml(val: any, tag: string): string {
    if (val === null || val === undefined) return `<${tag}/>`;
    if (Array.isArray(val)) {
      return val.map(item => toXml(item, tag)).join('\n');
    }
    if (typeof val === 'object') {
      const inner = Object.keys(val).map(k => toXml(val[k], k)).join('');
      return `<${tag}>${inner}</${tag}>`;
    }
    return `<${tag}>${String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${tag}>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${toXml(obj, rootName)}`;
}

function jsonToDotPaths(obj: any, prefix = ''): string[] {
  if (obj === null) return [`${prefix} = null`];
  if (typeof obj !== 'object') return [`${prefix} = ${JSON.stringify(obj)}`];
  const lines: string[] = [];
  for (const key of Object.keys(obj)) {
    const currentPath = prefix ? (Array.isArray(obj) ? `${prefix}[${key}]` : `${prefix}.${key}`) : key;
    lines.push(...jsonToDotPaths(obj[key], currentPath));
  }
  return lines;
}

// Interactive JSON Tree Node Component
const TreeNode: React.FC<{ dataKey?: string; value: any; isLast?: boolean }> = ({ dataKey, value, isLast = true }) => {
  const [collapsed, setCollapsed] = useState(false);
  const isObject = typeof value === 'object' && value !== null;
  const isArray = Array.isArray(value);

  if (!isObject) {
    let colorClass = 'text-green-400';
    let displayVal = JSON.stringify(value);
    if (typeof value === 'number') colorClass = 'text-amber-400';
    if (typeof value === 'boolean') colorClass = 'text-purple-400';
    if (value === null) colorClass = 'text-slate-500 italic';

    return (
      <div className="font-mono text-xs py-0.5 pl-5 hover:bg-white/5 rounded transition">
        {dataKey !== undefined && <span className="text-pink-300 font-semibold mr-1.5">"{dataKey}":</span>}
        <span className={colorClass}>{displayVal}</span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  const keys = Object.keys(value);
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div className="font-mono text-xs pl-2 py-0.5">
      <div 
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 cursor-pointer select-none hover:bg-white/5 rounded px-1 -ml-1 transition"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-pink-400 shrink-0" />
        )}
        {dataKey !== undefined && <span className="text-pink-300 font-semibold">"{dataKey}":</span>}
        <span className="text-slate-400 font-bold">{openBracket}</span>
        {collapsed && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {isArray ? `${keys.length} items` : `${keys.length} keys`}
          </span>
        )}
        {collapsed && <span className="text-slate-400 font-bold">{closeBracket}</span>}
      </div>

      {!collapsed && (
        <div className="border-l border-slate-700/60 ml-2.5 pl-2 my-0.5 space-y-0.5">
          {keys.map((k, idx) => (
            <TreeNode
              key={k}
              dataKey={isArray ? undefined : k}
              value={value[k]}
              isLast={idx === keys.length - 1}
            />
          ))}
          <div className="text-slate-400 font-bold pl-0.5">{closeBracket}{!isLast && <span className="text-slate-500">,</span>}</div>
        </div>
      )}
    </div>
  );
};

export const JsonFormatterTool: React.FC = () => {
  const [inputJson, setInputJson] = useState<string>('');
  const [parsedObject, setParsedObject] = useState<any>(null);
  const [syntaxError, setSyntaxError] = useState<{ message: string; line?: number; column?: number } | null>(null);
  const [viewMode, setViewMode] = useState<'text' | 'tree' | 'yaml' | 'csv' | 'xml' | 'paths'>('text');
  const [copied, setCopied] = useState<boolean>(false);
  const [stats, setStats] = useState<{ chars: number; size: number; keys: number; depth: number } | null>(null);

  // Parse and validate JSON on change
  useEffect(() => {
    const trimmed = inputJson.trim();
    if (!trimmed) {
      setParsedObject(null);
      setSyntaxError(null);
      setStats(null);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      setParsedObject(parsed);
      setSyntaxError(null);

      // Compute statistics
      let keyCount = 0;
      let maxDepth = 0;
      function walk(val: any, depth = 1) {
        if (depth > maxDepth) maxDepth = depth;
        if (typeof val === 'object' && val !== null) {
          const keys = Object.keys(val);
          keyCount += keys.length;
          for (const k of keys) {
            walk(val[k], depth + 1);
          }
        }
      }
      walk(parsed, 1);

      setStats({
        chars: inputJson.length,
        size: new Blob([inputJson]).size,
        keys: keyCount,
        depth: maxDepth,
      });
    } catch (err: any) {
      setParsedObject(null);
      let lineMatch = err.message.match(/at position (\d+)/i) || err.message.match(/line (\d+) column (\d+)/i);
      setSyntaxError({
        message: err.message.replace(/^JSON\.parse: /, ''),
      });
      setStats(null);
    }
  }, [inputJson]);

  const handleFormat = (indent: number | string) => {
    if (!parsedObject) return;
    const formatted = JSON.stringify(parsedObject, null, indent);
    setInputJson(formatted);
    setViewMode('text');
    playAnimeSparkleSound();
  };

  const handleMinify = () => {
    if (!parsedObject) return;
    const minified = JSON.stringify(parsedObject);
    setInputJson(minified);
    setViewMode('text');
    playAnimeSparkleSound();
  };

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'json' | 'yaml' | 'csv' | 'xml') => {
    if (!parsedObject) return;
    let content = '';
    let mimeType = 'application/json';
    let filename = `formatted-data.${format}`;

    if (format === 'json') {
      content = JSON.stringify(parsedObject, null, 2);
    } else if (format === 'yaml') {
      content = jsonToYaml(parsedObject);
      mimeType = 'text/yaml';
    } else if (format === 'csv') {
      const arr = Array.isArray(parsedObject) ? parsedObject : [parsedObject];
      content = jsonToCsv(arr);
      mimeType = 'text/csv';
    } else if (format === 'xml') {
      content = jsonToXml(parsedObject);
      mimeType = 'application/xml';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playAnimeSparkleSound();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) file = e.dataTransfer.files[0];
    } else if (e.target.files && e.target.files[0]) {
      file = e.target.files[0];
    }
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInputJson(text);
      playAnimeSparkleSound();
    };
    reader.readAsText(file);
  };

  const loadSample = (type: 'user' | 'api' | 'products' | 'config') => {
    let sample: any = {};
    if (type === 'user') {
      sample = {
        id: "usr_78912",
        name: "Ashiq Ali",
        role: "Lead Creator",
        email: "creator@example.com",
        isActive: true,
        preferences: {
          theme: "twilight",
          notifications: { email: true, push: false },
          favoriteTools: ["qr-generator", "images-to-pdf", "reduce-size"]
        },
        skills: ["TypeScript", "FullStack", "Media Engineering"],
        stats: { projectsCount: 42, score: 98.7 }
      };
    } else if (type === 'api') {
      sample = {
        status: 200,
        message: "Payload retrieved successfully",
        timestamp: "2026-09-22T09:45:00.000Z",
        data: {
          resultsCount: 3,
          items: [
            { id: 101, title: "Next-Gen QR Forge", category: "Utility", downloads: 4120 },
            { id: 102, title: "Image to PDF Suite", category: "Document", downloads: 8350 },
            { id: 103, title: "Client Size Reducer", category: "Optimization", downloads: 12900 }
          ]
        }
      };
    } else if (type === 'products') {
      sample = [
        { sku: "IMG-01", name: "Cyber Canvas Pro", price: 29.99, inStock: true, tags: ["anime", "render", "hd"] },
        { sku: "IMG-02", name: "Twilight Sky Vector", price: 19.50, inStock: true, tags: ["sakura", "twilight"] },
        { sku: "IMG-03", name: "Sunset Horizon Kit", price: 34.00, inStock: false, tags: ["nature", "pack"] }
      ];
    } else if (type === 'config') {
      sample = {
        appName: "IMGFORGE",
        version: "2.5.0",
        environment: "production",
        features: {
          offlineStorage: true,
          highResPdf: true,
          hardwareAcceleration: true,
          maxUploadMb: 250
        },
        security: {
          contentSecurityPolicy: "strict",
          zeroCloudUploads: true
        }
      };
    }

    setInputJson(JSON.stringify(sample, null, 2));
    playAnimeSparkleSound();
  };

  // Convert outputs
  const yamlOutput = parsedObject ? jsonToYaml(parsedObject) : '';
  const csvOutput = parsedObject ? jsonToCsv(Array.isArray(parsedObject) ? parsedObject : [parsedObject]) : '';
  const xmlOutput = parsedObject ? jsonToXml(parsedObject) : '';
  const pathsOutput = parsedObject ? jsonToDotPaths(parsedObject).join('\n') : '';

  return (
    <div className="space-y-6">
      {/* Title & Description Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Developer Utility
            </span>
            <span className="text-xs text-slate-400 font-mono">100% Client-Side</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <Braces className="w-6 h-6 text-emerald-400" />
            <span>JSON Format & Converter Tool</span>
          </h2>
          <p className="text-sm text-slate-400">
            Prettify, validate, minify, inspect interactive tree hierarchies, and convert JSON to YAML, CSV, XML, and key paths.
          </p>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold mr-1">Load Sample:</span>
          <button
            onClick={() => loadSample('user')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
          >
            User
          </button>
          <button
            onClick={() => loadSample('api')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
          >
            API
          </button>
          <button
            onClick={() => loadSample('products')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
          >
            Array Table
          </button>
          <button
            onClick={() => loadSample('config')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
          >
            Config
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
        {/* Formatting Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleFormat(2)}
            disabled={!parsedObject}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
            title="Format with 2 spaces indent"
          >
            <Braces className="w-3.5 h-3.5" />
            <span>Format (2 Spaces)</span>
          </button>
          <button
            onClick={() => handleFormat(4)}
            disabled={!parsedObject}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            title="Format with 4 spaces indent"
          >
            <span>4 Spaces</span>
          </button>
          <button
            onClick={handleMinify}
            disabled={!parsedObject}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
            title="Minify JSON (strip all whitespace)"
          >
            <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Minify</span>
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => setViewMode('text')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              viewMode === 'text' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Code
          </button>
          <button
            onClick={() => setViewMode('tree')}
            disabled={!parsedObject}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              viewMode === 'tree' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Interactive Tree
          </button>
          <button
            onClick={() => setViewMode('yaml')}
            disabled={!parsedObject}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              viewMode === 'yaml' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            YAML
          </button>
          <button
            onClick={() => setViewMode('csv')}
            disabled={!parsedObject}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              viewMode === 'csv' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            CSV
          </button>
          <button
            onClick={() => setViewMode('xml')}
            disabled={!parsedObject}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              viewMode === 'xml' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            XML
          </button>
          <button
            onClick={() => setViewMode('paths')}
            disabled={!parsedObject}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              viewMode === 'paths' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Paths
          </button>
        </div>

        {/* File & Export Actions */}
        <div className="flex items-center gap-1.5">
          <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium cursor-pointer transition flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Upload JSON</span>
            <input type="file" accept=".json,.txt" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => handleCopy(viewMode === 'text' ? inputJson : viewMode === 'yaml' ? yamlOutput : viewMode === 'csv' ? csvOutput : viewMode === 'xml' ? xmlOutput : pathsOutput)}
            disabled={!inputJson}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={() => handleDownload(viewMode === 'yaml' ? 'yaml' : viewMode === 'csv' ? 'csv' : viewMode === 'xml' ? 'xml' : 'json')}
            disabled={!parsedObject}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            onClick={() => {
              setInputJson('');
              setParsedObject(null);
              setSyntaxError(null);
            }}
            disabled={!inputJson}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700 transition cursor-pointer disabled:opacity-40"
            title="Clear all text"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Validation Status & Live Metrics */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        {syntaxError ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 w-full sm:w-auto">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-mono">{syntaxError.message}</span>
          </div>
        ) : parsedObject ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">Valid JSON Syntax</span>
          </div>
        ) : (
          <span className="text-slate-500">Paste or type JSON below to begin.</span>
        )}

        {stats && (
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Keys: <b className="text-white">{stats.keys}</b></span>
            <span>Depth: <b className="text-white">{stats.depth}</b></span>
            <span>Chars: <b className="text-white">{stats.chars.toLocaleString()}</b></span>
            <span>Size: <b className="text-white">{formatBytes(stats.size)}</b></span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800">
        {viewMode === 'text' && (
          <div className="relative">
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              placeholder="Paste or type raw JSON here... e.g. { &quot;name&quot;: &quot;IMGFORGE&quot;, &quot;active&quot;: true }"
              rows={18}
              className={`w-full p-4 rounded-xl bg-slate-950 font-mono text-xs sm:text-sm text-slate-100 placeholder-slate-600 border focus:outline-none transition leading-relaxed ${
                syntaxError ? 'border-rose-500/50 focus:border-rose-400' : 'border-slate-800 focus:border-emerald-500/50'
              }`}
              spellCheck={false}
            />
          </div>
        )}

        {viewMode === 'tree' && parsedObject && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-h-[500px] overflow-y-auto">
            <div className="mb-3 pb-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-pink-400">Interactive Object Explorer</span>
              <span>Click any node to expand / collapse</span>
            </div>
            <TreeNode value={parsedObject} />
          </div>
        )}

        {viewMode === 'yaml' && (
          <div className="relative">
            <textarea
              readOnly
              value={yamlOutput}
              rows={18}
              className="w-full p-4 rounded-xl bg-slate-950 font-mono text-xs sm:text-sm text-indigo-300 border border-slate-800 focus:outline-none leading-relaxed"
            />
          </div>
        )}

        {viewMode === 'csv' && (
          <div className="relative">
            <textarea
              readOnly
              value={csvOutput}
              rows={18}
              className="w-full p-4 rounded-xl bg-slate-950 font-mono text-xs sm:text-sm text-amber-300 border border-slate-800 focus:outline-none leading-relaxed"
            />
          </div>
        )}

        {viewMode === 'xml' && (
          <div className="relative">
            <textarea
              readOnly
              value={xmlOutput}
              rows={18}
              className="w-full p-4 rounded-xl bg-slate-950 font-mono text-xs sm:text-sm text-cyan-300 border border-slate-800 focus:outline-none leading-relaxed"
            />
          </div>
        )}

        {viewMode === 'paths' && (
          <div className="relative">
            <textarea
              readOnly
              value={pathsOutput}
              rows={18}
              className="w-full p-4 rounded-xl bg-slate-950 font-mono text-xs sm:text-sm text-purple-300 border border-slate-800 focus:outline-none leading-relaxed"
            />
          </div>
        )}
      </div>
    </div>
  );
};
