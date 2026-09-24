import QRCode from 'qrcode';
import jsQR from 'jsqr';

export type QrPayloadType = 
  | 'url' 
  | 'text' 
  | 'image' 
  | 'gif' 
  | 'wifi' 
  | 'vcard' 
  | 'email' 
  | 'phone' 
  | 'sms' 
  | 'geo' 
  | 'crypto' 
  | 'json';

export interface DecodedQrResult {
  raw: string;
  type: QrPayloadType;
  title: string;
  description?: string;
  dataUrl?: string; // If image or gif
  meta?: Record<string, string>;
}

/**
 * Downscale and compress an image Data URL to fit within QR code binary capacity (< 2.2 KB)
 */
export async function compressImageToFitQr(
  dataUrl: string,
  targetByteLimit = 2200
): Promise<{ dataUrl: string; bytes: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve({ dataUrl, bytes: dataUrl.length, width: img.width, height: img.height });
      }

      // Try progressively smaller dimensions (48 down to 16) and qualities
      const sizes = [48, 40, 32, 28, 24, 20, 16];
      let bestCandidate = '';
      let bestBytes = Infinity;
      let finalW = 32;
      let finalH = 32;

      for (const size of sizes) {
        // Calculate aspect-preserving dimensions within size x size
        let w = size;
        let h = size;
        if (img.width > img.height) {
          h = Math.max(12, Math.round((size * img.height) / img.width));
        } else {
          w = Math.max(12, Math.round((size * img.width) / img.height));
        }

        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        for (const q of [0.75, 0.6, 0.45, 0.3]) {
          // Try webp first (most compact)
          let candidate = canvas.toDataURL('image/webp', q);
          if (candidate.length <= targetByteLimit) {
            return resolve({
              dataUrl: candidate,
              bytes: candidate.length,
              width: w,
              height: h,
            });
          }

          // Also try jpeg
          const jpegCandidate = canvas.toDataURL('image/jpeg', q);
          if (jpegCandidate.length <= targetByteLimit) {
            return resolve({
              dataUrl: jpegCandidate,
              bytes: jpegCandidate.length,
              width: w,
              height: h,
            });
          }

          if (candidate.length < bestBytes) {
            bestBytes = candidate.length;
            bestCandidate = candidate;
            finalW = w;
            finalH = h;
          }
        }
      }

      resolve({
        dataUrl: bestCandidate || dataUrl,
        bytes: bestBytes === Infinity ? dataUrl.length : bestBytes,
        width: finalW,
        height: finalH,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}

/**
 * Generate a QR code as a PNG Data URL with optional center logo/image/gif overlay
 */
export async function generateQrDataUrl(
  text: string,
  options: {
    colorDark?: string;
    colorLight?: string;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    logoDataUrl?: string;
    logoSizePercent?: number; // default 22%
  } = {}
): Promise<string> {
  const {
    colorDark = '#000000',
    colorLight = '#ffffff',
    errorCorrectionLevel = options.logoDataUrl ? 'H' : 'M',
    margin = 2,
    width = 600,
    logoDataUrl,
    logoSizePercent = 22,
  } = options;

  // Check payload size
  const payloadBytes = new Blob([text]).size;
  if (payloadBytes > 2953) {
    throw new Error(
      `The amount of data is too big to be stored in a QR Code (${payloadBytes.toLocaleString()} bytes). Maximum QR Code capacity is 2,953 bytes.`
    );
  }

  // Render QR code to off-screen canvas with automatic fallback to lower EC levels if data is large
  const canvas = document.createElement('canvas');
  const ecHierarchy: ('H' | 'Q' | 'M' | 'L')[] = ['H', 'Q', 'M', 'L'];
  const startIndex = ecHierarchy.indexOf(errorCorrectionLevel);
  const levelsToTry = ecHierarchy.slice(startIndex);

  let renderSucceeded = false;
  let lastError: any = null;

  for (const ec of levelsToTry) {
    try {
      await QRCode.toCanvas(canvas, text, {
        errorCorrectionLevel: ec,
        margin,
        width,
        color: {
          dark: colorDark,
          light: colorLight,
        },
      });
      renderSucceeded = true;
      break;
    } catch (err: any) {
      lastError = err;
      if (err?.message?.includes('too big')) {
        continue; // Try next lower error correction level
      }
      throw err;
    }
  }

  if (!renderSucceeded) {
    throw lastError || new Error('The amount of data is too big to be stored in a QR Code');
  }

  // If a center logo is provided, draw it with padding and rounded background
  if (logoDataUrl) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const logoSize = (width * logoSizePercent) / 100;
          const x = (width - logoSize) / 2;
          const y = (width - logoSize) / 2;
          const padding = 6;
          const totalSize = logoSize + padding * 2;
          const bgX = (width - totalSize) / 2;
          const bgY = (width - totalSize) / 2;
          const radius = 12;

          // Draw rounded background behind logo so it stands out cleanly
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, totalSize, totalSize, radius);
          ctx.fillStyle = colorLight;
          ctx.shadowColor = 'rgba(0,0,0,0.25)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;
          ctx.fill();
          ctx.restore();

          // Clip rounded rectangle for the logo itself
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, logoSize, logoSize, 8);
          ctx.clip();
          ctx.drawImage(img, x, y, logoSize, logoSize);
          ctx.restore();

          resolve();
        };
        img.onerror = () => {
          resolve(); // Resolve anyway if logo fails
        };
        img.src = logoDataUrl;
      });
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generate a QR code as an SVG string
 */
export async function generateQrSvg(
  text: string,
  options: {
    colorDark?: string;
    colorLight?: string;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
  } = {}
): Promise<string> {
  const {
    colorDark = '#000000',
    colorLight = '#ffffff',
    errorCorrectionLevel = 'M',
    margin = 2,
  } = options;

  const ecHierarchy: ('H' | 'Q' | 'M' | 'L')[] = ['H', 'Q', 'M', 'L'];
  const startIndex = ecHierarchy.indexOf(errorCorrectionLevel);
  const levelsToTry = ecHierarchy.slice(startIndex);

  let lastError: any = null;
  for (const ec of levelsToTry) {
    try {
      return await QRCode.toString(text, {
        type: 'svg',
        errorCorrectionLevel: ec,
        margin,
        color: {
          dark: colorDark,
          light: colorLight,
        },
      });
    } catch (err: any) {
      lastError = err;
      if (err?.message?.includes('too big')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('The amount of data is too big to be stored in a QR Code');
}

/**
 * Decode a QR code from an image element or image file
 */
export async function decodeQrFromImage(imageSource: HTMLImageElement | File | Blob): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let img: HTMLImageElement;
    let cleanup = () => {};

    if (imageSource instanceof HTMLImageElement) {
      img = imageSource;
    } else {
      img = new Image();
      const objectUrl = URL.createObjectURL(imageSource);
      img.src = objectUrl;
      cleanup = () => URL.revokeObjectURL(objectUrl);
    }

    const processImage = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        cleanup();
        if (code) {
          resolve(code.data);
        } else {
          resolve(null);
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    if (img.complete && (img.naturalWidth || img.width)) {
      processImage();
    } else {
      img.onload = () => processImage();
      img.onerror = () => {
        cleanup();
        resolve(null);
      };
    }
  });
}

/**
 * Inspect raw string to identify its type and payload data
 */
export function analyzeQrPayload(raw: string): DecodedQrResult {
  const trimmed = raw.trim();

  // 1. Check for Base64 Data URI Image or GIF
  if (trimmed.startsWith('data:image/gif') || (trimmed.startsWith('data:image/') && trimmed.includes('gif'))) {
    return {
      raw,
      type: 'gif',
      title: 'Decoded Animated GIF',
      description: 'Embedded GIF image data URI found in QR code.',
      dataUrl: trimmed,
    };
  }

  if (trimmed.startsWith('data:image/')) {
    return {
      raw,
      type: 'image',
      title: 'Decoded Image Data',
      description: 'Embedded Base64 Image found in QR code.',
      dataUrl: trimmed,
    };
  }

  // 1b. Check for raw Base64 image payload (without data: prefix)
  if (trimmed.startsWith('/9j/')) {
    return {
      raw,
      type: 'image',
      title: 'Decoded Base64 JPEG Image',
      description: 'Extracted Base64 JPEG image found inside QR barcode.',
      dataUrl: `data:image/jpeg;base64,${trimmed}`,
    };
  }
  if (trimmed.startsWith('iVBORw0KGgo')) {
    return {
      raw,
      type: 'image',
      title: 'Decoded Base64 PNG Image',
      description: 'Extracted Base64 PNG image found inside QR barcode.',
      dataUrl: `data:image/png;base64,${trimmed}`,
    };
  }
  if (trimmed.startsWith('R0lGOD')) {
    return {
      raw,
      type: 'gif',
      title: 'Decoded Base64 GIF Image',
      description: 'Extracted Base64 GIF image found inside QR barcode.',
      dataUrl: `data:image/gif;base64,${trimmed}`,
    };
  }
  if (trimmed.startsWith('UklGR')) {
    return {
      raw,
      type: 'image',
      title: 'Decoded Base64 WebP Image',
      description: 'Extracted Base64 WebP image found inside QR barcode.',
      dataUrl: `data:image/webp;base64,${trimmed}`,
    };
  }
  if (trimmed.startsWith('PHN2Zy') || trimmed.startsWith('PD94bWw')) {
    return {
      raw,
      type: 'image',
      title: 'Decoded Base64 SVG Image',
      description: 'Extracted Base64 SVG image found inside QR barcode.',
      dataUrl: `data:image/svg+xml;base64,${trimmed}`,
    };
  }

  // 2. Check for Direct Image / GIF URL
  if (/^https?:\/\/.*\.(gif)(\?.*)?$/i.test(trimmed)) {
    return {
      raw,
      type: 'gif',
      title: 'Online GIF Link',
      description: 'QR points directly to an animated GIF file.',
      dataUrl: trimmed,
    };
  }

  if (/^https?:\/\/.*\.(png|jpe?g|webp|svg|bmp|avif)(\?.*)?$/i.test(trimmed)) {
    return {
      raw,
      type: 'image',
      title: 'Online Image Link',
      description: 'QR points directly to an image asset.',
      dataUrl: trimmed,
    };
  }

  // 3. Wi-Fi network configuration: WIFI:S:MySSID;T:WPA;P:MyPassword;;
  if (trimmed.startsWith('WIFI:') || trimmed.startsWith('wifi:')) {
    const ssidMatch = trimmed.match(/S:([^;]+)/i);
    const passMatch = trimmed.match(/P:([^;]+)/i);
    const typeMatch = trimmed.match(/T:([^;]+)/i);
    const hiddenMatch = trimmed.match(/H:([^;]+)/i);

    const ssid = ssidMatch ? ssidMatch[1] : 'Unknown';
    const password = passMatch ? passMatch[1] : '';
    const security = typeMatch ? typeMatch[1] : 'WPA';

    return {
      raw,
      type: 'wifi',
      title: 'Wi-Fi Network Credentials',
      description: `SSID: ${ssid} (${security})`,
      meta: {
        SSID: ssid,
        Password: password,
        Security: security,
        Hidden: hiddenMatch && hiddenMatch[1] === 'true' ? 'Yes' : 'No',
      },
    };
  }

  // 4. vCard Contact: BEGIN:VCARD ... END:VCARD
  if (trimmed.includes('BEGIN:VCARD')) {
    const fnMatch = trimmed.match(/FN:([^\r\n]+)/i);
    const telMatch = trimmed.match(/TEL.*:([^\r\n]+)/i);
    const emailMatch = trimmed.match(/EMAIL.*:([^\r\n]+)/i);
    const orgMatch = trimmed.match(/ORG:([^\r\n]+)/i);
    const titleMatch = trimmed.match(/TITLE:([^\r\n]+)/i);

    const name = fnMatch ? fnMatch[1].trim() : 'Contact';
    const meta: Record<string, string> = { Name: name };
    if (telMatch) meta['Phone'] = telMatch[1].trim();
    if (emailMatch) meta['Email'] = emailMatch[1].trim();
    if (orgMatch) meta['Company'] = orgMatch[1].trim();
    if (titleMatch) meta['Title'] = titleMatch[1].trim();

    return {
      raw,
      type: 'vcard',
      title: `Contact: ${name}`,
      description: 'vCard business contact details.',
      meta,
    };
  }

  // 5. Email: mailto: or MATMSG:
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('MATMSG:')) {
    let email = '';
    let subject = '';
    let body = '';

    if (trimmed.startsWith('mailto:')) {
      const urlPart = trimmed.replace(/^mailto:/i, '');
      const [address, query] = urlPart.split('?');
      email = address || '';
      if (query) {
        const params = new URLSearchParams(query);
        subject = params.get('subject') || '';
        body = params.get('body') || '';
      }
    } else {
      const toMatch = trimmed.match(/TO:([^;]+)/i);
      const subMatch = trimmed.match(/SUB:([^;]+)/i);
      const bodyMatch = trimmed.match(/BODY:([^;]+)/i);
      email = toMatch ? toMatch[1] : '';
      subject = subMatch ? subMatch[1] : '';
      body = bodyMatch ? bodyMatch[1] : '';
    }

    return {
      raw,
      type: 'email',
      title: 'Email Address / Message',
      description: email,
      meta: {
        Recipient: email,
        Subject: subject,
        Message: body,
      },
    };
  }

  // 6. Phone Call: tel:
  if (trimmed.startsWith('tel:')) {
    const phone = trimmed.replace(/^tel:/i, '');
    return {
      raw,
      type: 'phone',
      title: 'Phone Number',
      description: phone,
      meta: { Phone: phone },
    };
  }

  // 7. SMS: smsto: or sms:
  if (trimmed.startsWith('smsto:') || trimmed.startsWith('sms:')) {
    const cleaned = trimmed.replace(/^(smsto:|sms:)/i, '');
    const parts = cleaned.split(':');
    const phone = parts[0] || '';
    const msg = parts.slice(1).join(':') || '';
    return {
      raw,
      type: 'sms',
      title: 'SMS Message',
      description: `To: ${phone}`,
      meta: { Phone: phone, Message: msg },
    };
  }

  // 8. Geo Coordinates: geo:lat,lng
  if (trimmed.startsWith('geo:')) {
    const coords = trimmed.replace(/^geo:/i, '').split('?')[0];
    return {
      raw,
      type: 'geo',
      title: 'Geographic Location',
      description: `Coordinates: ${coords}`,
      meta: { Coordinates: coords },
    };
  }

  // 9. Crypto: bitcoin:, ethereum:, etc.
  if (/^(bitcoin|ethereum|solana|litecoin):/i.test(trimmed)) {
    const [protocol, addressWithQuery] = trimmed.split(':');
    const [address] = addressWithQuery.split('?');
    return {
      raw,
      type: 'crypto',
      title: `${protocol.toUpperCase()} Address`,
      description: address,
      meta: { Coin: protocol.toUpperCase(), Address: address },
    };
  }

  // 10. JSON payload
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return {
        raw,
        type: 'json',
        title: 'JSON Data Object',
        description: 'Valid formatted JSON document.',
      };
    } catch {
      // not valid json, fall through
    }
  }

  // 11. Generic URL
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      raw,
      type: 'url',
      title: 'Web Link (URL)',
      description: trimmed,
    };
  }

  // 12. Plain Text
  return {
    raw,
    type: 'text',
    title: 'Plain Text Message',
    description: trimmed.slice(0, 80) + (trimmed.length > 80 ? '...' : ''),
  };
}

/**
 * Extract center badge/logo from an uploaded QR code image
 */
export async function extractCenterBadgeFromQr(
  imageSource: string,
  centerPercent = 28
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const minDim = Math.min(width, height);
        const size = Math.max(20, Math.round((minDim * centerPercent) / 100));
        const x = Math.round((width - size) / 2);
        const y = Math.round((height - size) / 2);

        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSource;
  });
}
