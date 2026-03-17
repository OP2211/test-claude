const { getMessages } = require('./_lib/store');
const cors = require('./_lib/cors');

// GET /api/messages?matchId=match-1&tab=banter
module.exports = function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();

  const { matchId, tab } = req.query;
  if (!matchId || !tab) return res.status(400).json({ error: 'matchId and tab are required' });
  res.json(getMessages(matchId, tab));
};
