import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

interface HealthResultPayload {
  name: string;
  path: string;
  ok: boolean;
  status: number | null;
  durationMs: number | null;
  error?: string;
}

interface HealthRunRow {
  run_id: string;
  endpoint_name: string;
  endpoint_path: string;
  ok: boolean;
  status: number | null;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
}

function isValidResult(item: unknown): item is HealthResultPayload {
  if (!item || typeof item !== 'object') return false;
  const row = item as Partial<HealthResultPayload>;
  return (
    typeof row.name === 'string' &&
    typeof row.path === 'string' &&
    typeof row.ok === 'boolean' &&
    (typeof row.status === 'number' || row.status === null) &&
    (typeof row.durationMs === 'number' || row.durationMs === null) &&
    (typeof row.error === 'string' || typeof row.error === 'undefined')
  );
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const rows = Array.isArray(body?.results) ? body.results : [];
    if (rows.length === 0 || !rows.every(isValidResult)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const runId = randomUUID();
    const payload = rows.map((item: HealthResultPayload) => ({
      run_id: runId,
      endpoint_name: item.name,
      endpoint_path: item.path,
      ok: item.ok,
      status: item.status,
      duration_ms: item.durationMs,
      error: item.error ?? null,
    }));

    const { error } = await supabaseAdmin.from('debug_api_health_logs').insert(payload);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, runId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save health run' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' },
        { status: 500 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('debug_api_health_logs')
      .select('run_id, endpoint_name, endpoint_path, ok, status, duration_ms, error, created_at')
      .order('created_at', { ascending: true })
      .limit(2000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const groupedMap = new Map<string, { runId: string; createdAt: string; results: HealthResultPayload[] }>();
    for (const row of (data ?? []) as HealthRunRow[]) {
      const existing = groupedMap.get(row.run_id);
      const nextResult: HealthResultPayload = {
        name: row.endpoint_name,
        path: row.endpoint_path,
        ok: row.ok,
        status: row.status,
        durationMs: row.duration_ms,
        error: row.error ?? undefined,
      };

      if (!existing) {
        groupedMap.set(row.run_id, {
          runId: row.run_id,
          createdAt: row.created_at,
          results: [nextResult],
        });
      } else {
        existing.results.push(nextResult);
      }
    }

    const runs = Array.from(groupedMap.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch health history' },
      { status: 500 },
    );
  }
}
