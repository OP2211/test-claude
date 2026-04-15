import { v4 as uuidv4 } from 'uuid';
import { getMatch } from './data';
import type { Message, TabId, TeamId, VoteChoice, VoteTally, VoteSnapshot, VoteVoter, VoteHistoryPoint, Reactions } from './types';

type Room = Record<TabId, Message[]>;

interface InMemoryStoreState {
  messages: Record<string, Room>;
  votes: Record<string, Record<string, StoredVote>>;
  voteHistory: Record<string, VoteHistoryPoint[]>;
}

const STORE_GLOBAL_KEY = '__matchday_store_state__';
const globalStore = globalThis as typeof globalThis & {
  [STORE_GLOBAL_KEY]?: InMemoryStoreState;
};

if (!globalStore[STORE_GLOBAL_KEY]) {
  globalStore[STORE_GLOBAL_KEY] = {
    messages: {},
    votes: {},
    voteHistory: {},
  };
}

const _messages = globalStore[STORE_GLOBAL_KEY]!.messages;
interface StoredVote {
  vote: VoteChoice;
  username: string;
  image?: string;
  fanTeamId: TeamId | null;
}

const _votes = globalStore[STORE_GLOBAL_KEY]!.votes;
const _voteHistory = globalStore[STORE_GLOBAL_KEY]!.voteHistory;

const MAX_VOTE_HISTORY = 200;

async function getRoom(matchId: string): Promise<Room> {
  if (!_messages[matchId]) {
    _messages[matchId] = { predictions: [], teamsheet: [], banter: [] };
    await seedMessages(matchId);
  }
  return _messages[matchId];
}

export async function getMessages(matchId: string, tab: TabId): Promise<Message[]> {
  const room = await getRoom(matchId);
  return room[tab] || [];
}

interface AddMessageParams {
  tab: TabId;
  userId: string;
  username: string;
  fanTeamId: TeamId | null;
  image?: string;
  text: string;
  moderation?: Message['moderation'];
}

export async function addMessage(matchId: string, { tab, userId, username, fanTeamId, image, text, moderation }: AddMessageParams): Promise<Message> {
  const room = await getRoom(matchId);
  const msg: Message = {
    id: uuidv4(),
    userId,
    username,
    fanTeamId,
    image: image || undefined,
    tab,
    text: (text || '').trim().slice(0, 500),
    timestamp: new Date().toISOString(),
    reactions: {},
    moderation,
  };
  if (!room[tab]) room[tab] = [];
  room[tab].push(msg);
  return msg;
}

export async function toggleReaction(matchId: string, tab: TabId, messageId: string, emoji: string, userId: string): Promise<Reactions | null> {
  const room = await getRoom(matchId);
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

export interface CastVoteMeta {
  username: string;
  image?: string;
  fanTeamId?: TeamId | null;
}

function computeVoteState(matchId: string): { tally: VoteTally; byChoice: Record<VoteChoice, VoteVoter[]> } {
  const byChoice: Record<VoteChoice, VoteVoter[]> = { home: [], draw: [], away: [] };
  for (const [uid, rec] of Object.entries(_votes[matchId] || {})) {
    byChoice[rec.vote].push({
      userId: uid,
      username: rec.username,
      image: rec.image,
      fanTeamId: rec.fanTeamId ?? null,
    });
  }
  return {
    tally: {
      home: byChoice.home.length,
      draw: byChoice.draw.length,
      away: byChoice.away.length,
    },
    byChoice,
  };
}

function snapshotHistory(matchId: string): VoteHistoryPoint[] {
  return [...(_voteHistory[matchId] || [])];
}

export function castVote(matchId: string, userId: string, vote: VoteChoice, meta: CastVoteMeta): VoteSnapshot {
  if (!_votes[matchId]) _votes[matchId] = {};
  const prev = _votes[matchId][userId];
  const name = meta.username.trim().slice(0, 64) || prev?.username || 'Fan';
  _votes[matchId][userId] = {
    vote,
    username: name,
    image: meta.image || prev?.image,
    fanTeamId: meta.fanTeamId !== undefined ? meta.fanTeamId : (prev?.fanTeamId ?? null),
  };
  const base = computeVoteState(matchId);
  if (!_voteHistory[matchId]) _voteHistory[matchId] = [];
  _voteHistory[matchId].push({
    at: new Date().toISOString(),
    tally: { ...base.tally },
  });
  if (_voteHistory[matchId].length > MAX_VOTE_HISTORY) {
    _voteHistory[matchId] = _voteHistory[matchId].slice(-MAX_VOTE_HISTORY);
  }
  return { ...base, history: snapshotHistory(matchId) };
}

export function getVoteSnapshot(matchId: string): VoteSnapshot {
  const base = computeVoteState(matchId);
  return { ...base, history: snapshotHistory(matchId) };
}

export function getVoteTally(matchId: string): VoteTally {
  return getVoteSnapshot(matchId).tally;
}

async function seedMessages(matchId: string): Promise<void> {
  const match = await getMatch(matchId);
  if (!match) return;

  const h = match.homeTeam.shortName;
  const a = match.awayTeam.shortName;

  _messages[matchId].predictions = [
    { id: uuidv4(), userId: 'bot-1', username: `${h} Fan`, fanTeamId: match.homeTeamId, tab: 'predictions', text: `${h} to win 2-1, the boys are fired up today`, timestamp: new Date(Date.now() - 30 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-2', username: `${a} Fan`, fanTeamId: match.awayTeamId, tab: 'predictions', text: `Easy 3 points for us. ${a} all day`, timestamp: new Date(Date.now() - 25 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-3', username: `${h} Fan`, fanTeamId: match.homeTeamId, tab: 'predictions', text: `1-0 and a clean sheet. Tight one but we grind it out.`, timestamp: new Date(Date.now() - 20 * 60000).toISOString(), reactions: {} },
  ];
  _messages[matchId].teamsheet = [
    { id: uuidv4(), userId: 'bot-2', username: `${a} Fan`, fanTeamId: match.awayTeamId, tab: 'teamsheet', text: `Interesting lineup from our gaffer. Attack minded today!`, timestamp: new Date(Date.now() - 15 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-1', username: `${h} Fan`, fanTeamId: match.homeTeamId, tab: 'teamsheet', text: `Why is he starting again?? Should've been rested...`, timestamp: new Date(Date.now() - 10 * 60000).toISOString(), reactions: {} },
  ];
  _messages[matchId].banter = [
    { id: uuidv4(), userId: 'bot-2', username: `${a} Fan`, fanTeamId: match.awayTeamId, tab: 'banter', text: `You lot are getting rolled today, book it!`, timestamp: new Date(Date.now() - 8 * 60000).toISOString(), reactions: {} },
    { id: uuidv4(), userId: 'bot-1', username: `${h} Fan`, fanTeamId: match.homeTeamId, tab: 'banter', text: `Talk to me after 90 mins mate`, timestamp: new Date(Date.now() - 5 * 60000).toISOString(), reactions: {} },
  ];
}
