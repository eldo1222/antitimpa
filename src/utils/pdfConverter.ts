/**
 * Downloads Google Drive PDF directly via backend stream proxy
 * Bypasses restricted / view-only permission blocks.
 */
export async function downloadDrivePdf(
  driveUrlOrId: string, 
  title: string = 'komik-drive-document',
  onProgress?: (msg: string) => void
): Promise<boolean> {
  try {
    if (onProgress) onProgress('Menghubungkan ke server proxy Google Drive...');
    
    const params = new URLSearchParams();
    if (driveUrlOrId.startsWith('http') || driveUrlOrId.includes('/')) {
      params.append('url', driveUrlOrId);
    } else {
      params.append('fileId', driveUrlOrId);
    }
    params.append('title', title);

    let res = await fetch(`/api/drive/download-pdf?${params.toString()}`);
    if (!res.ok) {
      res = await fetch(`/.netlify/functions/drive-proxy?${params.toString()}`);
    }
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    if (onProgress) onProgress('Mengunduh stream PDF terenkripsi...');
    const blob = await res.blob();
    
    // Create download trigger
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${title.replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    if (onProgress) onProgress('Selesai! PDF berhasil diunduh.');
    return true;
  } catch (error: any) {
    console.error('Download drive PDF failed:', error);
    if (onProgress) onProgress(`Gagal: ${error.message}`);
    return false;
  }
}

interface ImagePageData {
  jpegBytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Pure Zero-Dependency PDF 1.4 Builder.
 * Converts JPEG binary image streams into fully-compliant multi-page PDF documents.
 * Eliminates external heavyweight polyfill libraries that cause window property collisions.
 */
function createPdfFromJpegs(pages: ImagePageData[]): Uint8Array {
  const chunks: (Uint8Array | string)[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;
  const encoder = new TextEncoder();

  function pushString(str: string) {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  function pushBytes(bytes: Uint8Array) {
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  // 1. PDF 1.4 Header with binary comment for binary stream preservation
  pushString('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  const pageCount = pages.length;
  // Obj 1: Catalog
  // Obj 2: Pages tree
  // For page i (0-indexed):
  //   Obj (3 + i*3): Page descriptor
  //   Obj (4 + i*3): Contents stream
  //   Obj (5 + i*3): Image XObject
  const totalObjects = 2 + pageCount * 3;

  // Obj 1: Catalog
  offsets[1] = currentOffset;
  pushString(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Obj 2: Pages Tree
  offsets[2] = currentOffset;
  const kidsStr = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  pushString(`2 0 obj\n<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${pageCount} >>\nendobj\n`);

  // For each page
  for (let i = 0; i < pageCount; i++) {
    const p = pages[i];
    const pageObjId = 3 + i * 3;
    const contentObjId = 4 + i * 3;
    const imageObjId = 5 + i * 3;

    // Page object
    offsets[pageObjId] = currentOffset;
    pushString(
      `${pageObjId} 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 ${p.width} ${p.height}]\n  /Resources <<\n    /ProcSet [/PDF /ImageC]\n    /XObject << /Im${i} ${imageObjId} 0 R >>\n  >>\n  /Contents ${contentObjId} 0 R\n>>\nendobj\n`
    );

    // Content stream: Scales and draws image at exact coordinates
    const contentStream = `q\n${p.width} 0 0 ${p.height} 0 0 cm\n/Im${i} Do\nQ\n`;
    const contentStreamBytes = encoder.encode(contentStream);
    offsets[contentObjId] = currentOffset;
    pushString(`${contentObjId} 0 obj\n<< /Length ${contentStreamBytes.length} >>\nstream\n`);
    pushBytes(contentStreamBytes);
    pushString(`\nendstream\nendobj\n`);

    // Image XObject with DCTDecode (native standard JPEG decoding)
    offsets[imageObjId] = currentOffset;
    pushString(
      `${imageObjId} 0 obj\n<<\n  /Type /XObject\n  /Subtype /Image\n  /Width ${p.width}\n  /Height ${p.height}\n  /ColorSpace /DeviceRGB\n  /BitsPerComponent 8\n  /Filter /DCTDecode\n  /Length ${p.jpegBytes.length}\n>>\nstream\n`
    );
    pushBytes(p.jpegBytes);
    pushString(`\nendstream\nendobj\n`);
  }

  // Cross-reference table (xref)
  const xrefOffset = currentOffset;
  pushString(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjects; i++) {
    const off = (offsets[i] || 0).toString().padStart(10, '0');
    pushString(`${off} 00000 n \n`);
  }

  // Trailer
  pushString(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  // Allocate and merge into final Uint8Array
  const totalLength = currentOffset;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    if (typeof chunk === 'string') {
      const b = encoder.encode(chunk);
      result.set(b, pos);
      pos += b.length;
    } else {
      result.set(chunk, pos);
      pos += chunk.length;
    }
  }

  return result;
}

/**
 * Converts a list of image URLs into a multi-page PDF document
 * with progress tracking and direct browser download trigger.
 */
export async function convertImagesToPdf(
  imageUrls: string[],
  filename: string = 'komik-chapter',
  onProgress?: (current: number, total: number, message: string) => void
): Promise<boolean> {
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('Tidak ada halaman gambar yang dapat dikonversi ke PDF');
  }

  try {
    const total = imageUrls.length;
    const processedPages: ImagePageData[] = [];

    for (let i = 0; i < total; i++) {
      const rawUrl = imageUrls[i];
      if (onProgress) {
        onProgress(i + 1, total, `Memproses halaman ${i + 1} dari ${total}...`);
      }

      // Convert image to JPEG bytes
      const imgData = await loadImageAsJpegData(rawUrl);
      if (!imgData) continue;

      processedPages.push(imgData);
    }

    if (processedPages.length === 0) {
      throw new Error('Gagal merender halaman ke dokumen PDF');
    }

    if (onProgress) {
      onProgress(total, total, 'Menyusun berkas PDF dan memulai unduhan...');
    }

    // Generate pure PDF bytes
    const pdfBytes = createPdfFromJpegs(processedPages);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    // Save/Download PDF
    const safeName = filename.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${safeName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    if (onProgress) {
      onProgress(total, total, 'Selesai! PDF berhasil disimpan.');
    }
    return true;
  } catch (error: any) {
    console.error('Error converting images to PDF:', error);
    throw error;
  }
}

/**
 * Helper to fetch image data and get natural dimensions + raw JPEG binary bytes
 */
async function loadImageAsJpegData(url: string): Promise<ImagePageData | null> {
  return new Promise((resolve) => {
    // If not proxied and external, proxy it to avoid CORS tainted canvas
    const targetUrl = (url.startsWith('http') && !url.includes('/api/proxy-image')) 
      ? `/api/proxy-image?url=${encodeURIComponent(url)}` 
      : url;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        resolve({
          jpegBytes: bytes,
          width: canvas.width,
          height: canvas.height
        });
      } catch (err) {
        console.warn('Canvas conversion failed, fallback image:', err);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn('Failed to load image for PDF:', url);
      resolve(null);
    };

    img.src = targetUrl;
  });
}
