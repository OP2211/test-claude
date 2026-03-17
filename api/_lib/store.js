// In-memory store for messages, votes, and reactions.
// Persists within warm Vercel function instances.
// For full persistence across cold starts, add Vercel KV:
//   vercel kv create matchday-chat  (then replace the functions below with @vercel/kv calls)

const { v4: uuidv4 } = require('uuid');

// Messages: { [matchId]: { predictions: [], teamsheet: [], banter: [] } }
const _messages = {};

// Votes: { [matchId]: { [userId]: 'home'|'draw'|'away' } }
const _votes = {};

// ── Messages ──────────────────────────────────────────────────────────────────

function getRoom(matchId) {
  if (!_messages[matchId]) {
    _messages[matchId] = { predictions: [], teamsheet: [], banter: [] };
    _seedMessages(matchId);
  }
  return _messages[matchId];
}

function getMessages(matchId, tab) {
  return getRoom(matchId)[tab] || [];
}

function addMessage(matchId, { tab, userId, username, fanTeamId, text }) {
  const room = getRoom(matchId);
  const msg = {
    id: uuidv4(),
    userId,
    username,
    fanTeamId,
    tab,
    text: (text || '').trim().slice(0, 500),
    timestamp: new Date().toISOString(),
    reactions: {},
  };
  if (!room[tab]) room[tab] = [];
  room[tab].push(msg);
  if (room[tab].length > 200) room[tab] = room[tab].slice(-200);
  return msg;
}

function toggleReaction(matchId, tab, messageId, emoji, userId) {
  const room = getRoom(matchId);
  const msg = (room[tab] || []).find(m => m.id === messageId);
  if (!msg) return null;
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  const idx = msg.reactions[emoji].indexOf(userId);
  if (idx === -1) {
    msg.reactions[emoji].push(userId);
  } else {
    msg.reactions[emoji].splice(idx, 1);
    if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  }
  return msg.reactions;
}

// ── Votes ─────────────────────────────────────────────────────────────────────

function castVote(matchId, userId, vote) {
  if (!_votes[matchId]) _votes[matchId] = {};
  _votes[matchId][userId] = vote;
  return getVoteTally(matchId);
}

function getVoteTally(matchId) {
  const tally = { home: 0, draw: 0, away: 0 };
  Object.values(_votes[matchId] || {}).forEach(v => {
    if (tally[v] !== undefined) tally[v]++;
  });
  return tally;
}

// ── Seed ──────────────────────────────────────────────────────────────────────

function _seedMessages(matchId) {
  const { getMatch } = require('./data');
  const match = getMatch(matchId);
  if (!match) return;

  const h = match.homeTeam.shortName;
  const a = match.awayTeam.shortName;

  _messages[matchId].predictions = [
    { id: uuidv4(), userId: 'bot-1', username: `${h} Fan`, fanTeamId: match.homeTeamId, tab: 'predictions', text: `${h} to win 2-1, the boys are fired up today 💪`, timestamp: new Date(Date.now() - 30 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-2', username: `${a} Fan`, fanTeamId: match.awayTeamId, tab: 'predictions', text: `Easy 3 points for us. ${a} all day 🔥`, timestamp: new Date(Date.now() - 25 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-3', username: `${h} Fan`, fanTeamId: match.homeTeamId, tab: 'predictions', text: `1-0 and a clean sheet. Tight one but we grind it out.`, timestamp: new Date(Date.now() - 20 * 60000).toISOString(), reactions: {} },
  ];
  _messages[matchId].teamsheet = [
    { id: uuidv4(), userId: 'bot-2', username: `${a} Fan`, fanTeamId: match.awayTeamId, tab: 'teamsheet', text: `Interesting lineup from our gaffer. Attack minded today!`, timestamp: new Date(Date.now() - 15 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-1', username: `${h} Fan`, fanTeamId: match.homeTeamId, tab: 'teamsheet', text: `Why is he starting again?? Should've been rested...`, timestamp: new Date(Date.now() - 10 * 60000).toISOString(), reactions: {} },
  ];
  _messages[matchId].banter = [
    { id: uuidv4(), userId: 'bot-2', username: `${a} Fan`, fanTeamId: match.awayTeamId, tab: 'banter', text: `You lot are getting rolled today, book it! 😂`, timestamp: new Date(Date.now() - 8 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-1', username: `${h} Fan`, fanTeamId: match.homeTeamId, tab: 'banter', text: `Talk to me after 90 mins mate 😏`, timestamp: new Date(Date.now() - 5 * 60000).toISOString(), reactions: {} },
  ];
}

module.exports = { getMessages, addMessage, toggleReaction, castVote, getVoteTally, getRoom };
