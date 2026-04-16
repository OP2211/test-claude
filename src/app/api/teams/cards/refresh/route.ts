import { NextResponse } from 'next/server';
import { refreshTeamCardsCache } from '@/lib/team-cards-cache';

export async function POST() {
  try {
    await refreshTeamCardsCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh team cards cache' },
      { status: 500 },
    );
  }
}
