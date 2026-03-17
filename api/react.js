const { toggleReaction } = require('./_lib/store');
const { trigger } = require('./_lib/pusher');
const cors = require('./_lib/cors');

// POST /api/react
// Body: { matchId, tab, messageId, emoji, userId }
module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();

  const { matchId, tab, messageId, emoji, userId } = req.body;
  if (!matchId || !tab || !messageId || !emoji || !userId) {
    return res.status(400).json({ error: 'matchId, tab, messageId, emoji, and userId are required' });
  }

  const reactions = toggleReaction(matchId, tab, messageId, emoji, userId);
  if (!reactions) return res.status(404).json({ error: 'Message not found' });

  await trigger(matchId, 'reaction-updated', { messageId, reactions });
  res.json({ messageId, reactions });
};
