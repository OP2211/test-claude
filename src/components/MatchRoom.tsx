'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';
import type { Match, User, Message, VoteTally, VoteChoice, VoteVoter, VoteHistoryPoint, TabId, Reactions, TeamId } from '@/lib/types';
import ChatPanel from './ChatPanel';
import TeamSheet from './TeamSheet';
import VotePicker from './VotePicker';
import './MatchRoom.css';

interface TabDef {
  id: TabId;
  icon: string;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'predictions', icon: 'predictions', label: 'Predict' },
  { id: 'teamsheet',   icon: 'teamsheet',   label: 'Lineups' },
  { id: 'banter',      icon: 'banter',      label: 'Banter' },
];

interface TabIconProps {
  type: string;
  active: boolean;
}

function TabIcon({ type, active }: TabIconProps) {
  const color = active ? 'currentColor' : 'currentColor';
  if (type === 'predictions') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l2.5 2.5"/>
    </svg>
  );
  if (type === 'teamsheet') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/>
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

interface MatchRoomProps {
  match: Match;
  user: User;
  onBack: () => void;
}

interface MessagesByTab {
  predictions: Message[];
  teamsheet: Message[];
  banter: Message[];
}

interface Notification {
  id: string;
  text: string;
  kind?: 'prediction' | 'warning';
}

interface RealtimeConfig {
  key: string;
  cluster: string;
}

interface SendMessageResponse {
  message: Message;
  moderation?: {
    moderated: boolean;
    warning: string | null;
  };
}

function isSendMessageResponse(payload: SendMessageResponse | Message): payload is SendMessageResponse {
  return typeof payload === 'object' && payload !== null && 'message' in payload;
}

const VOTE_CHOICES: readonly VoteChoice[] = ['home', 'draw', 'away'];

function isVoteChoice(v: unknown): v is VoteChoice {
  return typeof v === 'string' && (VOTE_CHOICES as readonly string[]).includes(v);
}

function emptyVoteByChoice(): Record<VoteChoice, VoteVoter[]> {
  return { home: [], draw: [], away: [] };
}

function parseVoteByChoice(raw: unknown): Record<VoteChoice, VoteVoter[]> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const out: Record<VoteChoice, VoteVoter[]> = { home: [], draw: [], away: [] };
  for (const k of VOTE_CHOICES) {
    const arr = o[k];
    if (!Array.isArray(arr)) return undefined;
    const voters: VoteVoter[] = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const v = item as Record<string, unknown>;
      if (typeof v.userId !== 'string' || typeof v.username !== 'string') continue;
      const fid = v.fanTeamId;
      voters.push({
        userId: v.userId,
        username: v.username,
        image: typeof v.image === 'string' ? v.image : undefined,
        fanTeamId:
          fid === null || fid === undefined || fid === ''
            ? null
            : (fid as TeamId),
      });
    }
    out[k] = voters;
  }
  return out;
}

function parseVoteHistory(raw: unknown): VoteHistoryPoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: VoteHistoryPoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.at !== 'string' || !o.tally || typeof o.tally !== 'object') continue;
    const t = o.tally as Record<string, unknown>;
    if (typeof t.home !== 'number' || typeof t.draw !== 'number' || typeof t.away !== 'number') continue;
    out.push({
      at: o.at,
      tally: { home: t.home, draw: t.draw, away: t.away },
    });
  }
  return out;
}

/** Pusher: tally + optional byChoice + history + toast meta; or legacy tally-only. */
function parseVoteUpdated(raw: unknown): {
  tally: VoteTally;
  byChoice?: Record<VoteChoice, VoteVoter[]>;
  history?: VoteHistoryPoint[];
  meta?: { userId: string; username: string; vote: VoteChoice };
} {
  const empty: VoteTally = { home: 0, draw: 0, away: 0 };
  if (!raw || typeof raw !== 'object') return { tally: empty };
  const o = raw as Record<string, unknown>;
  if (o.tally && typeof o.tally === 'object' && o.tally !== null) {
    const t = o.tally as Record<string, unknown>;
    if (typeof t.home === 'number' && typeof t.draw === 'number' && typeof t.away === 'number') {
      const tally = o.tally as VoteTally;
      const byChoice = parseVoteByChoice(o.byChoice);
      const history = parseVoteHistory(o.history);
      const meta =
        typeof o.userId === 'string' &&
        typeof o.username === 'string' &&
        isVoteChoice(o.vote)
          ? { userId: o.userId, username: o.username, vote: o.vote }
          : undefined;
      return { tally, byChoice: byChoice ?? undefined, history: history ?? undefined, meta };
    }
  }
  if (typeof o.home === 'number' && typeof o.draw === 'number' && typeof o.away === 'number') {
    return { tally: raw as VoteTally };
  }
  return { tally: empty };
}

function predictionDisplayName(username: string): string {
  const t = username.trim();
  if (!t) return 'Someone';
  return t.length > 22 ? `${t.slice(0, 20)}…` : t;
}

/** Short, matchday-style copy for vote toasts */
function formatPredictionToast(
  vote: VoteChoice,
  m: Match,
  opts: { self: true } | { self: false; username: string }
): string {
  const home = m.homeTeam.shortName;
  const away = m.awayTeam.shortName;
  if (opts.self) {
    if (vote === 'home') return `You're backing ${home}.`;
    if (vote === 'away') return `You're backing ${away}.`;
    return `You're backing the draw.`;
  }
  const who = predictionDisplayName(opts.username);
  if (vote === 'home') return `${who} backs ${home}.`;
  if (vote === 'away') return `${who} backs ${away}.`;
  return `${who} backs the draw.`;
}

const TAB_IDS: TabId[] = ['predictions', 'teamsheet', 'banter'];

function isTabId(v: unknown): v is TabId {
  return typeof v === 'string' && (TAB_IDS as readonly string[]).includes(v);
}

/** Normalize Pusher payload (sometimes stringified or partial). */
function parseIncomingMessage(raw: unknown): Message | null {
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!o || typeof o !== 'object') return null;
    const m = o as Partial<Message>;
    if (typeof m.id !== 'string' || !isTabId(m.tab)) return null;
    return {
      id: m.id,
      userId: typeof m.userId === 'string' ? m.userId : '',
      username: typeof m.username === 'string' ? m.username : '',
      fanTeamId: m.fanTeamId ?? null,
      image: typeof m.image === 'string' ? m.image : undefined,
      tab: m.tab,
      text: typeof m.text === 'string' ? m.text : '',
      timestamp: typeof m.timestamp === 'string' ? m.timestamp : new Date().toISOString(),
      reactions: m.reactions && typeof m.reactions === 'object' ? m.reactions : {},
      moderation:
        m.moderation &&
        typeof m.moderation === 'object' &&
        (m.moderation as { moderated?: unknown }).moderated === true &&
        typeof (m.moderation as { reason?: unknown }).reason === 'string'
          ? {
              moderated: true,
              reason: (m.moderation as { reason: string }).reason,
              by: 'admin',
            }
          : undefined,
    };
  } catch {
    return null;
  }
}

export default function MatchRoom({ match: initialMatch, user, onBack }: MatchRoomProps) {
  const [match, setMatch] = useState<Match>(initialMatch);
  const [activeTab, setActiveTab] = useState<TabId>('predictions');
  const [menuOpen, setMenuOpen] = useState(false);
  const [didInitViewportMenuState, setDidInitViewportMenuState] = useState(false);
  const [messages, setMessages] = useState<MessagesByTab>({ predictions: [], teamsheet: [], banter: [] });
  const [votes, setVotes] = useState<VoteTally>({ home: 0, draw: 0, away: 0 });
  const [voteByChoice, setVoteByChoice] = useState<Record<VoteChoice, VoteVoter[]>>(emptyVoteByChoice);
  const [voteHistory, setVoteHistory] = useState<VoteHistoryPoint[]>([]);
  const [userVote, setUserVote] = useState<VoteChoice | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const [realtime, setRealtime] = useState<RealtimeConfig | null>(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu';
    return key ? { key, cluster } : null;
  });
  const pusherRef = useRef<Pusher | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const matchRef = useRef(match);
  const userRef = useRef(user);
  matchRef.current = match;
  userRef.current = user;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setMenuOpen(false);
      return;
    }
    if (!didInitViewportMenuState) {
      setMenuOpen(true);
      setDidInitViewportMenuState(true);
    }
  }, [isDesktop, didInitViewportMenuState]);

  useEffect(() => {
    if (realtime?.key) return;
    let cancelled = false;
    async function loadRealtimeConfig() {
      try {
        const res = await fetch('/api/pusher-config');
        if (!res.ok) return;
        const data = await res.json() as Partial<RealtimeConfig>;
        if (cancelled || typeof data.key !== 'string' || !data.key.trim()) return;
        setRealtime({
          key: data.key,
          cluster:
            typeof data.cluster === 'string' && data.cluster.trim()
              ? data.cluster
              : 'eu',
        });
      } catch {
        /* realtime stays disabled when config is unavailable */
      }
    }
    loadRealtimeConfig();
    return () => {
      cancelled = true;
    };
  }, [realtime?.key]);

  const upsertMessage = useCallback((msg: Message) => {
    if (!isTabId(msg.tab)) return;
    setMessages(prev => {
      const tab = msg.tab;
      const existing = prev[tab] || [];
      if (existing.some(m => m.id === msg.id)) return prev;
      const normalized: Message = { ...msg, reactions: msg.reactions || {} };
      return { ...prev, [tab]: [...existing, normalized] };
    });
  }, []);

  const addNotification = useCallback((text: string, kind?: 'prediction' | 'warning') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    setNotifications(n => [...n, { id, text, kind }]);
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 4200);
  }, []);

  // Fetch initial data
  useEffect(() => {
    async function init() {
      try {
        const [pRes, tRes, bRes, vRes, mRes] = await Promise.all([
          fetch(`/api/messages?matchId=${match.id}&tab=predictions`),
          fetch(`/api/messages?matchId=${match.id}&tab=teamsheet`),
          fetch(`/api/messages?matchId=${match.id}&tab=banter`),
          fetch(`/api/vote?matchId=${match.id}`),
          fetch(`/api/match?id=${match.id}`),
        ]);
        const [predictions, teamsheet, banter, votePayload]: [
          Message[],
          Message[],
          Message[],
          | VoteTally
          | { tally: VoteTally; byChoice: Record<VoteChoice, VoteVoter[]>; history?: VoteHistoryPoint[] },
        ] = await Promise.all([pRes.json(), tRes.json(), bRes.json(), vRes.json()]);
        // Update match with enriched data (rosters, latest score)
        if (mRes.ok) {
          const enriched: Match = await mRes.json();
          setMatch(enriched);
        }
        setMessages({ predictions, teamsheet, banter });
        if (votePayload && typeof votePayload === 'object' && 'byChoice' in votePayload && 'tally' in votePayload) {
          const snap = votePayload as {
            tally: VoteTally;
            byChoice: Record<VoteChoice, VoteVoter[]>;
            history?: VoteHistoryPoint[];
          };
          setVotes(snap.tally);
          setVoteByChoice(snap.byChoice);
          setVoteHistory(Array.isArray(snap.history) ? snap.history : []);
        } else {
          setVotes(votePayload as VoteTally);
          setVoteByChoice(emptyVoteByChoice());
          setVoteHistory([]);
        }
      } catch (err) {
        console.error('Failed to load room data', err);
      }
    }
    init();

    // Re-fetch match data periodically so live scores and lineup updates flow in.
    // Faster cadence while live, slower otherwise.
    const refreshMs = match.status === 'live' ? 30_000 : match.status === 'upcoming' ? 120_000 : 0;
    if (refreshMs === 0) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/match?id=${match.id}`);
        if (res.ok) {
          const enriched: Match = await res.json();
          setMatch(enriched);
        }
      } catch {
        /* ignore transient errors */
      }
    }, refreshMs);
    return () => clearInterval(interval);
  }, [match.id, match.status]);

  // Pusher subscription
  useEffect(() => {
    if (!realtime?.key) return;

    pusherRef.current = new Pusher(realtime.key, { cluster: realtime.cluster });
    const channel = pusherRef.current.subscribe(`match-${match.id}`);

    channel.bind('new-message', (raw: unknown) => {
      const msg = parseIncomingMessage(raw);
      if (msg) upsertMessage(msg);
    });

    channel.bind('vote-updated', (raw: unknown) => {
      const { tally, byChoice, history, meta } = parseVoteUpdated(raw);
      setVotes(tally);
      if (byChoice) setVoteByChoice(byChoice);
      if (history) setVoteHistory(history);
      if (meta) {
        const m = matchRef.current;
        const u = userRef.current;
        const line =
          meta.userId === u.userId
            ? formatPredictionToast(meta.vote, m, { self: true })
            : formatPredictionToast(meta.vote, m, { self: false, username: meta.username });
        addNotification(line, 'prediction');
      }
    });

    channel.bind('reaction-updated', ({ messageId, reactions }: { messageId: string; reactions: Reactions }) => {
      setMessages(prev => {
        const updated: MessagesByTab = { predictions: [], teamsheet: [], banter: [] };
        for (const tab of ['predictions', 'teamsheet', 'banter'] as const) {
          updated[tab] = (prev[tab] || []).map(m =>
            m.id === messageId ? { ...m, reactions } : m
          );
        }
        return updated;
      });
    });

    channel.bind('user-event', ({ text }: { text: string }) => addNotification(text));

    return () => {
      channel.unbind_all();
      pusherRef.current?.unsubscribe(`match-${match.id}`);
      pusherRef.current?.disconnect();
    };
  }, [match.id, upsertMessage, addNotification, realtime]);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;
    try {
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          tab: activeTab,
          userId: user.userId,
          username: user.username,
          fanTeamId: user.fanTeamId,
          image: user.image,
          text,
        }),
      });
      if (!res.ok) {
        console.error('Send failed', await res.text());
        return;
      }
      const payload: SendMessageResponse | Message = await res.json();
      const msg = isSendMessageResponse(payload) ? payload.message : payload;
      // Ensure the sender sees their message even if realtime is misconfigured.
      upsertMessage(msg);
      if (isSendMessageResponse(payload) && payload.moderation?.moderated) {
        addNotification(
          payload.moderation.warning || 'Content moderated: your message was updated to meet chat rules.',
          'warning'
        );
      }
    } catch (err) {
      console.error('Send failed', err);
    }
  }, [match.id, activeTab, user, upsertMessage, addNotification]);

  const reactToMessage = useCallback(async (messageId: string, tab: TabId, emoji: string): Promise<void> => {
    try {
      await fetch('/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          tab,
          messageId,
          emoji,
          userId: user.userId,
        }),
      });
    } catch (err) {
      console.error('React failed', err);
    }
  }, [match.id, user.userId]);

  const castVote = useCallback(async (vote: VoteChoice): Promise<void> => {
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          userId: user.userId,
          vote,
          username: user.username?.trim() || 'Fan',
          image: user.image,
          fanTeamId: user.fanTeamId,
        }),
      });
      const data = await res.json();
      if (data && typeof data === 'object' && 'byChoice' in data && data.tally) {
        const snap = data as {
          tally: VoteTally;
          byChoice: Record<VoteChoice, VoteVoter[]>;
          history?: VoteHistoryPoint[];
        };
        setVotes(snap.tally);
        setVoteByChoice(snap.byChoice);
        if (Array.isArray(snap.history)) setVoteHistory(snap.history);
      } else {
        setVotes(data as VoteTally);
      }
      setUserVote(vote);
      if (!realtime?.key) {
        addNotification(formatPredictionToast(vote, match, { self: true }), 'prediction');
      }
    } catch (err) {
      console.error('Vote failed', err);
    }
  }, [match.id, user.userId, user.username, match, addNotification, realtime]);

  const isLive = match.status === 'live';
  const kickoff = new Date(match.kickoff);
  const kickoffStr = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const selectTab = useCallback((id: TabId) => {
    setActiveTab(id);
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>('.mr-drawer-close')?.focus();
    });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  return (
    <div className="mr-room">
      {/* Notifications */}
      <div className="mr-toasts">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`mr-toast ${n.kind === 'prediction' ? 'mr-toast--prediction' : ''} ${n.kind === 'warning' ? 'mr-toast--warning' : ''}`}
            role="status"
          >
            {n.text}
          </div>
        ))}
      </div>

      {/* Compact header */}
      <div className="mr-header">
        <button className="mr-back" onClick={onBack} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="mr-match-strip">
          {match.homeTeam.logo ? (
            <img src={match.homeTeam.logo} alt="" className="mr-strip-logo" />
          ) : (
            <span className="mr-strip-badge">{match.homeTeam.badge}</span>
          )}
          <div className="mr-strip-info">
            <span className="mr-strip-teams">
              {match.homeTeam.shortName}
              {(isLive || match.status === 'finished') && match.homeScore != null
                ? ` ${match.homeScore} - ${match.awayScore} `
                : ' vs '}
              {match.awayTeam.shortName}
            </span>
            <span className="mr-strip-meta">
              {isLive ? (
                <span className="mr-strip-live">
                  <span className="mr-strip-live-dot" />
                  {match.clock || 'LIVE'}
                </span>
              ) : match.status === 'finished' ? (
                <>FT &middot; {match.competition}</>
              ) : (
                <>{match.competition} &middot; {kickoffStr}</>
              )}
            </span>
          </div>
          {match.awayTeam.logo ? (
            <img src={match.awayTeam.logo} alt="" className="mr-strip-logo" />
          ) : (
            <span className="mr-strip-badge">{match.awayTeam.badge}</span>
          )}
        </div>

        <button
          type="button"
          className="mr-menu"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-label="Open room menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* Desktop: visible tabs (mobile uses drawer) */}
      <nav className="mr-desktop-tabs" aria-label="Room sections">
        <div className="mr-desktop-tabs-inner">
          {TABS.map(tab => {
            const count = messages[tab.id]?.length || 0;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`mr-dtab ${active ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
              >
                <span className="mr-dtab-icon" aria-hidden>
                  <TabIcon type={tab.icon} active={active} />
                </span>
                <span className="mr-dtab-label">{tab.label}</span>
                {count > 0 && (
                  <span className="mr-dtab-badge">{count > 99 ? '99+' : count}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Drawer: mobile room menu */}
      {menuOpen && !isDesktop && (
        <div
          ref={drawerRef}
          id="mr-room-drawer"
          className="mr-drawer-root"
          role="dialog"
          aria-modal="true"
          aria-label="Room menu"
        >
          <div
            className="mr-drawer-backdrop"
            role="presentation"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="mr-drawer-panel" aria-label="Room sections">
            <div className="mr-drawer-head">
              <span className="mr-drawer-title">Room</span>
              <button
                type="button"
                className="mr-drawer-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="mr-drawer-match">
              {match.homeTeam.shortName} vs {match.awayTeam.shortName}
            </p>
            <div className="mr-drawer-body">
              {(!isDesktop || activeTab !== 'predictions') && (
                <VotePicker
                  match={match}
                  votes={votes}
                  votersByChoice={voteByChoice}
                  voteHistory={voteHistory}
                  userVote={userVote}
                  onVote={castVote}
                />
              )}
              <p className="mr-drawer-section-label">Chats</p>
              <ul className="mr-drawer-list">
                {TABS.map(tab => {
                  const count = messages[tab.id]?.length || 0;
                  const active = activeTab === tab.id;
                  return (
                    <li key={tab.id}>
                      <button
                        type="button"
                        className={`mr-drawer-item ${active ? 'active' : ''}`}
                        onClick={() => selectTab(tab.id)}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="mr-drawer-item-icon" aria-hidden>
                          <TabIcon type={tab.icon} active={active} />
                        </span>
                        <span className="mr-drawer-item-label">{tab.label}</span>
                        {count > 0 && (
                          <span className="mr-drawer-item-badge">{count > 99 ? '99+' : count}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>
      )}

      {/* Content */}
      <div className="mr-content">
        {activeTab === 'predictions' &&
          (isDesktop ? (
            <div className="mr-predict-desktop">
              <aside className="mr-predict-sidebar" aria-label="Who wins">
                <VotePicker
                  match={match}
                  votes={votes}
                  votersByChoice={voteByChoice}
                  voteHistory={voteHistory}
                  userVote={userVote}
                  onVote={castVote}
                />
              </aside>
              <div className="mr-predict-chat">
                <ChatPanel
                  messages={messages.predictions}
                  user={user}
                  onSendMessage={sendMessage}
                  onReact={(id: string, emoji: string) => reactToMessage(id, 'predictions', emoji)}
                  placeholder="Your prediction…"
                  compact
                />
              </div>
            </div>
          ) : (
            <ChatPanel
              messages={messages.predictions}
              user={user}
              onSendMessage={sendMessage}
              onReact={(id: string, emoji: string) => reactToMessage(id, 'predictions', emoji)}
              placeholder="Your prediction…"
              compact
            />
          ))}
        {activeTab === 'teamsheet' && (
          <div className="mr-teamsheet-layout">
            <TeamSheet match={match} />
            <ChatPanel
              messages={messages.teamsheet}
              user={user}
              onSendMessage={sendMessage}
              onReact={(id: string, emoji: string) => reactToMessage(id, 'teamsheet', emoji)}
              placeholder="React to the lineup…"
              compact
            />
          </div>
        )}
        {activeTab === 'banter' && (
          <ChatPanel
            messages={messages.banter}
            user={user}
            onSendMessage={sendMessage}
            onReact={(id: string, emoji: string) => reactToMessage(id, 'banter', emoji)}
            placeholder="Talk your talk…"
            compact
          />
        )}
      </div>
    </div>
  );
}
