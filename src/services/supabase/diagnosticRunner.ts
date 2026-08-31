import { getSupabaseClient, isSupabaseConfigured, formatSupabaseDiagnosticError, isMissingTableError } from '../../lib/supabase';
import { DATABASE_TABLES, DatabaseTableName } from '../database/databaseContract';
import { KNOWN_COMIC_DB_COLUMNS, KNOWN_CHAPTER_DB_COLUMNS, validateComicData, validateChapterData } from '../../features/comics/services/comicValidation';
import { mapComicToDb } from '../../features/comics/services/comicMapper';
import { mapChapterToDb } from '../../features/chapters/services/chapterMapper';
import { Comic, Chapter } from '../../types';

export interface TableHealthStatus {
  table: string;
  status: 'OK' | 'MISSING' | 'ERROR';
  code?: string;
  message?: string;
  rowCount?: number;
}

export interface SchemaHealthReport {
  timestamp: string;
  tables: Record<string, TableHealthStatus>;
  allHealthy: boolean;
  missingTables: string[];
  formattedOutput: string;
}

/**
 * Health check for all 10 official Supabase tables
 */
export async function checkSupabaseSchemaHealth(): Promise<SchemaHealthReport> {
  const timestamp = new Date().toISOString();
  const client = getSupabaseClient();
  const tables = Object.values(DATABASE_TABLES);
  const results: Record<string, TableHealthStatus> = {};
  const missingTables: string[] = [];

  if (!client) {
    tables.forEach(t => {
      results[t] = { table: t, status: 'ERROR', message: 'Client Supabase belum dikonfigurasi' };
    });
    return {
      timestamp,
      tables: results,
      allHealthy: false,
      missingTables: tables,
      formattedOutput: 'Koneksi Supabase belum aktif.'
    };
  }

  await Promise.all(
    tables.map(async (tableName) => {
      try {
        const { count, error } = await client
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          if (isMissingTableError(error)) {
            results[tableName] = {
              table: tableName,
              status: 'MISSING',
              code: error.code || 'PGRST205',
              message: error.message
            };
            missingTables.push(tableName);
          } else {
            results[tableName] = {
              table: tableName,
              status: 'ERROR',
              code: error.code,
              message: error.message
            };
          }
        } else {
          results[tableName] = {
            table: tableName,
            status: 'OK',
            rowCount: count ?? 0
          };
        }
      } catch (err: any) {
        results[tableName] = {
          table: tableName,
          status: 'ERROR',
          message: err?.message || String(err)
        };
      }
    })
  );

  const allHealthy = missingTables.length === 0 && Object.values(results).every(r => r.status === 'OK');
  
  const lines = [
    '==================================================',
    '📊 SUPABASE SCHEMA HEALTH CHECK',
    '==================================================',
    `Timestamp: ${timestamp}`,
    `Overall  : ${allHealthy ? 'ALL TABLES OK' : `${missingTables.length} TABLES MISSING / NEED MIGRATION`}`,
    '--------------------------------------------------',
    ...tables.map(t => {
      const res = results[t];
      const namePad = t.toUpperCase().padEnd(18, ' ');
      if (res?.status === 'OK') {
        return `${namePad} OK (Rows: ${res.rowCount ?? 0})`;
      } else if (res?.status === 'MISSING') {
        return `${namePad} MISSING [${res.code || 'PGRST205'}]`;
      } else {
        return `${namePad} ERROR [${res?.code || 'ERR'}]: ${res?.message || ''}`;
      }
    }),
    '=================================================='
  ];

  return {
    timestamp,
    tables: results,
    allHealthy,
    missingTables,
    formattedOutput: lines.join('\n')
  };
}

export interface DiagnosticTestResult {
  timestamp: string;
  isConfigured: boolean;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  summary: string;
  schemaHealth?: SchemaHealthReport;
  steps: {
    connection: { status: 'PASS' | 'FAIL' | 'SKIPPED'; message: string; latencyMs?: number };
    comicSchema: { status: 'PASS' | 'FAIL' | 'SKIPPED'; columnsFound: string[]; missingColumns: string[]; extraColumns: string[]; error?: string };
    chapterSchema: { status: 'PASS' | 'FAIL' | 'SKIPPED'; columnsFound: string[]; missingColumns: string[]; extraColumns: string[]; error?: string };
    comicWrite: { 
      status: 'PASS' | 'FAIL' | 'SKIPPED'; 
      code?: string; 
      message: string; 
      details?: string | null; 
      hint?: string | null; 
      payloadColumns: string[];
      readBackVerified?: boolean;
      rawError?: any;
    };
    chapterWrite: { 
      status: 'PASS' | 'FAIL' | 'SKIPPED'; 
      code?: string; 
      message: string; 
      details?: string | null; 
      hint?: string | null; 
      payloadColumns: string[];
      readBackVerified?: boolean;
      rawError?: any;
    };
    rlsCheck: { status: 'PASS' | 'FAIL' | 'WARNING'; message: string };
  };
  rawReport: string;
}

export async function runSupabaseSingleItemDiagnostic(options?: { cleanupAfterTest?: boolean }): Promise<DiagnosticTestResult> {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  const cleanup = options?.cleanupAfterTest ?? true;

  const result: DiagnosticTestResult = {
    timestamp,
    isConfigured: isSupabaseConfigured(),
    overallStatus: 'PASS',
    summary: '',
    steps: {
      connection: { status: 'SKIPPED', message: 'Not started' },
      comicSchema: { status: 'SKIPPED', columnsFound: [], missingColumns: [], extraColumns: [] },
      chapterSchema: { status: 'SKIPPED', columnsFound: [], missingColumns: [], extraColumns: [] },
      comicWrite: { status: 'SKIPPED', message: 'Not started', payloadColumns: [] },
      chapterWrite: { status: 'SKIPPED', message: 'Not started', payloadColumns: [] },
      rlsCheck: { status: 'WARNING', message: 'Belum diuji' }
    },
    rawReport: ''
  };

  if (!isSupabaseConfigured()) {
    result.overallStatus = 'FAIL';
    result.summary = 'Supabase credentials are not configured in environment or settings.';
    result.steps.connection = { status: 'FAIL', message: 'Missing URL or Anon Key' };
    result.rawReport = `[SUPABASE DIAGNOSTIC REPORT]\nStatus: FAIL\nReason: Supabase credentials missing.`;
    return result;
  }

  const client = getSupabaseClient();
  if (!client) {
    result.overallStatus = 'FAIL';
    result.summary = 'Supabase client instance is null.';
    result.steps.connection = { status: 'FAIL', message: 'Client null' };
    result.rawReport = `[SUPABASE DIAGNOSTIC REPORT]\nStatus: FAIL\nReason: client is null.`;
    return result;
  }

  // STEP 1: Connection Test
  try {
    const connStart = Date.now();
    const { error: pingErr } = await client.from(DATABASE_TABLES.COMICS).select('id').limit(1);
    const latency = Date.now() - connStart;
    if (pingErr && isMissingTableError(pingErr)) {
      result.steps.connection = { status: 'FAIL', message: `Tabel comics belum dibuat di Supabase [${pingErr.code}]`, latencyMs: latency };
    } else if (pingErr && pingErr.code !== 'PGRST116') {
      result.steps.connection = { status: 'FAIL', message: `Connection failed: [${pingErr.code}] ${pingErr.message}`, latencyMs: latency };
    } else {
      result.steps.connection = { status: 'PASS', message: `Terhubung ke Supabase (${latency}ms)`, latencyMs: latency };
    }
  } catch (e: any) {
    result.steps.connection = { status: 'FAIL', message: `Network error: ${e?.message || e}` };
  }

  // STEP 2: Schema Health Check on all 10 tables
  const schemaHealth = await checkSupabaseSchemaHealth();
  result.schemaHealth = schemaHealth;

  // STEP 3: Comic Schema Column Inspection
  try {
    const { data: sampleComics, error: schemaErr } = await client.from(DATABASE_TABLES.COMICS).select('*').limit(1);
    if (schemaErr) {
      result.steps.comicSchema = {
        status: 'FAIL',
        columnsFound: [],
        missingColumns: [...KNOWN_COMIC_DB_COLUMNS],
        extraColumns: [],
        error: `[${schemaErr.code}] ${schemaErr.message} (Hint: ${schemaErr.hint || 'none'})`
      };
    } else {
      const foundCols = sampleComics && sampleComics.length > 0 ? Object.keys(sampleComics[0]) : [];
      const knownCols: string[] = [...KNOWN_COMIC_DB_COLUMNS];
      const missing = knownCols.filter(c => foundCols.length > 0 && !foundCols.includes(c));
      const extra = foundCols.filter(c => !knownCols.includes(c));
      result.steps.comicSchema = {
        status: 'PASS',
        columnsFound: foundCols,
        missingColumns: missing,
        extraColumns: extra
      };
    }
  } catch (e: any) {
    result.steps.comicSchema = {
      status: 'FAIL',
      columnsFound: [],
      missingColumns: [...KNOWN_COMIC_DB_COLUMNS],
      extraColumns: [],
      error: e?.message || String(e)
    };
  }

  // STEP 4: Chapter Schema Column Inspection
  try {
    const { data: sampleChaps, error: chapSchemaErr } = await client.from(DATABASE_TABLES.CHAPTERS).select('*').limit(1);
    if (chapSchemaErr) {
      result.steps.chapterSchema = {
        status: 'FAIL',
        columnsFound: [],
        missingColumns: [...KNOWN_CHAPTER_DB_COLUMNS],
        extraColumns: [],
        error: `[${chapSchemaErr.code}] ${chapSchemaErr.message} (Hint: ${chapSchemaErr.hint || 'none'})`
      };
    } else {
      const foundCols = sampleChaps && sampleChaps.length > 0 ? Object.keys(sampleChaps[0]) : [];
      const knownChapCols: string[] = [...KNOWN_CHAPTER_DB_COLUMNS];
      const missing = knownChapCols.filter(c => foundCols.length > 0 && !foundCols.includes(c));
      const extra = foundCols.filter(c => !knownChapCols.includes(c));
      result.steps.chapterSchema = {
        status: 'PASS',
        columnsFound: foundCols,
        missingColumns: missing,
        extraColumns: extra
      };
    }
  } catch (e: any) {
    result.steps.chapterSchema = {
      status: 'FAIL',
      columnsFound: [],
      missingColumns: [...KNOWN_CHAPTER_DB_COLUMNS],
      extraColumns: [],
      error: e?.message || String(e)
    };
  }

  // STEP 5: Write Test for EXACTLY 1 Comic + Read-Back Verification
  const testComicId = `diag-comic-${Date.now()}`;
  const testComic: Comic = {
    id: testComicId,
    title: `[DIAGNOSTIC TEST] Diagnostic Comic ${new Date().toLocaleTimeString('id-ID')}`,
    slug: `diag-comic-${Date.now()}`,
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
    synopsis: 'Diagnostic comic row created by Supabase Diagnostic Runner to test writes and verify PostgREST contract.',
    genres: ['Action', 'Diagnostic'],
    storyWriter: 'Diagnostic Agent',
    author: 'Diagnostic Agent',
    artist: 'Diagnostic Agent',
    comicType: 'manga',
    contentType: 'normal',
    status: 'Ongoing',
    totalChapters: 1,
    rating: 9.9,
    ratingCount: 1,
    totalReaders: 1,
    isFree: true,
    isVisibleOnHome: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const comicDbRow = mapComicToDb(testComic);
  const comicCols = Object.keys(comicDbRow);
  result.steps.comicWrite.payloadColumns = comicCols;

  // Pre-validate locally
  const comicValidation = validateComicData(testComic, comicDbRow);
  if (!comicValidation.isValid) {
    result.steps.comicWrite = {
      status: 'FAIL',
      code: 'CLIENT_VALIDATION_ERROR',
      message: `Payload validasi lokal gagal: ${comicValidation.errors.join(', ')}`,
      payloadColumns: comicCols,
      readBackVerified: false
    };
    result.overallStatus = 'FAIL';
  } else {
    try {
      console.log('[DIAGNOSTIC] Testing 1 Comic UPSERT into public.comics:', { id: testComicId, columns: comicCols });
      const { error: writeComicErr } = await client.from(DATABASE_TABLES.COMICS).upsert(comicDbRow, { onConflict: 'id' });

      if (writeComicErr) {
        const diagErr = formatSupabaseDiagnosticError({
          table: DATABASE_TABLES.COMICS,
          operation: 'UPSERT',
          error: writeComicErr,
          count: 1,
          ids: [testComicId],
          columns: comicCols,
          safePayload: comicDbRow
        });

        result.steps.comicWrite = {
          status: 'FAIL',
          code: diagErr.code,
          message: writeComicErr.message || diagErr.message,
          details: diagErr.details,
          hint: diagErr.hint,
          payloadColumns: comicCols,
          readBackVerified: false,
          rawError: writeComicErr
        };
        result.overallStatus = 'FAIL';

        if (writeComicErr.code === '42501') {
          result.steps.rlsCheck = {
            status: 'FAIL',
            message: `RLS Policy menolak INSERT/UPSERT pada public.comics (Error 42501: permission denied). Pastikan policy allow insert anon/authenticated telah dibuat.`
          };
        }
      } else {
        // Read-back check: SELECT comic by ID to verify it actually persists in PostgreSQL
        const { data: readBackComic, error: readComicErr } = await client
          .from(DATABASE_TABLES.COMICS)
          .select('id, title')
          .eq('id', testComicId)
          .maybeSingle();

        if (readComicErr || !readBackComic) {
          result.steps.comicWrite = {
            status: 'FAIL',
            code: 'READ_BACK_FAILED',
            message: `UPSERT berhasil dikirim, tetapi pembacaan ulang (SELECT) gagal menemukan baris: ${readComicErr?.message || 'Row not found'}`,
            payloadColumns: comicCols,
            readBackVerified: false
          };
          result.overallStatus = 'FAIL';
        } else {
          result.steps.comicWrite = {
            status: 'PASS',
            code: '200_OK',
            message: `Berhasil UPSERT & TERVERIFIKASI BISA DIBACA ULANG dari public.comics (ID: ${testComicId})`,
            payloadColumns: comicCols,
            readBackVerified: true
          };
        }
      }
    } catch (e: any) {
      result.steps.comicWrite = {
        status: 'FAIL',
        code: 'NETWORK_EXCEPTION',
        message: e?.message || String(e),
        payloadColumns: comicCols,
        readBackVerified: false,
        rawError: e
      };
      result.overallStatus = 'FAIL';
    }
  }

  // STEP 6: Write Test for EXACTLY 1 Chapter + Read-Back Verification (Only if comic write succeeded)
  const testChapId = `diag-chap-${Date.now()}`;
  if (result.steps.comicWrite.status === 'PASS') {
    const testChapter: Chapter = {
      id: testChapId,
      comicId: testComicId,
      chapterNumber: 1,
      title: 'Chapter 1: Diagnostic Verification',
      sourceType: 'images',
      pages: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'],
      releaseDate: new Date().toISOString().split('T')[0],
      isLocked: false,
      createdAt: new Date().toISOString()
    };

    const chapDbRow = mapChapterToDb(testChapter);
    const chapCols = Object.keys(chapDbRow);
    result.steps.chapterWrite.payloadColumns = chapCols;

    const chapValidation = validateChapterData(testChapter, chapDbRow);
    if (!chapValidation.isValid) {
      result.steps.chapterWrite = {
        status: 'FAIL',
        code: 'CLIENT_VALIDATION_ERROR',
        message: `Payload validasi chapter lokal gagal: ${chapValidation.errors.join(', ')}`,
        payloadColumns: chapCols,
        readBackVerified: false
      };
      result.overallStatus = 'FAIL';
    } else {
      try {
        console.log('[DIAGNOSTIC] Testing 1 Chapter UPSERT into public.chapters:', { id: testChapId, comicId: testComicId, columns: chapCols });
        const { error: writeChapErr } = await client.from(DATABASE_TABLES.CHAPTERS).upsert(chapDbRow, { onConflict: 'id' });

        if (writeChapErr) {
          const diagErr = formatSupabaseDiagnosticError({
            table: DATABASE_TABLES.CHAPTERS,
            operation: 'UPSERT',
            error: writeChapErr,
            count: 1,
            ids: [testChapId],
            columns: chapCols,
            safePayload: chapDbRow
          });

          result.steps.chapterWrite = {
            status: 'FAIL',
            code: diagErr.code,
            message: writeChapErr.message || diagErr.message,
            details: diagErr.details,
            hint: diagErr.hint,
            payloadColumns: chapCols,
            readBackVerified: false,
            rawError: writeChapErr
          };
          result.overallStatus = 'FAIL';
        } else {
          // Read-back check for chapter
          const { data: readBackChap, error: readChapErr } = await client
            .from(DATABASE_TABLES.CHAPTERS)
            .select('id, comic_id, chapter_number')
            .eq('id', testChapId)
            .maybeSingle();

          if (readChapErr || !readBackChap) {
            result.steps.chapterWrite = {
              status: 'FAIL',
              code: 'READ_BACK_FAILED',
              message: `UPSERT chapter berhasil dikirim, tetapi pembacaan ulang (SELECT) gagal menemukan baris: ${readChapErr?.message || 'Row not found'}`,
              payloadColumns: chapCols,
              readBackVerified: false
            };
            result.overallStatus = 'FAIL';
          } else {
            result.steps.chapterWrite = {
              status: 'PASS',
              code: '200_OK',
              message: `Berhasil UPSERT & TERVERIFIKASI BISA DIBACA ULANG dari public.chapters (ID: ${testChapId})`,
              payloadColumns: chapCols,
              readBackVerified: true
            };
          }
        }
      } catch (e: any) {
        result.steps.chapterWrite = {
          status: 'FAIL',
          code: 'NETWORK_EXCEPTION',
          message: e?.message || String(e),
          payloadColumns: chapCols,
          readBackVerified: false,
          rawError: e
        };
        result.overallStatus = 'FAIL';
      }
    }
  } else {
    result.steps.chapterWrite = {
      status: 'SKIPPED',
      message: 'Uji chapter dilewati karena penulisan komik gagal (Foreign Key constraint)',
      payloadColumns: []
    };
  }

  // STEP 7: RLS Evaluation
  if (result.steps.comicWrite.status === 'PASS' && result.steps.chapterWrite.status === 'PASS') {
    result.steps.rlsCheck = {
      status: 'PASS',
      message: 'RLS Policies pada public.comics dan public.chapters mengizinkan operasi UPSERT/INSERT.'
    };
  } else if (result.steps.comicWrite.code === '42501' || result.steps.chapterWrite.code === '42501') {
    result.steps.rlsCheck = {
      status: 'FAIL',
      message: 'RLS Policy 42501: Akses ditolak oleh Row Level Security PostgreSQL.'
    };
  }

  // STEP 8: Cleanup test rows if required
  if (cleanup && result.steps.comicWrite.status === 'PASS') {
    try {
      await client.from(DATABASE_TABLES.CHAPTERS).delete().eq('comic_id', testComicId);
      await client.from(DATABASE_TABLES.COMICS).delete().eq('id', testComicId);
      console.log('[DIAGNOSTIC] Cleanup successful for test rows:', { testComicId, testChapId });
    } catch (e) {
      console.warn('[DIAGNOSTIC] Cleanup warning:', e);
    }
  }

  // Construct Clean Summary
  if (result.steps.comicWrite.status === 'PASS' && result.steps.chapterWrite.status === 'PASS') {
    result.summary = 'SEMUA UJI PENULISAN BERHASIL (PASS). Supabase menerima 1 komik & 1 chapter, dan verifikasi read-back lolos 100%.';
  } else {
    const failedStep = result.steps.comicWrite.status === 'FAIL' 
      ? `Tabel comics: [${result.steps.comicWrite.code || 'ERR'}] ${result.steps.comicWrite.message}`
      : `Tabel chapters: [${result.steps.chapterWrite.code || 'ERR'}] ${result.steps.chapterWrite.message}`;
    result.summary = `PENULISAN DITOLAK OLEH SUPABASE: ${failedStep}`;
  }

  // Build Full Formatted Raw Diagnostic Report Text
  result.rawReport = `
================================================================================
🚨 SUPABASE WRITE & READ-BACK DIAGNOSTIC REPORT (1-ITEM TEST)
================================================================================
Timestamp   : ${result.timestamp}
Duration    : ${Date.now() - startTime}ms
Status      : ${result.overallStatus}
Summary     : ${result.summary}

--------------------------------------------------------------------------------
1. SCHEMA HEALTH CHECK (10 TABLES)
--------------------------------------------------------------------------------
${schemaHealth.formattedOutput}

--------------------------------------------------------------------------------
2. PUBLIC.COMICS WRITE & READ-BACK TEST
--------------------------------------------------------------------------------
Status             : ${result.steps.comicWrite.status}
Read-back Verified : ${result.steps.comicWrite.readBackVerified ? 'YES (Row found in PostgreSQL)' : 'NO'}
PostgREST Code     : ${result.steps.comicWrite.code || 'N/A'}
Message            : ${result.steps.comicWrite.message}
Details            : ${result.steps.comicWrite.details || 'None'}
Hint               : ${result.steps.comicWrite.hint || 'None'}
Payload Columns    : [${result.steps.comicWrite.payloadColumns.join(', ')}]

--------------------------------------------------------------------------------
3. PUBLIC.CHAPTERS WRITE & READ-BACK TEST
--------------------------------------------------------------------------------
Status             : ${result.steps.chapterWrite.status}
Read-back Verified : ${result.steps.chapterWrite.readBackVerified ? 'YES (Row found in PostgreSQL)' : 'NO'}
PostgREST Code     : ${result.steps.chapterWrite.code || 'N/A'}
Message            : ${result.steps.chapterWrite.message}
Details            : ${result.steps.chapterWrite.details || 'None'}
Hint               : ${result.steps.chapterWrite.hint || 'None'}
Payload Columns    : [${result.steps.chapterWrite.payloadColumns.join(', ')}]

--------------------------------------------------------------------------------
4. ROW LEVEL SECURITY (RLS) AUDIT
--------------------------------------------------------------------------------
Status  : ${result.steps.rlsCheck.status}
Audit   : ${result.steps.rlsCheck.message}

================================================================================
`.trim();

  return result;
}
