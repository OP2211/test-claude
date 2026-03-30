import Pusher from 'pusher';

let _pusher: Pusher | null = null;

function getPusher(): Pusher {
  if (!_pusher) {
    if (!process.env.PUSHER_APP_ID) {
      throw new Error('PUSHER_APP_ID not set. See .env.example');
    }
    _pusher = new Pusher({
      appId:   process.env.PUSHER_APP_ID,
      key:     process.env.PUSHER_KEY!,
      secret:  process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER || 'eu',
      useTLS:  true,
    });
  }
  return _pusher;
}

export async function trigger(matchId: string, event: string, data: unknown): Promise<void> {
  try {
    await getPusher().trigger(`match-${matchId}`, event, data);
  } catch (err) {
    console.error(`Pusher trigger failed [${event}]:`, (err as Error).message);
  }
}
