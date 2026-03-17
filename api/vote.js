const { castVote, getVoteTally } = require('./_lib/store');
const { trigger } = require('./_lib/pusher');
const cors = require('./_lib/cors');

// GET  /api/vote?matchId=match-1         → current tally
// POST /api/vote  { matchId, userId, vote }  → cast vote, returns new tally
module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    const { matchId } = req.query;
    if (!matchId) return res.status(400).json({ error: 'matchId required' });
    return res.json(getVoteTally(matchId));
  }

  if (req.method === 'POST') {
    const { matchId, userId, vote } = req.body;
    if (!matchId || !userId || !['home', 'draw', 'away'].includes(vote)) {
      return res.status(400).json({ error: 'matchId, userId, and a valid vote (home|draw|away) are required' });
    }
    const tally = castVote(matchId, userId, vote);
    await trigger(matchId, 'vote-updated', tally);
    return res.json(tally);
  }

  res.status(405).end();
};
