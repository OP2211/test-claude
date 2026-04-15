import { v4 as uuidv4 } from 'uuid';
import { getMatch } from './data';
import { getSupabaseAdmin } from './supabase-admin';
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

interface ChatMessageRow {
  id: string;
  match_id: string;
  tab: TabId;
  user_id: string;
  username: string;
  fan_team_id: TeamId | null;
  image: string | null;
  text: string;
  timestamp: string;
  reactions: Reactions | null;
  moderation: Message['moderation'] | null;
}

function toChatMessageRow(matchId: string, message: Message): ChatMessageRow {
  return {
    id: message.id,
    match_id: matchId,
    tab: message.tab,
    user_id: message.userId,
    username: message.username,
    fan_team_id: message.fanTeamId,
    image: message.image ?? null,
    text: message.text,
    timestamp: message.timestamp,
    reactions: message.reactions,
    moderation: message.moderation ?? null,
  };
}

function fromChatMessageRow(row: ChatMessageRow): Message {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    fanTeamId: row.fan_team_id,
    image: row.image ?? undefined,
    tab: row.tab,
    text: row.text,
    timestamp: row.timestamp,
    reactions: row.reactions || {},
    moderation: row.moderation ?? undefined,
  };
}

export interface GetMessagesOptions {
  limit?: number;
  before?: string;
}

export interface MessagesPage {
  messages: Message[];
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function getMessages(matchId: string, tab: TabId, opts: GetMessagesOptions = {}): Promise<MessagesPage> {
  const normalizedMatchId = matchId.trim();
  const normalizedTab = tab.trim() as TabId;
  const requestedLimit = Number.isFinite(opts.limit) ? Math.floor(opts.limit as number) : DEFAULT_PAGE_SIZE;
  const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, requestedLimit || DEFAULT_PAGE_SIZE));
  const before = opts.before?.trim();
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    let query = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('match_id', normalizedMatchId)
      .eq('tab', normalizedTab)
      .order('timestamp', { ascending: false })
      .limit(limit + 1);

    if (before) {
      query = query.lt('timestamp', before);
    }

    const { data, error } = await query;

    if (!error && data) {
      const rows = data as ChatMessageRow[];
      const hasMore = rows.length > limit;
      const pageRows = (hasMore ? rows.slice(0, limit) : rows).reverse();
      return {
        messages: pageRows.map(fromChatMessageRow),
        hasMore,
      };
    }
    if (error) {
      console.error('Supabase getMessages failed, falling back to in-memory store:', error.message);
    }
  }

  const room = await getRoom(normalizedMatchId);
  const all = room[normalizedTab] || [];
  let eligible = all;
  if (before) {
    const beforeMs = new Date(before).getTime();
    if (!Number.isNaN(beforeMs)) {
      eligible = all.filter((m) => new Date(m.timestamp).getTime() < beforeMs);
    }
  }
  const hasMore = eligible.length > limit;
  const messages = (hasMore ? eligible.slice(-limit) : eligible);
  return { messages, hasMore };
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

  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('chat_messages').insert(toChatMessageRow(matchId, msg));
    if (!error) {
      return msg;
    }
    console.error('Supabase addMessage failed, falling back to in-memory store:', error.message);
  }

  const room = await getRoom(matchId);
  if (!room[tab]) room[tab] = [];
  room[tab].push(msg);
  return msg;
}

export async function toggleReaction(matchId: string, tab: TabId, messageId: string, emoji: string, userId: string): Promise<Reactions | null> {
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('match_id', matchId)
      .eq('tab', tab)
      .eq('id', messageId)
      .maybeSingle();

    if (!error && data) {
      const row = data as ChatMessageRow;
      const reactions: Reactions = { ...(row.reactions || {}) };
      if (!reactions[emoji]) reactions[emoji] = [];
      const idx = reactions[emoji].indexOf(userId);
      if (idx === -1) {
        reactions[emoji].push(userId);
      } else {
        reactions[emoji].splice(idx, 1);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      }

      const { error: updateError } = await supabaseAdmin
        .from('chat_messages')
        .update({ reactions })
        .eq('id', messageId)
        .eq('match_id', matchId)
        .eq('tab', tab);

      if (!updateError) {
        return reactions;
      }
      console.error('Supabase toggleReaction update failed, falling back to in-memory store:', updateError.message);
    }
    if (error) {
      console.error('Supabase toggleReaction fetch failed, falling back to in-memory store:', error.message);
    }
  }

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
