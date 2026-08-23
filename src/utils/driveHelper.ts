/**
 * Utility helper to parse and format Google Drive links for embedded reader mode
 */

export function formatGoogleDriveEmbedUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  // If already a preview or embedded folder view link
  if (trimmed.includes('/preview') || trimmed.includes('/embeddedfolderview')) {
    return trimmed;
  }

  // Format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
  }

  // Format: https://drive.google.com/drive/folders/FOLDER_ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
  }

  // Format: https://drive.google.com/open?id=FILE_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    if (trimmed.toLowerCase().includes('folder')) {
      return `https://drive.google.com/embeddedfolderview?id=${idMatch[1]}#grid`;
    }
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  }

  return trimmed;
}

export function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

export function isPdfUrl(url: string): boolean {
  if (!url) return false;
  return url.toLowerCase().endsWith('.pdf') || url.startsWith('data:application/pdf') || url.includes('/pdf/');
}
