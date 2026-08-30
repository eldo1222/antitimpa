/**
 * Supabase error handler & human-readable diagnostic messages
 */

export interface ParsedDbError {
  isError: boolean;
  code?: string;
  message: string;
  userFriendlyMessage: string;
  remediationHint?: string;
  isTableMissing?: boolean;
}

export function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = error?.code || '';
  const rawMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    rawMessage.includes('Could not find the table') ||
    rawMessage.includes('schema cache') ||
    (rawMessage.includes('relation') && rawMessage.includes('does not exist'))
  );
}

export function parseSupabaseError(error: any): ParsedDbError {
  if (!error) {
    return {
      isError: false,
      message: '',
      userFriendlyMessage: '',
    };
  }

  const rawMessage = error?.message || String(error);
  const code = error?.code || '';

  // 1. Missing Table Error (PGRST205 or 42P01)
  if (isMissingTableError(error)) {
    return {
      isError: true,
      code: code || 'PGRST205',
      message: rawMessage,
      isTableMissing: true,
      userFriendlyMessage: 'Tabel database belum dibuat di Supabase.',
      remediationHint: 'Buka Tab Database -> Salin SQL Schema -> Jalankan di Supabase Dashboard (SQL Editor).',
    };
  }

  // 2. RLS Violation (42501)
  if (code === '42501' || rawMessage.includes('row-level security') || rawMessage.includes('violates row-level security')) {
    return {
      isError: true,
      code,
      message: rawMessage,
      userFriendlyMessage: 'Izin Row Level Security (RLS) menolak operasi tulis/baca.',
      remediationHint: 'Pastikan policy RLS dari SQL Schema sudah dieksekusi di Supabase.',
    };
  }

  // 3. Invalid API Key / JWT Expired
  if (rawMessage.includes('Invalid API key') || code === 'PGRST301' || rawMessage.includes('JWT')) {
    return {
      isError: true,
      code,
      message: rawMessage,
      userFriendlyMessage: 'Supabase Anon Key tidak valid atau telah kedaluwarsa.',
      remediationHint: 'Periksa kembali Project Anon Key di Supabase Dashboard -> Settings -> API.',
    };
  }

  // 4. Foreign Key Violation (23503)
  if (code === '23503' || rawMessage.includes('violates foreign key constraint')) {
    return {
      isError: true,
      code,
      message: rawMessage,
      userFriendlyMessage: 'Relasi foreign key tidak terpenuhi (misal: chapter tanpa induk komik).',
      remediationHint: 'Pastikan komik induk sudah tersimpan sebelum menyimpan chapter terkait.',
    };
  }

  return {
    isError: true,
    code,
    message: rawMessage,
    userFriendlyMessage: `Terjadi kendala pada database Supabase: ${rawMessage}`,
  };
}
