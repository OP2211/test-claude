const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ─── In-memory data ────────────────────────────────────────────────────────────

const TEAMS = {
  'manchester-united': { name: 'Manchester United', shortName: 'MAN UTD', badge: '🔴', color: '#DA020E' },
  'liverpool':         { name: 'Liverpool',         shortName: 'LIV',     badge: '🔴', color: '#C8102E' },
  'arsenal':           { name: 'Arsenal',           shortName: 'ARS',     badge: '🔴', color: '#EF0107' },
  'chelsea':           { name: 'Chelsea',           shortName: 'CHE',     badge: '🔵', color: '#034694' },
  'manchester-city':   { name: 'Manchester City',   shortName: 'MCI',     badge: '🔵', color: '#6CABDD' },
  'tottenham':         { name: 'Tottenham',         shortName: 'TOT',     badge: '⚪', color: '#132257' },
  'barcelona':         { name: 'Barcelona',         shortName: 'BAR',     badge: '🔵🔴', color: '#A50044' },
  'real-madrid':       { name: 'Real Madrid',       shortName: 'RMA',     badge: '⚪', color: '#FEBE10' },
  'bayern-munich':     { name: 'Bayern Munich',     shortName: 'BAY',     badge: '🔴', color: '#DC052D' },
  'juventus':          { name: 'Juventus',          shortName: 'JUV',     badge: '⚫', color: '#000000' },
};

const FORMATIONS = {
  '4-3-3': [
    ['GK'],
    ['RB', 'CB', 'CB', 'LB'],
    ['CM', 'CM', 'CM'],
    ['RW', 'ST', 'LW'],
  ],
  '4-4-2': [
    ['GK'],
    ['RB', 'CB', 'CB', 'LB'],
    ['RM', 'CM', 'CM', 'LM'],
    ['ST', 'ST'],
  ],
  '3-5-2': [
    ['GK'],
    ['CB', 'CB', 'CB'],
    ['RM', 'CM', 'CM', 'CM', 'LM'],
    ['ST', 'ST'],
  ],
};

// Sample players for each team
const SQUAD_PLAYERS = {
  'manchester-united': ['Onana', 'Dalot', 'Maguire', 'Lindelöf', 'Shaw', 'Casemiro', 'Fernandes', 'Mount', 'Rashford', 'Højlund', 'Antony'],
  'liverpool':         ['Alisson', 'Alexander-Arnold', 'Konaté', 'Van Dijk', 'Robertson', 'Endo', 'Szoboszlai', 'Mac Allister', 'Salah', 'Núñez', 'Díaz'],
  'arsenal':           ['Raya', 'Ben White', 'Saliba', 'Gabriel', 'Zinchenko', 'Rice', 'Partey', 'Ødegaard', 'Saka', 'Havertz', 'Martinelli'],
  'chelsea':           ['Sánchez', 'James', 'Chalobah', 'Colwill', 'Chilwell', 'Caicedo', 'Gallagher', 'Palmer', 'Mudryk', 'Jackson', 'Sterling'],
  'manchester-city':   ['Ederson', 'Walker', 'Rúben Dias', 'Akanji', 'Gvardiol', 'Rodri', 'De Bruyne', 'Bernardo', 'Doku', 'Haaland', 'Foden'],
  'tottenham':         ['Vicario', 'Porro', 'Romero', 'Van de Ven', 'Udogie', 'Bissouma', 'Bentancur', 'Maddison', 'Kulusevski', 'Son', 'Richarlison'],
  'barcelona':         ['Ter Stegen', 'Koundé', 'Araujo', 'Christensen', 'Balde', 'Pedri', 'Gavi', 'De Jong', 'Yamal', 'Lewandowski', 'Torres'],
  'real-madrid':       ['Courtois', 'Carvajal', 'Militão', 'Alaba', 'Mendy', 'Valverde', 'Modrić', 'Kroos', 'Bellingham', 'Vinicius Jr', 'Rodrigo'],
  'bayern-munich':     ['Neuer', 'Mazraoui', 'Upamecano', 'Kim', 'Davies', 'Kimmich', 'Goretzka', 'Müller', 'Gnabry', 'Kane', 'Sané'],
  'juventus':          ['Szczesny', 'Danilo', 'Bremer', 'Gatti', 'Cambiaso', 'Fagioli', 'Locatelli', 'Rabiot', 'Chiesa', 'Vlahović', 'Kostic'],
};

// Generate sample matches — some in future, some in past
function generateMatches() {
  const now = new Date();
  const matches = [
    {
      id: 'match-1',
      homeTeamId: 'manchester-united',
      awayTeamId: 'liverpool',
      kickoff: new Date(now.getTime() + 1.5 * 60 * 60 * 1000).toISOString(), // 1.5h from now (chat OPEN)
      competition: 'Premier League',
      venue: 'Old Trafford',
      status: 'upcoming',
    },
    {
      id: 'match-2',
      homeTeamId: 'arsenal',
      awayTeamId: 'manchester-city',
      kickoff: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4h from now (chat NOT open yet)
      competition: 'Premier League',
      venue: 'Emirates Stadium',
      status: 'upcoming',
    },
    {
      id: 'match-3',
      homeTeamId: 'barcelona',
      awayTeamId: 'real-madrid',
      kickoff: new Date(now.getTime() + 0.5 * 60 * 60 * 1000).toISOString(), // 30min from now (chat OPEN)
      competition: 'La Liga',
      venue: 'Camp Nou',
      status: 'upcoming',
    },
    {
      id: 'match-4',
      homeTeamId: 'chelsea',
      awayTeamId: 'tottenham',
      kickoff: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1h ago (LIVE)
      competition: 'Premier League',
      venue: 'Stamford Bridge',
      status: 'live',
    },
    {
      id: 'match-5',
      homeTeamId: 'bayern-munich',
      awayTeamId: 'juventus',
      kickoff: new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString(), // Tomorrow
      competition: 'Champions League',
      venue: 'Allianz Arena',
      status: 'upcoming',
    },
  ];

  return matches.map(m => ({
    ...m,
    homeTeam: TEAMS[m.homeTeamId],
    awayTeam: TEAMS[m.awayTeamId],
    teamSheet: {
      home: {
        formation: '4-3-3',
        players: SQUAD_PLAYERS[m.homeTeamId] || [],
        confirmed: Math.random() > 0.5,
      },
      away: {
        formation: '4-4-2',
        players: SQUAD_PLAYERS[m.awayTeamId] || [],
        confirmed: Math.random() > 0.5,
      },
    },
  }));
}

let matches = generateMatches();

// Messages: { [matchId]: { predictions: [], teamsheet: [], banter: [] } }
const messages = {};
const userVotes = {}; // { [matchId]: { [userId]: prediction } }
const reactions = {}; // { [messageId]: { [emoji]: count } }

function getOrCreateRoom(matchId) {
  if (!messages[matchId]) {
    messages[matchId] = { predictions: [], teamsheet: [], banter: [] };
  }
  return messages[matchId];
}

// Seed some messages
function seedMessages(matchId) {
  const room = getOrCreateRoom(matchId);
  const match = matches.find(m => m.id === matchId);
  if (!match || room.banter.length > 0) return;

  const homeShort = match.homeTeam.shortName;
  const awayShort = match.awayTeam.shortName;

  room.predictions.push(
    { id: uuidv4(), userId: 'bot-1', username: `${homeShort} Fan`, fanTeamId: match.homeTeamId, tab: 'predictions', text: `${homeShort} to win 2-1, Haaland won't save you today! 💪`, timestamp: new Date(Date.now() - 30 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-2', username: `${awayShort} Fan`, fanTeamId: match.awayTeamId, tab: 'predictions', text: `Easy 3 points for us. ${awayShort} all day 🔥`, timestamp: new Date(Date.now() - 25 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-3', username: `${homeShort} Fan`, fanTeamId: match.homeTeamId, tab: 'predictions', text: `1-0 and a clean sheet. Tight one but we grind it out.`, timestamp: new Date(Date.now() - 20 * 60000).toISOString(), reactions: {} },
  );
  room.teamsheet.push(
    { id: uuidv4(), userId: 'bot-2', username: `${awayShort} Fan`, fanTeamId: match.awayTeamId, tab: 'teamsheet', text: `Interesting lineup from our gaffer. Attack minded today!`, timestamp: new Date(Date.now() - 15 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-1', username: `${homeShort} Fan`, fanTeamId: match.homeTeamId, tab: 'teamsheet', text: `Why is he starting again?? Should've been rested...`, timestamp: new Date(Date.now() - 10 * 60000).toISOString(), reactions: {} },
  );
  room.banter.push(
    { id: uuidv4(), userId: 'bot-2', username: `${awayShort} Fan`, fanTeamId: match.awayTeamId, tab: 'banter', text: `You lot are getting rolled today, book it! 😂`, timestamp: new Date(Date.now() - 8 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-1', username: `${homeShort} Fan`, fanTeamId: match.homeTeamId, tab: 'banter', text: `Talk to me after 90 mins mate 😏`, timestamp: new Date(Date.now() - 5 * 60000).toISOString(), reactions: {} },
  );
}

// Seed open matches
matches.forEach(m => {
  const now = new Date();
  const kickoff = new Date(m.kickoff);
  const minsToKickoff = (kickoff - now) / 60000;
  if (minsToKickoff <= 120 || m.status === 'live') {
    seedMessages(m.id);
  }
});

// ─── REST API ─────────────────────────────────────────────────────────────────

app.get('/api/matches', (req, res) => {
  res.json(matches);
});

app.get('/api/matches/:id', (req, res) => {
  const match = matches.find(m => m.id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(match);
});

app.get('/api/matches/:id/messages/:tab', (req, res) => {
  const { id, tab } = req.params;
  const room = getOrCreateRoom(id);
  res.json(room[tab] || []);
});

app.get('/api/matches/:id/predictions/votes', (req, res) => {
  const votes = userVotes[req.params.id] || {};
  const tally = { home: 0, draw: 0, away: 0 };
  Object.values(votes).forEach(v => { if (tally[v] !== undefined) tally[v]++; });
  res.json(tally);
});

app.post('/api/matches/:id/predictions/vote', (req, res) => {
  const { userId, vote } = req.body;
  if (!['home', 'draw', 'away'].includes(vote)) return res.status(400).json({ error: 'Invalid vote' });
  if (!userVotes[req.params.id]) userVotes[req.params.id] = {};
  userVotes[req.params.id][userId] = vote;

  const tally = { home: 0, draw: 0, away: 0 };
  Object.values(userVotes[req.params.id]).forEach(v => { if (tally[v] !== undefined) tally[v]++; });

  io.to(req.params.id).emit('votes_updated', tally);
  res.json(tally);
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────

const connectedUsers = {}; // { [socketId]: { userId, username, fanTeamId, matchId } }

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_match', ({ matchId, userId, username, fanTeamId }) => {
    socket.join(matchId);
    connectedUsers[socket.id] = { userId, username, fanTeamId, matchId };

    const room = getOrCreateRoom(matchId);

    // Send existing messages for all tabs
    socket.emit('room_history', {
      predictions: room.predictions,
      teamsheet: room.teamsheet,
      banter: room.banter,
    });

    // Send current vote tally
    const votes = userVotes[matchId] || {};
    const tally = { home: 0, draw: 0, away: 0 };
    Object.values(votes).forEach(v => { if (tally[v] !== undefined) tally[v]++; });
    socket.emit('votes_updated', tally);

    // Announce join
    const match = matches.find(m => m.id === matchId);
    const teamName = match ? (TEAMS[fanTeamId]?.shortName || fanTeamId) : '';
    io.to(matchId).emit('user_joined', { username, fanTeamId, teamName });

    // Online count
    const onlineInRoom = Object.values(connectedUsers).filter(u => u.matchId === matchId).length;
    io.to(matchId).emit('online_count', onlineInRoom);
  });

  socket.on('send_message', ({ matchId, tab, userId, username, fanTeamId, text }) => {
    if (!text?.trim()) return;

    const room = getOrCreateRoom(matchId);
    const message = {
      id: uuidv4(),
      userId,
      username,
      fanTeamId,
      tab,
      text: text.trim().slice(0, 500),
      timestamp: new Date().toISOString(),
      reactions: {},
    };

    if (!room[tab]) room[tab] = [];
    room[tab].push(message);

    // Keep last 200 messages per tab
    if (room[tab].length > 200) room[tab] = room[tab].slice(-200);

    io.to(matchId).emit('new_message', message);
  });

  socket.on('react_message', ({ matchId, messageId, tab, emoji, userId }) => {
    const room = getOrCreateRoom(matchId);
    const msgs = room[tab] || [];
    const msg = msgs.find(m => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const idx = msg.reactions[emoji].indexOf(userId);
    if (idx === -1) {
      msg.reactions[emoji].push(userId);
    } else {
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    }

    io.to(matchId).emit('reaction_updated', { messageId, reactions: msg.reactions });
  });

  socket.on('disconnect', () => {
    const user = connectedUsers[socket.id];
    if (user) {
      const { matchId, username, fanTeamId } = user;
      delete connectedUsers[socket.id];
      io.to(matchId).emit('user_left', { username, fanTeamId });
      const onlineInRoom = Object.values(connectedUsers).filter(u => u.matchId === matchId).length;
      io.to(matchId).emit('online_count', onlineInRoom);
    }
    console.log('Client disconnected:', socket.id);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`⚽  Football Fan Chat server running on port ${PORT}`);
});
