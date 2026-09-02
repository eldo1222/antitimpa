/**
 * Supabase error handler & human-readable diagnostic messages
 */

export interface ParsedDbError {
  isError: boolean;
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
  userFriendlyMessage: string;
  remediationHint?: string;
  isTableMissing?: boolean;
  rawError?: any;
}

export interface SupabaseDiagnosticReport {
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE';
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
  count?: number;
  ids?: string[];
  columns?: string[];
  safePayload?: any;
  validationError?: string;
  formattedOutput: string;
  rawError?: any;
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

export function isNetworkOrOfflineError(error: any): boolean {
  if (!error) return false;
  const rawMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  const rawStack = error?.stack || '';
  const fullText = `${rawMessage} ${rawStack}`;
  return (
    fullText.includes('Failed to fetch') ||
    fullText.includes('NetworkError') ||
    fullText.includes('Network request failed') ||
    fullText.includes('fetch failed') ||
    fullText.includes('ECONNREFUSED') ||
    fullText.includes('ENOTFOUND') ||
    fullText.includes('ERR_NAME_NOT_RESOLVED') ||
    fullText.includes('TypeError: Failed to fetch') ||
    fullText.includes('net::ERR_')
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

  const rawMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  const code = error?.code || '';
  const details = error?.details || null;
  const hint = error?.hint || null;

  // 1. Network / Offline / Unreachable Error
  if (isNetworkOrOfflineError(error)) {
    return {
      isError: true,
      code: code || 'NETWORK_OFFLINE',
      message: rawMessage,
      details,
      hint,
      userFriendlyMessage: 'Koneksi ke Supabase offline atau belum dapat dijangkau. Sistem otomatis menggunakan penyimpanan lokal server.',
      remediationHint: 'Pastikan koneksi internet aktif dan URL Supabase valid di tab Database.',
      rawError: error,
    };
  }

  // 2. Missing Table Error (PGRST205 or 42P01)
  if (isMissingTableError(error)) {
    return {
      isError: true,
      code: code || 'PGRST205',
      message: rawMessage,
      details,
      hint,
      isTableMissing: true,
      userFriendlyMessage: `Tabel belum ditemukan di Supabase (Code: ${code || 'PGRST205'}) - ${rawMessage}`,
      remediationHint: 'Buka Tab Database -> Salin SQL Schema -> Jalankan di Supabase Dashboard (SQL Editor).',
      rawError: error,
    };
  }

  // 2. RLS Violation (42501)
  if (code === '42501' || rawMessage.includes('row-level security') || rawMessage.includes('violates row-level security')) {
    return {
      isError: true,
      code,
      message: rawMessage,
      details,
      hint,
      userFriendlyMessage: `Izin Row Level Security (RLS) menolak operasi (Code: ${code}) - ${rawMessage}`,
      remediationHint: 'Pastikan policy RLS dari SQL Schema (FOR ALL / anon access) sudah dieksekusi di Supabase.',
      rawError: error,
    };
  }

  // 3. Column not found (PGRST204)
  if (code === 'PGRST204' || rawMessage.includes('Could not find the') && rawMessage.includes('column')) {
    return {
      isError: true,
      code,
      message: rawMessage,
      details,
      hint,
      userFriendlyMessage: `Kolom database tidak ditemukan (Code: ${code}) - ${rawMessage}`,
      remediationHint: 'Skema tabel di database remote berbeda dengan kode aplikasi. Jalankan pembaruan SQL Schema.',
      rawError: error,
    };
  }

  // 4. Unique / Duplicate Key Violation (23505)
  if (code === '23505' || rawMessage.includes('duplicate key') || rawMessage.includes('violates unique constraint')) {
    return {
      isError: true,
      code,
      message: rawMessage,
      details,
      hint,
      userFriendlyMessage: `Duplikat key unik (Code: ${code}) - ${rawMessage}`,
      remediationHint: 'Data dengan identifier tersebut sudah ada di database.',
      rawError: error,
    };
  }

  // 5. Foreign Key Violation (23503)
  if (code === '23503' || rawMessage.includes('violates foreign key constraint')) {
    return {
      isError: true,
      code,
      message: rawMessage,
      details,
      hint,
      userFriendlyMessage: `Relasi foreign key tidak terpenuhi (Code: ${code}) - ${rawMessage}`,
      remediationHint: 'Pastikan baris induk (misal: comic) sudah tersimpan sebelum menyimpan baris anak (misal: chapter).',
      rawError: error,
    };
  }

  // 6. Invalid API Key / JWT Expired
  if (rawMessage.includes('Invalid API key') || code === 'PGRST301' || rawMessage.includes('JWT')) {
    return {
      isError: true,
      code,
      message: rawMessage,
      details,
      hint,
      userFriendlyMessage: `Supabase Anon Key tidak valid atau kedaluwarsa (Code: ${code || 'JWT_ERR'})`,
      remediationHint: 'Periksa kembali Project Anon Key di Supabase Dashboard -> Settings -> API.',
      rawError: error,
    };
  }

  return {
    isError: true,
    code,
    message: rawMessage,
    details,
    hint,
    userFriendlyMessage: `Supabase Error [${code || 'UNKNOWN'}]: ${rawMessage}`,
    rawError: error,
  };
}

export function formatSupabaseDiagnosticError(params: {
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE';
  error: any;
  count?: number;
  ids?: string[];
  columns?: string[];
  safePayload?: any;
}): SupabaseDiagnosticReport {
  const parsed = parseSupabaseError(params.error);
  const code = parsed.code || 'UNKNOWN_CODE';
  const message = parsed.message || 'No message provided';
  const details = parsed.details || (params.error?.details ? String(params.error.details) : 'None');
  const hint = parsed.hint || (params.error?.hint ? String(params.error.hint) : 'None');

  const formattedOutput = [
    '========================================',
    '🚨 SUPABASE WRITE FAILED',
    '========================================',
    `Table:      ${params.table}`,
    `Operation:  ${params.operation}`,
    `Code:       ${code}`,
    `Message:    ${message}`,
    `Details:    ${details}`,
    `Hint:       ${hint}`,
    params.count !== undefined ? `Rows Count: ${params.count}` : '',
    params.ids && params.ids.length > 0 ? `Target IDs: ${params.ids.slice(0, 10).join(', ')}${params.ids.length > 10 ? ` (+${params.ids.length - 10} more)` : ''}` : '',
    params.columns && params.columns.length > 0 ? `Payload Columns: [${params.columns.join(', ')}]` : '',
    '========================================'
  ].filter(Boolean).join('\n');

  return {
    table: params.table,
    operation: params.operation,
    code,
    message,
    details,
    hint,
    count: params.count,
    ids: params.ids,
    columns: params.columns,
    safePayload: params.safePayload,
    formattedOutput,
    rawError: params.error
  };
}

