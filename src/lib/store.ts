import { v4 as uuidv4 } from 'uuid';
import { getMatch } from './data';
import type { Message, TabId, VoteChoice, VoteTally, Reactions } from './types';

type Room = Record<TabId, Message[]>;

const _messages: Record<string, Room> = {};
const _votes: Record<string, Record<string, VoteChoice>> = {};

function getRoom(matchId: string): Room {
  if (!_messages[matchId]) {
    _messages[matchId] = { predictions: [], teamsheet: [], banter: [] };
    seedMessages(matchId);
  }
  return _messages[matchId];
}

export function getMessages(matchId: string, tab: TabId): Message[] {
  return getRoom(matchId)[tab] || [];
}

interface AddMessageParams {
  tab: TabId;
  userId: string;
  username: string;
  fanTeamId: string | null;
  image?: string;
  text: string;
}

export function addMessage(matchId: string, { tab, userId, username, fanTeamId, image, text }: AddMessageParams): Message {
  const room = getRoom(matchId);
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
  };
  if (!room[tab]) room[tab] = [];
  room[tab].push(msg);
  if (room[tab].length > 200) room[tab] = room[tab].slice(-200);
  return msg;
}

export function toggleReaction(matchId: string, tab: TabId, messageId: string, emoji: string, userId: string): Reactions | null {
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

export function castVote(matchId: string, userId: string, vote: VoteChoice): VoteTally {
  if (!_votes[matchId]) _votes[matchId] = {};
  _votes[matchId][userId] = vote;
  return getVoteTally(matchId);
}

export function getVoteTally(matchId: string): VoteTally {
  const tally: VoteTally = { home: 0, draw: 0, away: 0 };
  Object.values(_votes[matchId] || {}).forEach(v => {
    if (v in tally) tally[v]++;
  });
  return tally;
}

function seedMessages(matchId: string): void {
  const match = getMatch(matchId);
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
