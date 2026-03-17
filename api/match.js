const { getMatch } = require('./_lib/data');
const cors = require('./_lib/cors');

// GET /api/match?id=match-1
module.exports = function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();

  const match = getMatch(req.query.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(match);
};
