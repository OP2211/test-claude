import { NextResponse } from 'next/server';
import { getSupportersByTeamId } from '@/lib/profile-repo';
import { isValidTeamId } from '@/lib/teams';

interface RouteContext {
  params: {
    teamId: string;
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { teamId } = params;

  if (!isValidTeamId(teamId)) {
    return NextResponse.json({ error: 'Invalid team id' }, { status: 400 });
  }

  try {
    const supporters = await getSupportersByTeamId(teamId);
    return NextResponse.json({ supporters });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch supporters' },
      { status: 500 },
    );
  }
}
