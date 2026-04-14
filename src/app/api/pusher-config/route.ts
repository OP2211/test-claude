import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'Pusher public key is not configured' },
      { status: 404 }
    );
  }
  const cluster =
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER ||
    process.env.PUSHER_CLUSTER ||
    'eu';

  return NextResponse.json({ key, cluster });
}
