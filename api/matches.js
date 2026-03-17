const { getMatches } = require('./_lib/data');
const cors = require('./_lib/cors');

module.exports = function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();
  res.json(getMatches());
};
