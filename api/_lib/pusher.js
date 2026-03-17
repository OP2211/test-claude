const Pusher = require('pusher');

let _pusher = null;

function getPusher() {
  if (!_pusher) {
    if (!process.env.PUSHER_APP_ID) {
      throw new Error('PUSHER_APP_ID environment variable is not set. See .env.example for setup instructions.');
    }
    _pusher = new Pusher({
      appId:   process.env.PUSHER_APP_ID,
      key:     process.env.PUSHER_KEY,
      secret:  process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER || 'eu',
      useTLS:  true,
    });
  }
  return _pusher;
}

// Trigger an event on a match channel, swallowing errors so a Pusher
// misconfiguration never takes down the REST response.
async function trigger(matchId, event, data) {
  try {
    await getPusher().trigger(`match-${matchId}`, event, data);
  } catch (err) {
    console.error(`Pusher trigger failed [${event}]:`, err.message);
  }
}

module.exports = { trigger };
