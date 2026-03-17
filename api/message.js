const { addMessage } = require('./_lib/store');
const { trigger } = require('./_lib/pusher');
const cors = require('./_lib/cors');

// POST /api/message
// Body: { matchId, tab, userId, username, fanTeamId, text }
module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();

  const { matchId, tab, userId, username, fanTeamId, text } = req.body;
  if (!matchId || !tab || !text?.trim()) {
    return res.status(400).json({ error: 'matchId, tab, and text are required' });
  }

  const msg = addMessage(matchId, { tab, userId, username, fanTeamId, text });
  await trigger(matchId, 'new-message', msg);
  res.status(201).json(msg);
};
