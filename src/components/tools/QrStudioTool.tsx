import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Scan, 
  Link, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Wifi, 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Coins, 
  Download, 
  Copy, 
  Check, 
  Upload, 
  Sparkles, 
  RefreshCw, 
  Camera, 
  CameraOff, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Sliders, 
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Share2,
  X,
  ImageDown
} from 'lucide-react';
import { 
  generateQrDataUrl, 
  generateQrSvg, 
  decodeQrFromImage, 
  analyzeQrPayload, 
  compressImageToFitQr,
  extractCenterBadgeFromQr,
  DecodedQrResult 
} from '../../utils/qrUtils';
import { playAnimeSparkleSound } from '../../utils/audioUtils';
import { formatBytes } from '../../utils/fileUtils';

interface QrStudioToolProps {
  initialTab?: 'generator' | 'scanner';
  onNavigateToJsonFormatter?: () => void;
}

export interface DownloadNotificationState {
  show: boolean;
  title: string;
  filename: string;
  previewUrl?: string;
}

export const QrStudioTool: React.FC<QrStudioToolProps> = ({ 
  initialTab = 'generator',
  onNavigateToJsonFormatter 
}) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'scanner'>(initialTab);

  // ================= GENERATOR STATE =================
  type GenType = 'url' | 'text' | 'image' | 'gif' | 'wifi' | 'vcard' | 'email' | 'phone' | 'sms' | 'geo' | 'crypto';
  const [genType, setGenType] = useState<GenType>('url');

  // Input states
  const [urlInput, setUrlInput] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  
  // Image / GIF QR inputs - DEFAULT to pure full QR code with offline image data
  const [imageMode, setImageMode] = useState<'dataUri' | 'url'>('dataUri');
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  
  const [gifMode, setGifMode] = useState<'url' | 'centerBadge'>('url');
  const [uploadedGifSrc, setUploadedGifSrc] = useState<string>('');
  const [gifFileName, setGifFileName] = useState<string>('');

  // Wi-Fi inputs
  const [wifiSsid, setWifiSsid] = useState<string>('MyHomeWiFi');
  const [wifiPassword, setWifiPassword] = useState<string>('SecretPassword123');
  const [wifiSecurity, setWifiSecurity] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [wifiHidden, setWifiHidden] = useState<boolean>(false);

  // vCard inputs
  const [vcardName, setVcardName] = useState<string>('Ashiq Ali');
  const [vcardPhone, setVcardPhone] = useState<string>('+1 555 123 4567');
  const [vcardEmail, setVcardEmail] = useState<string>('contact@example.com');
  const [vcardOrg, setVcardOrg] = useState<string>('IMGFORGE Studio');
  const [vcardTitle, setVcardTitle] = useState<string>('Founder & Developer');

  // Other types
  const [emailTo, setEmailTo] = useState<string>('hello@example.com');
  const [emailSub, setEmailSub] = useState<string>('Inquiry from QR Code');
  const [emailBody, setEmailBody] = useState<string>('Hi there!');
  
  const [phoneNum, setPhoneNum] = useState<string>('+1 555 987 6543');
  const [smsNum, setSmsNum] = useState<string>('+1 555 987 6543');
  const [smsMsg, setSmsMsg] = useState<string>('Hello! Scanning your QR code.');

  const [geoCoords, setGeoCoords] = useState<string>('37.7749,-122.4194');
  const [cryptoCoin, setCryptoCoin] = useState<string>('bitcoin');
  const [cryptoAddress, setCryptoAddress] = useState<string>('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');

  // Styling - Default is NO center logo (Pure, Full QR Code)
  const [qrColorDark, setQrColorDark] = useState<string>('#0f172a');
  const [qrColorLight, setQrColorLight] = useState<string>('#ffffff');
  const [ecLevel, setEcLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [qrMargin, setQrMargin] = useState<number>(2);
  const [enableCenterLogo, setEnableCenterLogo] = useState<boolean>(false);
  const [centerLogoSrc, setCenterLogoSrc] = useState<string>('');
  const [logoSizePercent, setLogoSizePercent] = useState<number>(22);

  // Output & Error Handling
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [payloadByteCount, setPayloadByteCount] = useState<number>(0);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Global Download Feedback Notification
  const [downloadNotification, setDownloadNotification] = useState<DownloadNotificationState>({
    show: false,
    title: '',
    filename: '',
    previewUrl: null,
  });

  // Auto-Compressed Micro-Image State for QR Barcode Storage
  const [compressedImageForQr, setCompressedImageForQr] = useState<string | null>(null);
  const [compressedImageBytes, setCompressedImageBytes] = useState<number>(0);
  const [isCompressingImage, setIsCompressingImage] = useState<boolean>(false);

  // ================= SCANNER / CONVERTER STATE =================
  const [scanFilePreview, setScanFilePreview] = useState<string | null>(null);
  const [decodedResult, setDecodedResult] = useState<DecodedQrResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanningCamera, setIsScanningCamera] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Extracted Center Logo from scanned QR code
  const [extractedCenterImage, setExtractedCenterImage] = useState<string | null>(null);

  // Extracted Image Converter state
  const [convertTargetFormat, setConvertTargetFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [convertQuality, setConvertQuality] = useState<number>(90);
  const [convertedImageUrl, setConvertedImageUrl] = useState<string | null>(null);
  const [convertedSize, setConvertedSize] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Auto-compress image whenever uploadedImageSrc changes to prepare for dataUri QR mode
  useEffect(() => {
    if (!uploadedImageSrc) {
      setCompressedImageForQr(null);
      setCompressedImageBytes(0);
      return;
    }
    let isCancelled = false;
    const runCompress = async () => {
      setIsCompressingImage(true);
      try {
        const res = await compressImageToFitQr(uploadedImageSrc, 2100);
        if (!isCancelled) {
          setCompressedImageForQr(res.dataUrl);
          setCompressedImageBytes(res.bytes);
        }
      } catch {
        // if compression fails, keep null
      } finally {
        if (!isCancelled) setIsCompressingImage(false);
      }
    };
    runCompress();
    return () => {
      isCancelled = true;
    };
  }, [uploadedImageSrc]);

  // Compute Raw String to Encode
  const computePayloadString = (): { text: string; logoUrl?: string } => {
    let text = '';
    // Logo is only applied if explicitly enabled by the user in the styling section
    let logoUrl = enableCenterLogo && centerLogoSrc ? centerLogoSrc : undefined;

    if (genType === 'url') {
      text = urlInput.trim();
    } else if (genType === 'text') {
      text = textInput.trim();
    } else if (genType === 'image') {
      // Full QR Code - NO image in center
      logoUrl = undefined;
      if (imageMode === 'dataUri') {
        // Embeds image data directly inside barcode
        text = compressedImageForQr || uploadedImageSrc || '';
      } else {
        text = urlInput.trim();
      }
    } else if (genType === 'gif') {
      if (gifMode === 'centerBadge' && uploadedGifSrc) {
        logoUrl = uploadedGifSrc;
      } else {
        logoUrl = undefined;
      }
      text = urlInput.trim();
    } else if (genType === 'wifi') {
      text = `WIFI:S:${wifiSsid};T:${wifiSecurity};P:${wifiPassword};H:${wifiHidden ? 'true' : 'false'};;`;
    } else if (genType === 'vcard') {
      text = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${vcardName}`,
        vcardPhone ? `TEL:${vcardPhone}` : '',
        vcardEmail ? `EMAIL:${vcardEmail}` : '',
        vcardOrg ? `ORG:${vcardOrg}` : '',
        vcardTitle ? `TITLE:${vcardTitle}` : '',
        'END:VCARD'
      ].filter(Boolean).join('\n');
    } else if (genType === 'email') {
      text = `mailto:${emailTo}?subject=${encodeURIComponent(emailSub)}&body=${encodeURIComponent(emailBody)}`;
    } else if (genType === 'phone') {
      text = `tel:${phoneNum}`;
    } else if (genType === 'sms') {
      text = `smsto:${smsNum}:${smsMsg}`;
    } else if (genType === 'geo') {
      text = `geo:${geoCoords}`;
    } else if (genType === 'crypto') {
      text = `${cryptoCoin}:${cryptoAddress}`;
    }

    return { text, logoUrl };
  };

  // Re-generate QR Code when inputs change
  useEffect(() => {
    let isCancelled = false;
    const generate = async () => {
      const { text, logoUrl } = computePayloadString();
      if (!text) {
        if (!isCancelled) {
          setQrError(null);
          setGeneratedQrDataUrl('');
          setPayloadByteCount(0);
        }
        return;
      }

      const byteSize = new Blob([text]).size;
      setPayloadByteCount(byteSize);

      // Check against maximum physical QR Version 40 capacity (2,953 bytes)
      if (byteSize > 2953) {
        if (!isCancelled) {
          setQrError(
            `Payload size (${byteSize.toLocaleString()} bytes) exceeds physical QR Code capacity (2,953 bytes max). Please shorten the content, use an image link, or switch to 'Embed Logo in QR Center'.`
          );
          setGeneratedQrDataUrl('');
        }
        return;
      }

      try {
        const qrUrl = await generateQrDataUrl(text, {
          colorDark: qrColorDark,
          colorLight: qrColorLight,
          errorCorrectionLevel: logoUrl ? 'H' : ecLevel,
          margin: qrMargin,
          width: 700,
          logoDataUrl: logoUrl,
          logoSizePercent: logoSizePercent,
        });
        if (!isCancelled) {
          setGeneratedQrDataUrl(qrUrl);
          setQrError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          const msg = err?.message || 'Failed to generate QR Code';
          if (msg.includes('too big')) {
            setQrError(
              `The data size (${byteSize.toLocaleString()} bytes) is too large for this QR Code level. Try reducing error correction or switching to 'Embed Logo in QR Center'.`
            );
          } else {
            setQrError(msg);
          }
          setGeneratedQrDataUrl('');
        }
      }
    };

    generate();
    return () => {
      isCancelled = true;
    };
  }, [
    genType, urlInput, textInput, imageMode, uploadedImageSrc, compressedImageForQr, gifMode, uploadedGifSrc,
    wifiSsid, wifiPassword, wifiSecurity, wifiHidden,
    vcardName, vcardPhone, vcardEmail, vcardOrg, vcardTitle,
    emailTo, emailSub, emailBody, phoneNum, smsNum, smsMsg,
    geoCoords, cryptoCoin, cryptoAddress,
    qrColorDark, qrColorLight, ecLevel, qrMargin, centerLogoSrc, logoSizePercent
  ]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCenterLogoSrc(event.target?.result as string);
      setEcLevel('H'); // High error correction needed for center logo
      playAnimeSparkleSound();
    };
    reader.readAsDataURL(file);
  };

  // Handle Image to QR Upload
  const handleImageToQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setUploadedImageSrc(src);
      playAnimeSparkleSound();
    };
    reader.readAsDataURL(file);
  };

  // Handle GIF to QR Upload
  const handleGifToQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGifFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedGifSrc(event.target?.result as string);
      playAnimeSparkleSound();
    };
    reader.readAsDataURL(file);
  };

  // Robust download helper that ensures real downloads on Mobile, Desktop, and iframe environments
  const triggerDownload = (dataUrlOrBlob: string | Blob, filename: string, mimeType = 'image/png') => {
    let url = '';
    let isBlobUrl = false;

    try {
      if (typeof dataUrlOrBlob === 'string') {
        if (dataUrlOrBlob.startsWith('data:')) {
          const parts = dataUrlOrBlob.split(';base64,');
          const contentType = parts[0].split(':')[1] || mimeType;
          const raw = window.atob(parts[1]);
          const rawLength = raw.length;
          const uInt8Array = new Uint8Array(rawLength);
          for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
          }
          const blob = new Blob([uInt8Array], { type: contentType });
          url = URL.createObjectURL(blob);
          isBlobUrl = true;
        } else {
          url = dataUrlOrBlob;
        }
      } else {
        url = URL.createObjectURL(dataUrlOrBlob);
        isBlobUrl = true;
      }

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (isBlobUrl) {
        setTimeout(() => URL.revokeObjectURL(url), 20000);
      }

      // Display immediate visible confirmation message for user
      setDownloadNotification({
        show: true,
        title: 'Download Started!',
        filename,
        previewUrl: typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : url,
      });

      playAnimeSparkleSound();
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadNotification({
        show: true,
        title: 'Download Initiated',
        filename,
        previewUrl: typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : undefined,
      });
    }
  };

  // Download QR as PNG
  const handleDownloadPng = () => {
    if (!generatedQrDataUrl) return;
    triggerDownload(generatedQrDataUrl, `qrcode-${genType}-${Date.now()}.png`, 'image/png');
  };

  // Download QR as SVG
  const handleDownloadSvg = async () => {
    const { text } = computePayloadString();
    if (!text) return;
    try {
      const svgStr = await generateQrSvg(text, {
        colorDark: qrColorDark,
        colorLight: qrColorLight,
        errorCorrectionLevel: ecLevel,
        margin: qrMargin,
      });
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      triggerDownload(blob, `qrcode-${genType}-${Date.now()}.svg`, 'image/svg+xml');
    } catch {
      // Graceful fallback if SVG fails
    }
  };

  // Copy QR Image to Clipboard
  const handleCopyQrImage = async () => {
    if (!generatedQrDataUrl) return;
    try {
      const res = await fetch(generatedQrDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedNotification('QR Image copied to clipboard!');
      setTimeout(() => setCopiedNotification(null), 2500);
      playAnimeSparkleSound();
    } catch {
      // Fallback: copy payload text
      const { text } = computePayloadString();
      await navigator.clipboard.writeText(text);
      setCopiedNotification('QR text payload copied!');
      setTimeout(() => setCopiedNotification(null), 2500);
    }
  };

  // ================= SCANNER / CONVERTER LOGIC =================
  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) file = e.dataTransfer.files[0];
    } else if (e.target.files && e.target.files[0]) {
      file = e.target.files[0];
    }
    if (!file) return;

    setScanError(null);
    setConvertedImageUrl(null);
    setConvertedSize(null);
    setExtractedCenterImage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setScanFilePreview(dataUrl);

      // 1. Detect if this uploaded QR code has an embedded photo/logo in the center
      try {
        const centerBadge = await extractCenterBadgeFromQr(dataUrl, 28);
        if (centerBadge) {
          setExtractedCenterImage(centerBadge);
        }
      } catch {
        // center extraction non-fatal
      }

      // 2. Decode standard QR code matrix
      try {
        const decoded = await decodeQrFromImage(file!);
        if (decoded) {
          const analysis = analyzeQrPayload(decoded);
          setDecodedResult(analysis);
          playAnimeSparkleSound();
        } else {
          setDecodedResult(null);
          setScanError('No standard QR code pattern detected in the image. You can still extract its center badge or convert the image below.');
        }
      } catch (err: any) {
        setDecodedResult(null);
        setScanError(`Decode note: ${err?.message || 'Standard matrix not found'}. You can still convert or extract center graphics below.`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Live Camera Scanner
  const startCameraScanner = async () => {
    setScanError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScanningCamera(true);

      // Continuous scanning loop
      const scanLoop = async () => {
        if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
          animationFrameRef.current = requestAnimationFrame(scanLoop);
          return;
        }

        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const decoded = await decodeQrFromImage(canvas as any);
            if (decoded) {
              const analysis = analyzeQrPayload(decoded);
              setDecodedResult(analysis);
              stopCameraScanner();
              playAnimeSparkleSound();
              return;
            }
          }
        } catch {
          // keep scanning
        }

        animationFrameRef.current = requestAnimationFrame(scanLoop);
      };

      animationFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      setScanError(`Camera access denied or unavailable: ${err?.message || 'Please grant camera permissions'}`);
      setIsScanningCamera(false);
    }
  };

  const stopCameraScanner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsScanningCamera(false);
  };

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Convert Decoded Image/GIF to other formats
  const handleConvertDecodedImage = async () => {
    const src = decodedResult?.dataUrl || decodedResult?.raw;
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // If converting to JPEG, draw solid white background
      if (convertTargetFormat === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      const mime = `image/${convertTargetFormat}`;
      const quality = convertQuality / 100;
      const resultDataUrl = canvas.toDataURL(mime, quality);

      setConvertedImageUrl(resultDataUrl);

      // compute approximate byte size
      const head = `data:${mime};base64,`;
      const base64Len = resultDataUrl.length - head.length;
      const byteSize = Math.round((base64Len * 3) / 4);
      setConvertedSize(byteSize);

      playAnimeSparkleSound();
    };
    img.src = src;
  };

  const handleDownloadConvertedImage = () => {
    if (!convertedImageUrl) return;
    triggerDownload(
      convertedImageUrl, 
      `extracted-image-${Date.now()}.${convertTargetFormat}`, 
      `image/${convertTargetFormat}`
    );
  };

  // Download raw decoded image without requiring extra conversion step
  const handleDownloadDirectDecodedImage = (format: 'png' | 'jpeg' | 'webp' = 'png', customSrc?: string) => {
    const src = customSrc || decodedResult?.dataUrl || decodedResult?.raw || extractedCenterImage;
    if (!src) return;

    if (format === 'png' && src.startsWith('data:image/png')) {
      triggerDownload(src, `extracted-image-${Date.now()}.png`, 'image/png');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0);
          const mime = `image/${format}`;
          const dataUrl = canvas.toDataURL(mime, 0.95);
          triggerDownload(dataUrl, `extracted-image-${Date.now()}.${format}`, mime);
        } else {
          triggerDownload(src, `extracted-image-${Date.now()}.png`, 'image/png');
        }
      } catch {
        triggerDownload(src, `extracted-image-${Date.now()}.png`, 'image/png');
      }
    };
    img.onerror = () => {
      triggerDownload(src, `extracted-image-${Date.now()}.png`, 'image/png');
    };
    img.src = src;
  };

  // Download Base64 Data as a text file (.txt)
  const handleDownloadBase64Text = (base64String: string, filename = `image-base64-${Date.now()}.txt`) => {
    const blob = new Blob([base64String], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename, 'text/plain');
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  };

  // Copy Base64 string to clipboard
  const handleCopyBase64 = async (base64String: string) => {
    try {
      await navigator.clipboard.writeText(base64String);
      setCopiedNotification('Base64 data copied to clipboard!');
      setTimeout(() => setCopiedNotification(null), 2500);
      playAnimeSparkleSound();
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/30">
              Universal Studio
            </span>
            <span className="text-xs text-slate-400 font-mono">Generate • Decode • Convert</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-pink-400" />
            <span>QR Code Forge & Media Converter</span>
          </h2>
          <p className="text-sm text-slate-400">
            Create high-res QR codes for Links, Text, Images, GIFs, Wi-Fi, and Contacts, or scan & convert any QR code back into images, links, or text.
          </p>
        </div>

        {/* Studio Mode Selector (Generate vs Scan & Convert) */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              setActiveTab('generator');
              stopCameraScanner();
              playAnimeSparkleSound();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Generate QR</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('scanner');
              playAnimeSparkleSound();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>Scan & Convert QR</span>
          </button>
        </div>
      </div>

      {copiedNotification && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* ================= 1. QR CODE GENERATOR ================= */}
      {/* ======================================================== */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Data Input & Configuration */}
          <div className="lg:col-span-7 space-y-6">
            {/* Payload Type Selector Chips */}
            <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Choose Content Type
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[
                  { id: 'url', label: 'Web Link', icon: Link, color: 'text-cyan-400' },
                  { id: 'text', label: 'Plain Text', icon: FileText, color: 'text-pink-400' },
                  { id: 'image', label: 'Image to QR', icon: ImageIcon, color: 'text-purple-400' },
                  { id: 'gif', label: 'GIF to QR', icon: Film, color: 'text-amber-400' },
                  { id: 'wifi', label: 'Wi-Fi Network', icon: Wifi, color: 'text-emerald-400' },
                  { id: 'vcard', label: 'Contact Card', icon: User, color: 'text-blue-400' },
                  { id: 'email', label: 'Email Address', icon: Mail, color: 'text-rose-400' },
                  { id: 'phone', label: 'Phone Call', icon: Phone, color: 'text-indigo-400' },
                  { id: 'sms', label: 'SMS Message', icon: MessageSquare, color: 'text-teal-400' },
                  { id: 'geo', label: 'Map Location', icon: MapPin, color: 'text-orange-400' },
                  { id: 'crypto', label: 'Crypto Wallet', icon: Coins, color: 'text-yellow-400' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = genType === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setGenType(item.id as GenType);
                        playAnimeSparkleSound();
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-pink-500/20 border-pink-500/50 text-white shadow-md shadow-pink-500/10'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1 ${item.color}`} />
                      <span className="text-[11px] font-semibold truncate w-full">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Input Form for Selected Type */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
              {/* 1. URL */}
              {genType === 'url' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Website or App URL</label>
                  <div className="relative">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-pink-500 text-sm text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Scanning this QR code on any phone will open this website instantly in the default browser.
                  </p>
                </div>
              )}

              {/* 2. Text */}
              {genType === 'text' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Text Message or Note</label>
                  <textarea
                    rows={4}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter any note, code, or secret message..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-pink-500 text-sm text-white placeholder-slate-600 focus:outline-none"
                  />
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>Characters: {textInput.length}</span>
                    <span>Words: {textInput.trim() ? textInput.trim().split(/\s+/).length : 0}</span>
                  </div>
                </div>
              )}

              {/* 3. Image to QR */}
              {genType === 'image' && (
                <div className="space-y-4">
                  {/* Mode switcher: Full Offline QR vs Full Image Link QR */}
                  <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <button
                      onClick={() => setImageMode('dataUri')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        imageMode === 'dataUri' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Full QR Code (Offline Image)</span>
                    </button>
                    <button
                      onClick={() => setImageMode('url')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        imageMode === 'url' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Link className="w-3.5 h-3.5" />
                      <span>Full QR Code (Image URL)</span>
                    </button>
                  </div>

                  {imageMode === 'url' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300">Direct Image Link (URL)</label>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-example.jpg"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-[11px] text-slate-500">
                        Generates a full QR barcode linking directly to your high-resolution image file.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-300">Upload Image to Store in QR Barcode</label>
                      <label className="border-2 border-dashed border-purple-800/60 hover:border-purple-500 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/50 hover:bg-slate-900/60 transition">
                        <ImageIcon className="w-8 h-8 text-purple-400" />
                        <span className="text-xs font-medium text-slate-300">
                          {imageFileName ? `Selected: ${imageFileName}` : 'Click to select photo or drop image here'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          PNG, JPG, WebP, GIF • Auto-optimized to fit inside pure QR code
                        </span>
                        <input type="file" accept="image/*" onChange={handleImageToQrUpload} className="hidden" />
                      </label>

                      {uploadedImageSrc && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <img src={uploadedImageSrc} alt="Uploaded" className="w-12 h-12 object-cover rounded-lg border border-purple-800/60 shadow" />
                          <div className="text-xs space-y-0.5 flex-1">
                            <span className="font-semibold text-white">Image Loaded</span>
                            {isCompressingImage ? (
                              <p className="text-[11px] text-amber-400 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Optimizing photo to fit into full QR code...</span>
                              </p>
                            ) : compressedImageForQr ? (
                              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>Ready: {compressedImageBytes.toLocaleString()} bytes encoded into full QR code!</span>
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400">Ready to encode.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. GIF to QR */}
              {genType === 'gif' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <button
                      onClick={() => setGifMode('url')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        gifMode === 'url' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Link className="w-3.5 h-3.5" />
                      <span>Full QR Code (GIF URL)</span>
                    </button>
                    <button
                      onClick={() => setGifMode('centerBadge')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        gifMode === 'centerBadge' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Center Animated Badge (Optional)</span>
                    </button>
                  </div>

                  {gifMode === 'url' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300">Animated GIF Web Link (URL)</label>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://media.giphy.com/media/.../giphy.gif"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[11px] text-slate-500">
                        Generates a full QR barcode linking directly to your animated GIF.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-300">Target Web Link</label>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://mywebsite.com"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                      />
                      <label className="text-xs font-bold text-slate-300">Upload GIF File (.gif)</label>
                      <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/40 hover:bg-slate-900/60 transition">
                        <Film className="w-8 h-8 text-amber-400" />
                        <span className="text-xs font-medium text-slate-300">
                          {gifFileName ? `Selected: ${gifFileName}` : 'Click to browse or drop animated GIF'}
                        </span>
                        <input type="file" accept="image/gif" onChange={handleGifToQrUpload} className="hidden" />
                      </label>
                    </div>
                  )}

                  {uploadedGifSrc && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <img src={uploadedGifSrc} alt="GIF" className="w-12 h-12 object-cover rounded-lg border border-slate-700" />
                      <div className="text-xs">
                        <span className="font-semibold text-white">GIF Badge Active</span>
                        <p className="text-[11px] text-slate-400">Centered in QR code with High error tolerance.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Wi-Fi */}
              {genType === 'wifi' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300">Network Name (SSID)</label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="MyHomeWiFi"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300">Password</label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        placeholder="Network password"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-bold text-slate-300">Security Type</label>
                      <select
                        value={wifiSecurity}
                        onChange={(e) => setWifiSecurity(e.target.value as any)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                      >
                        <option value="WPA">WPA / WPA2 / WPA3</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">Open (No Password)</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wifiHidden}
                          onChange={(e) => setWifiHidden(e.target.checked)}
                          className="rounded text-emerald-500 focus:ring-0"
                        />
                        <span>Hidden Network</span>
                      </label>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-400/90 pt-1">
                    ✨ Anyone scanning this code with iOS or Android camera will join this Wi-Fi network instantly without typing the password!
                  </p>
                </div>
              )}

              {/* 6. vCard Contact */}
              {genType === 'vcard' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300">Full Name</label>
                      <input
                        type="text"
                        value={vcardName}
                        onChange={(e) => setVcardName(e.target.value)}
                        placeholder="Ashiq Ali"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300">Phone Number</label>
                      <input
                        type="tel"
                        value={vcardPhone}
                        onChange={(e) => setVcardPhone(e.target.value)}
                        placeholder="+1 555 123 4567"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300">Email Address</label>
                      <input
                        type="email"
                        value={vcardEmail}
                        onChange={(e) => setVcardEmail(e.target.value)}
                        placeholder="contact@example.com"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300">Company / Organization</label>
                      <input
                        type="text"
                        value={vcardOrg}
                        onChange={(e) => setVcardOrg(e.target.value)}
                        placeholder="Company Name"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300">Job Title</label>
                    <input
                      type="text"
                      value={vcardTitle}
                      onChange={(e) => setVcardTitle(e.target.value)}
                      placeholder="Product Lead"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-blue-400/90">
                    Scanning automatically prompts phones to "Add to Contacts".
                  </p>
                </div>
              )}

              {/* 7. Email */}
              {genType === 'email' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300">Recipient Email</label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="support@example.com"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300">Subject</label>
                    <input
                      type="text"
                      value={emailSub}
                      onChange={(e) => setEmailSub(e.target.value)}
                      placeholder="Feedback / Inquiry"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300">Pre-filled Message Body</label>
                    <textarea
                      rows={2}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Hi team, I would like to..."
                      className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 8. Phone */}
              {genType === 'phone' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Phone Number to Call</label>
                  <input
                    type="tel"
                    value={phoneNum}
                    onChange={(e) => setPhoneNum(e.target.value)}
                    placeholder="+1 555 987 6543"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">Scanning dials this number directly in the phone dialer.</p>
                </div>
              )}

              {/* 9. SMS */}
              {genType === 'sms' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300">SMS Recipient Number</label>
                    <input
                      type="tel"
                      value={smsNum}
                      onChange={(e) => setSmsNum(e.target.value)}
                      placeholder="+1 555 987 6543"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300">Pre-filled SMS Message</label>
                    <textarea
                      rows={2}
                      value={smsMsg}
                      onChange={(e) => setSmsMsg(e.target.value)}
                      placeholder="Hello, I am interested in..."
                      className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 10. Geo */}
              {genType === 'geo' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">GPS Coordinates (Latitude, Longitude)</label>
                  <input
                    type="text"
                    value={geoCoords}
                    onChange={(e) => setGeoCoords(e.target.value)}
                    placeholder="37.7749,-122.4194"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">Opens in Google Maps or Apple Maps directly.</p>
                </div>
              )}

              {/* 11. Crypto */}
              {genType === 'crypto' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300">Coin</label>
                      <select
                        value={cryptoCoin}
                        onChange={(e) => setCryptoCoin(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                      >
                        <option value="bitcoin">Bitcoin (BTC)</option>
                        <option value="ethereum">Ethereum (ETH)</option>
                        <option value="solana">Solana (SOL)</option>
                        <option value="litecoin">Litecoin (LTC)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300">Wallet Address</label>
                      <input
                        type="text"
                        value={cryptoAddress}
                        onChange={(e) => setCryptoAddress(e.target.value)}
                        placeholder="Wallet address"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Styling & Customization Studio */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Sliders className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Visual Styling & Center Logo
                </span>
              </div>

              {/* Color Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">Quick Palette Presets</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { name: 'Classic Dark', dark: '#0f172a', light: '#ffffff' },
                    { name: 'Neon Cyber', dark: '#06b6d4', light: '#090d16' },
                    { name: 'Sakura Pink', dark: '#ec4899', light: '#ffffff' },
                    { name: 'Sunset Crimson', dark: '#f43f5e', light: '#1c1917' },
                    { name: 'Emerald Code', dark: '#10b981', light: '#022c22' },
                    { name: 'Deep Violet', dark: '#8b5cf6', light: '#0f172a' },
                  ].map((p) => (
                    <button
                      key={p.name}
                      onClick={() => {
                        setQrColorDark(p.dark);
                        setQrColorLight(p.light);
                        playAnimeSparkleSound();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.dark }} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Foreground Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={qrColorDark}
                      onChange={(e) => setQrColorDark(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={qrColorDark}
                      onChange={(e) => setQrColorDark(e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Background Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={qrColorLight}
                      onChange={(e) => setQrColorLight(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={qrColorLight}
                      onChange={(e) => setQrColorLight(e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Center Logo Upload (Opt-in toggle) */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="toggle-center-logo"
                      checked={enableCenterLogo}
                      onChange={(e) => {
                        setEnableCenterLogo(e.target.checked);
                        if (e.target.checked) setEcLevel('H');
                      }}
                      className="w-4 h-4 rounded text-pink-600 accent-pink-500 cursor-pointer"
                    />
                    <label htmlFor="toggle-center-logo" className="text-xs font-semibold text-slate-300 cursor-pointer">
                      Overlay Center Logo Badge (Optional)
                    </label>
                  </div>
                  {!enableCenterLogo && (
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                      Full QR Code Active
                    </span>
                  )}
                  {enableCenterLogo && centerLogoSrc && (
                    <button
                      onClick={() => {
                        setCenterLogoSrc('');
                        setEnableCenterLogo(false);
                      }}
                      className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>

                {enableCenterLogo && (
                  <div className="space-y-2 pl-6 pt-1">
                    <p className="text-[11px] text-slate-400">
                      Upload an icon or small photo to stamp in the center of the QR barcode.
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-pink-500/40 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-pink-400" />
                        <span>Upload Logo / Photo</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {centerLogoSrc && (
                        <div className="flex items-center gap-2">
                          <img src={centerLogoSrc} alt="Logo" className="w-8 h-8 rounded-md object-cover border border-slate-700" />
                          <span className="text-[11px] text-slate-400">High Error Correction (H) Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Padding & Margin Slider */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Quiet Zone Margin: {qrMargin} blocks</span>
                  <span>Correction Level: {ecLevel}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={qrMargin}
                  onChange={(e) => setQrMargin(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live QR Preview & Actions */}
          <div className="lg:col-span-5 space-y-5 sticky top-20">
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col items-center text-center relative overflow-hidden shadow-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-4">
                Real-Time QR Preview
              </span>

              {/* QR Code Canvas Frame */}
              <div 
                className="p-5 rounded-3xl shadow-2xl border transition duration-300 max-w-[320px] w-full aspect-square flex items-center justify-center relative overflow-hidden"
                style={{ 
                  backgroundColor: qrColorLight,
                  borderColor: qrColorDark === '#ffffff' ? '#334155' : 'transparent' 
                }}
              >
                {qrError ? (
                  <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-rose-950/80 rounded-2xl border border-rose-500/40 text-rose-200">
                    <AlertCircle className="w-8 h-8 text-rose-400 mb-2 shrink-0" />
                    <span className="text-xs font-bold text-white mb-1">Capacity Limit Exceeded</span>
                    <p className="text-[11px] text-rose-200/90 leading-relaxed mb-3 line-clamp-4">
                      {qrError}
                    </p>
                    {genType === 'image' && (
                      <button
                        onClick={() => setImageMode('centerLogo')}
                        className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-bold shadow-md cursor-pointer transition"
                      >
                        Switch to Center Logo Mode
                      </button>
                    )}
                  </div>
                ) : generatedQrDataUrl ? (
                  <img
                    src={generatedQrDataUrl}
                    alt="Generated QR Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : !computePayloadString().text ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center">
                    <QrCode className="w-12 h-12 text-slate-600 mb-1 stroke-[1.5]" />
                    <span className="text-xs font-bold text-slate-400">No QR Code Generated Yet</span>
                    <p className="text-[11px] text-slate-500 max-w-[200px]">
                      Enter a URL, text, or upload an image on the left to generate your QR barcode.
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                    <RefreshCw className="w-8 h-8 animate-spin text-pink-500" />
                    <span className="text-xs">Rendering QR Code...</span>
                  </div>
                )}
              </div>

              {/* Real-time Payload Capacity Meter */}
              <div className="w-full mt-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">QR Capacity Usage:</span>
                  <span className={`font-mono font-bold ${
                    payloadByteCount > 2953 
                      ? 'text-rose-400' 
                      : payloadByteCount > 2000 
                        ? 'text-amber-400' 
                        : 'text-emerald-400'
                  }`}>
                    {payloadByteCount.toLocaleString()} / 2,953 bytes
                  </span>
                </div>
                <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      payloadByteCount > 2953 
                        ? 'bg-rose-500' 
                        : payloadByteCount > 2000 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (payloadByteCount / 2953) * 100)}%` }}
                  />
                </div>
                {payloadByteCount > 2000 && payloadByteCount <= 2953 && (
                  <p className="text-[10px] text-amber-400/90">
                    High data density: Using maximum grid density to fit payload.
                  </p>
                )}
              </div>

              {/* Download & Copy Buttons */}
              <div className="w-full grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={handleDownloadPng}
                  disabled={!generatedQrDataUrl || !!qrError}
                  className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-pink-600/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG</span>
                </button>

                <button
                  onClick={handleDownloadSvg}
                  disabled={!generatedQrDataUrl || !!qrError}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/40 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Download SVG</span>
                </button>
              </div>

              <button
                onClick={handleCopyQrImage}
                disabled={!generatedQrDataUrl || !!qrError}
                className="w-full mt-3 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Copy className="w-4 h-4 text-pink-400" />
                <span>Copy QR Image to Clipboard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ============ 2. SCANNER & MEDIA CONVERTER ============== */}
      {/* ======================================================== */}
      {activeTab === 'scanner' && (
        <div className="space-y-6">
          {/* Top Scanner Upload / Camera Switcher */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Upload Area */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                <span>Upload QR Image / GIF</span>
              </span>

              <label 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleScanUpload}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 transition min-h-[160px]"
              >
                <Scan className="w-10 h-10 text-indigo-400 animate-pulse" />
                <span className="text-xs font-semibold text-white">Select or Drop any QR Image or GIF</span>
                <span className="text-[11px] text-slate-400">Supports PNG, JPG, WebP, GIF, SVG</span>
                <input type="file" accept="image/*" onChange={handleScanUpload} className="hidden" />
              </label>
            </div>

            {/* Live Camera Scanner */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  <span>Scan via Phone / Web Camera</span>
                </span>
                {isScanningCamera ? (
                  <button
                    onClick={stopCameraScanner}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Stop Camera</span>
                  </button>
                ) : (
                  <button
                    onClick={startCameraScanner}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Camera</span>
                  </button>
                )}
              </div>

              {/* Camera Video Viewport */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[160px] flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isScanningCamera ? 'block' : 'hidden'}`}
                />
                {!isScanningCamera && (
                  <div className="flex flex-col items-center gap-2 text-slate-500 p-4 text-center">
                    <Camera className="w-8 h-8 opacity-40" />
                    <span className="text-xs">Camera is inactive. Tap "Start Camera" to scan live.</span>
                  </div>
                )}
                {isScanningCamera && (
                  <div className="absolute inset-0 border-2 border-indigo-400/60 rounded-2xl pointer-events-none flex items-center justify-center">
                    <div className="w-44 h-44 border-2 border-pink-400 rounded-xl animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {scanError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Uploaded QR Code Status */}
          {scanFilePreview && (
            <div className="glass-panel rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <img
                  src={scanFilePreview}
                  alt="Scanned QR Code"
                  className="w-12 h-12 rounded-xl object-contain bg-white/5 p-1 border border-slate-700 shadow"
                />
                <div>
                  <span className="text-xs font-bold text-white block">QR Code Uploaded</span>
                  <span className="text-[11px] text-slate-400">Scanned & decoded below. Extracted media available for direct download.</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setScanFilePreview(null);
                  setDecodedResult(null);
                  setExtractedCenterImage(null);
                  setConvertedImageUrl(null);
                  setScanError(null);
                }}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Extracted Center Image / Photo Found in QR */}
          {extractedCenterImage && (
            <div className="glass-panel rounded-2xl p-6 border border-pink-500/40 bg-gradient-to-r from-pink-950/30 via-slate-900 to-purple-950/30 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-pink-500/20">
                <div className="flex items-center gap-2 text-pink-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Extracted Photo / Logo from Center of QR Code
                  </span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono">
                  Center Image Extracted
                </span>
              </div>

              {/* Big Size Image View */}
              <div className="w-full flex items-center justify-center p-4 bg-black/60 rounded-2xl border border-pink-500/30 max-h-[500px] overflow-auto">
                <img
                  src={extractedCenterImage}
                  alt="Extracted Center Photo"
                  className="max-h-[460px] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                />
              </div>

              {/* Image Controls & Downloads */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 mr-1">Quick 1-Tap Download:</span>
                  <button
                    onClick={() => triggerDownload(extractedCenterImage, `extracted-photo-${Date.now()}.png`, 'image/png')}
                    className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-pink-600/25"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>
                  <button
                    onClick={() => handleDownloadDirectDecodedImage('jpeg', extractedCenterImage)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download JPG</span>
                  </button>
                  <button
                    onClick={() => handleDownloadDirectDecodedImage('webp', extractedCenterImage)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Download WebP</span>
                  </button>
                </div>

                {/* Base64 Data Box for Center Photo */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-pink-400" />
                      <span className="text-xs font-bold text-slate-300">Base64 Data (Center Image):</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                        {extractedCenterImage.length.toLocaleString()} characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyBase64(extractedCenterImage)}
                        className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-pink-600/20"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Base64 Data</span>
                      </button>
                      <button
                        onClick={() => handleDownloadBase64Text(extractedCenterImage, `extracted-photo-base64-${Date.now()}.txt`)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <Download className="w-3.5 h-3.5 text-pink-400" />
                        <span>Download Base64 (.txt)</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    rows={3}
                    value={extractedCenterImage}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-pink-300/90 focus:outline-none select-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Decoded QR Content & Converter Card */}
          {decodedResult && (
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6 animate-fadeIn">
              {/* Header result bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500/20 to-indigo-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                        {decodedResult.type.toUpperCase()}
                      </span>
                      <h3 className="text-base font-bold text-white">{decodedResult.title}</h3>
                    </div>
                    {decodedResult.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{decodedResult.description}</p>
                    )}
                  </div>
                </div>

                {/* Quick Copy / Action */}
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(decodedResult.raw);
                    setCopiedNotification('Raw payload copied to clipboard!');
                    setTimeout(() => setCopiedNotification(null), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-pink-500/40 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                >
                  <Copy className="w-3.5 h-3.5 text-pink-400" />
                  <span>Copy Raw Data</span>
                </button>
              </div>

              {/* SPECIFIC PAYLOAD INTERFACES */}

              {/* A. If Decoded Content is an Image or Animated GIF */}
              {(decodedResult.type === 'image' || decodedResult.type === 'gif' || decodedResult.dataUrl) && (
                <div className="space-y-5 p-6 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-purple-400" />
                      <span className="text-sm font-bold text-white">
                        Extracted {decodedResult.type === 'gif' ? 'Animated GIF' : 'Image'} from QR Code
                      </span>
                    </div>
                    <span className="text-[11px] px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-mono font-semibold border border-purple-500/30">
                      Full Resolution Image
                    </span>
                  </div>

                  {/* Big Size Image View */}
                  <div className="w-full rounded-2xl overflow-hidden border border-purple-500/30 bg-black/70 shadow-2xl p-4 flex flex-col items-center justify-center">
                    <img
                      src={decodedResult.dataUrl || decodedResult.raw}
                      alt="Decoded QR payload"
                      className="max-h-[520px] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                    />
                  </div>

                  {/* Image Converter Controls & Downloads */}
                  <div className="space-y-4 w-full">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-300">Quick 1-Tap Download (Extracted Image):</span>
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          onClick={() => handleDownloadDirectDecodedImage('png')}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Image (PNG)</span>
                        </button>
                        <button
                          onClick={() => handleDownloadDirectDecodedImage('jpeg')}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>Download JPG</span>
                        </button>
                        <button
                          onClick={() => handleDownloadDirectDecodedImage('webp')}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Download WebP</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 space-y-3">
                      <p className="text-xs text-slate-400">
                        Or convert image to custom format and compression quality:
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => {
                              setConvertTargetFormat(fmt);
                              setConvertedImageUrl(null);
                            }}
                            className={`py-2 rounded-xl text-xs font-bold uppercase border transition cursor-pointer ${
                              convertTargetFormat === fmt
                                ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            To {fmt}
                          </button>
                        ))}
                      </div>

                      {/* Quality Slider */}
                      {convertTargetFormat !== 'png' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Compression Quality: {convertQuality}%</span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            value={convertQuality}
                            onChange={(e) => {
                              setConvertQuality(Number(e.target.value));
                              setConvertedImageUrl(null);
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleConvertDecodedImage}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Convert Image</span>
                        </button>

                        {convertedImageUrl && (
                          <button
                            onClick={handleDownloadConvertedImage}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download {convertTargetFormat.toUpperCase()} ({convertedSize ? formatBytes(convertedSize) : ''})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Base64 Data & Export Section */}
                    <div className="space-y-2 pt-3 border-t border-slate-800/80">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold text-slate-300">Base64 Image Data:</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                            {(decodedResult.dataUrl || decodedResult.raw).length.toLocaleString()} characters
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyBase64(decodedResult.dataUrl || decodedResult.raw)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Base64 Data</span>
                          </button>
                          <button
                            onClick={() => handleDownloadBase64Text(decodedResult.dataUrl || decodedResult.raw)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                          >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Download Base64 (.txt)</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        readOnly
                        rows={4}
                        value={decodedResult.dataUrl || decodedResult.raw}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300/90 focus:outline-none leading-relaxed select-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* B. If Decoded Content is a Web Link */}
              {decodedResult.type === 'url' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-xs text-slate-400 font-semibold">Web Address:</span>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-cyan-300 break-all">{decodedResult.raw}</span>
                    <a
                      href={decodedResult.raw}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Link</span>
                    </a>
                  </div>
                </div>
              )}

              {/* C. If Decoded Content is Wi-Fi Network */}
              {decodedResult.type === 'wifi' && decodedResult.meta && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Wifi className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Wi-Fi Credentials Found</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Network Name (SSID):</span>
                      <p className="font-bold text-white text-sm mt-0.5">{decodedResult.meta.SSID}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400">Password:</span>
                        <p className="font-bold text-white text-sm mt-0.5 font-mono">
                          {decodedResult.meta.Password || '<Open Network>'}
                        </p>
                      </div>
                      {decodedResult.meta.Password && (
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(decodedResult.meta!.Password);
                            setCopiedNotification('Wi-Fi Password copied!');
                            setTimeout(() => setCopiedNotification(null), 2000);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* D. If Decoded Content is vCard */}
              {decodedResult.type === 'vcard' && decodedResult.meta && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <User className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Contact Card Information</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {Object.entries(decodedResult.meta).map(([k, v]) => (
                      <div key={k} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">{k}:</span>
                        <p className="font-semibold text-white mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* E. If Decoded Content is JSON */}
              {decodedResult.type === 'json' && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Valid JSON Payload Detected
                    </span>
                    {onNavigateToJsonFormatter && (
                      <button
                        onClick={onNavigateToJsonFormatter}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                      >
                        Open in JSON Formatter
                      </button>
                    )}
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-48">
                    {JSON.stringify(JSON.parse(decodedResult.raw), null, 2)}
                  </pre>
                </div>
              )}

              {/* F. Raw Output text container */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">Raw Decoded String:</span>
                <textarea
                  readOnly
                  rows={4}
                  value={decodedResult.raw}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Download Success & File Saved Notification */}
      {Boolean(downloadNotification?.show) && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-400">{downloadNotification.title}</h4>
                <button
                  onClick={() => setDownloadNotification({ show: false, title: '', filename: '', previewUrl: null })}
                  className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-200 font-mono truncate mt-0.5">{downloadNotification.filename}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Saved directly to your downloads folder.</p>
              
              {downloadNotification.previewUrl && (
                <div className="mt-2.5 flex items-center gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <img
                    src={downloadNotification.previewUrl}
                    alt="Downloaded item"
                    className="w-10 h-10 object-contain rounded-lg border border-slate-700 bg-white/5"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-slate-300 block truncate">Image File Ready</span>
                    <a
                      href={downloadNotification.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Preview</span>
                    </a>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-amber-300/90 mt-2 bg-amber-950/40 p-1.5 rounded-lg border border-amber-800/40">
                📱 Tip: If your mobile browser blocked auto-download, tap & hold the image to save directly to Gallery!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
