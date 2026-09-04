export type ToolId = 
  | 'files-to-zip'
  | 'images-to-zip'
  | 'images-to-pdf'
  | 'zip-extractor'
  | 'reduce-size'
  | 'format-converter'
  | 'base64-studio'
  | 'watermark';

export interface ToolMeta {
  id: ToolId;
  title: string;
  categorySubtitle: string;
  shortDesc: string;
  badge?: string;
  iconName: string;
  accentColor: string;
}

export interface ProcessedImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  width: number;
  height: number;
  compressedBlob?: Blob;
  compressedSize?: number;
  compressedUrl?: string;
  savingsPercent?: number;
  status: 'idle' | 'processing' | 'done' | 'error';
  error?: string;
}

export interface ZipExtractedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  compressedSize: number;
  isDirectory: boolean;
  date?: Date;
  blob?: Blob;
  previewUrl?: string;
  isImage: boolean;
  isText: boolean;
  textContent?: string;
}

export type AnimeTheme = 'twilight' | 'sakura' | 'sunset' | 'cyber' | 'night';
