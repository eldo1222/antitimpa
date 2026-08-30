/**
 * Date and time formatting utilities
 */

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const timeAgo = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 30) return formatDate(dateString);
    if (diffDay > 0) return `${diffDay} hari lalu`;
    if (diffHour > 0) return `${diffHour} jam lalu`;
    if (diffMin > 0) return `${diffMin} menit lalu`;
    return 'Baru saja';
  } catch {
    return dateString;
  }
};

export const isExpired = (expiresAt?: string | null): boolean => {
  if (!expiresAt) return false;
  try {
    const exp = new Date(expiresAt).getTime();
    return !isNaN(exp) && exp < Date.now();
  } catch {
    return false;
  }
};
