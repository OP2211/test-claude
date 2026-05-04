'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import { useSession } from 'next-auth/react';
import type { CricketMatch } from '@/lib/cricket/types';
import { isCricketChatOpen } from '@/lib/cricket/types';
import type { Message, User, VoteChoice, VoteTally, TabId, Reactions } from '@/lib/types';
import { startGoogleSignInRedirect } from '@/lib/google-signin';
import { isCricketMatchReadOnly } from '@/lib/match-access';
import AuthRequiredModal from './AuthRequiredModal';
import ChatPanel from './ChatPanel';
import CricketScorecard from './CricketScorecard';
import CricketSquad from './CricketSquad';
import CricketVotePicker from './CricketVotePicker';
import './CricketMatchRoom.css';

interface Props {
  match: CricketMatch;
  user: User;
  onBack: () => void;
}

type CricketTabId = 'predictions' | 'scorecard' | 'squad' | 'banter';

/** Map cricket UI tabs to chat storage TabId union. Scorecard/squad don't have chat. */
function toChatTab(tab: CricketTabId): TabId | null {
  if (tab === 'banter') return 'banter';
  if (tab === 'predictions') return 'predictions';
  return null;
}

interface TabDef {
  id: CricketTabId;
  label: string;
  icon: React.ReactNode;
}

function Icon({ kind }: { kind: CricketTabId }) {
  if (kind === 'predictions') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
  if (kind === 'scorecard') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 4v16" />
    </svg>
  );
  if (kind === 'squad') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="3.5" />
      <path d="M21 20v-2a4 4 0 0 0-3-3.86" />
      <path d="M17 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
  // banter
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const TABS: TabDef[] = [
  { id: 'predictions', label: 'Predict',   icon: <Icon kind="predictions" /> },
  { id: 'scorecard',   label: 'Scorecard', icon: <Icon kind="scorecard" /> },
  { id: 'squad',       label: 'Squad',     icon: <Icon kind="squad" /> },
  { id: 'banter',      label: 'Banter',    icon: <Icon kind="banter" /> },
];

interface RealtimeConfig { key: string; cluster: string; }

function isTabId(v: unknown): v is TabId {
  return v === 'predictions' || v === 'teamsheet' || v === 'banter';
}

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
    };
  } catch { return null; }
}

function parseVoteUpdated(raw: unknown): VoteTally | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const t = (o.tally && typeof o.tally === 'object') ? o.tally as Record<string, unknown> : o;
  if (typeof t.home === 'number' && typeof t.away === 'number') {
    return {
      home: t.home,
      draw: typeof t.draw === 'number' ? t.draw : 0,
      away: t.away,
    };
  }
  return null;
}

function headerScore(match: CricketMatch, side: 'home' | 'away'): string {
  const team = side === 'home' ? match.home : match.away;
  const last = [...match.innings].reverse().find((i) => i.teamId === team.id);
  if (!last) return '—';
  return `${last.runs}/${last.wickets}`;
}

function headerOvers(match: CricketMatch, side: 'home' | 'away'): string {
  const team = side === 'home' ? match.home : match.away;
  const last = [...match.innings].reverse().find((i) => i.teamId === team.id);
  if (!last || (last.runs === 0 && last.wickets === 0 && last.overs === 0)) return '';
  return `${last.overs} ov`;
}

export default function CricketMatchRoom({ match: initialMatch, user, onBack }: Props) {
  const { status: sessionStatus } = useSession();
  const [match, setMatch] = useState<CricketMatch>(initialMatch);
  const [activeTab, setActiveTab] = useState<CricketTabId>('predictions');
  const [messages, setMessages] = useState<Record<'predictions' | 'banter', Message[]>>({
    predictions: [], banter: [],
  });
  const [votes, setVotes] = useState<VoteTally>({ home: 0, draw: 0, away: 0 });
  const [userVote, setUserVote] = useState<VoteChoice | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(`ffc_uservote_${initialMatch.id}`);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed === 'home' || parsed === 'away') return parsed;
      return null;
    } catch { return null; }
  });
  const [realtime, setRealtime] = useState<RealtimeConfig | null>(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu';
    return key ? { key, cluster } : null;
  });
  const pusherRef = useRef<Pusher | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Load realtime config from server if not in env
  useEffect(() => {
    if (realtime?.key) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/pusher-config');
        if (!res.ok) return;
        const data = await res.json() as Partial<RealtimeConfig>;
        if (cancelled || typeof data.key !== 'string' || !data.key.trim()) return;
        setRealtime({
          key: data.key,
          cluster: typeof data.cluster === 'string' && data.cluster.trim() ? data.cluster : 'eu',
        });
      } catch { /* ignore */ }
    }
    load();
    return () => { cancelled = true; };
  }, [realtime?.key]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [pRes, bRes, vRes, mRes] = await Promise.all([
          fetch(`/api/messages?matchId=${match.id}&tab=predictions`, { cache: 'no-store' }),
          fetch(`/api/messages?matchId=${match.id}&tab=banter`, { cache: 'no-store' }),
          fetch(`/api/vote?matchId=${match.id}`, { cache: 'no-store' }),
          fetch(`/api/cricket/match?id=${match.id}`, { cache: 'no-store' }),
        ]);
        if (cancelled) return;
        const [pPayload, bPayload, vPayload] = await Promise.all([
          pRes.json(), bRes.json(), vRes.json(),
        ]);
        setMessages({
          predictions: Array.isArray(pPayload.messages) ? pPayload.messages : [],
          banter: Array.isArray(bPayload.messages) ? bPayload.messages : [],
        });
        if (vPayload && typeof vPayload === 'object' && 'tally' in vPayload) {
          setVotes((vPayload as { tally: VoteTally }).tally);
        } else if (vPayload && typeof vPayload === 'object' && 'home' in vPayload) {
          setVotes(vPayload as VoteTally);
        }
        if (mRes.ok) {
          const fresh: CricketMatch = await mRes.json();
          setMatch(fresh);
        }
      } catch (err) {
        console.error('[cricket room] init failed', err);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [match.id]);

  // Poll match detail
  useEffect(() => {
    const delay = match.status === 'live' ? 15_000 : 60_000;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/cricket/match?id=${match.id}`, { cache: 'no-store' });
        if (res.ok) {
          const fresh: CricketMatch = await res.json();
          setMatch(fresh);
        }
      } catch { /* ignore */ }
    }, delay);
    return () => clearInterval(t);
  }, [match.id, match.status]);

  const upsertMessage = useCallback((msg: Message) => {
    if (msg.tab !== 'predictions' && msg.tab !== 'banter') return;
    const key: 'predictions' | 'banter' = msg.tab;
    setMessages((prev) => {
      const existing = prev[key] || [];
      if (existing.some((m) => m.id === msg.id)) return prev;
      return { ...prev, [key]: [...existing, msg] };
    });
  }, []);

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
      const tally = parseVoteUpdated(raw);
      if (tally) setVotes(tally);
    });
    channel.bind('reaction-updated', ({ messageId, reactions }: { messageId: string; reactions: Reactions }) => {
      setMessages((prev) => {
        const next: Record<'predictions' | 'banter', Message[]> = { predictions: [], banter: [] };
        for (const tab of ['predictions', 'banter'] as const) {
          next[tab] = (prev[tab] || []).map((m) =>
            m.id === messageId ? { ...m, reactions: reactions || {} } : m
          );
        }
        return next;
      });
    });
    return () => {
      channel.unbind_all();
      pusherRef.current?.unsubscribe(`match-${match.id}`);
      pusherRef.current?.disconnect();
    };
  }, [match.id, realtime, upsertMessage]);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;
    if (isCricketMatchReadOnly(match)) return;
    if (sessionStatus !== 'authenticated') {
      setShowAuthModal(true);
      return;
    }
    const chatTab = toChatTab(activeTab);
    if (!chatTab) return;
    try {
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          tab: chatTab,
          userId: user.userId,
          username: user.username,
          fanTeamId: user.cricketFanTeamId ?? null,
          image: user.image,
          text,
        }),
      });
      if (!res.ok) return;
      const payload = await res.json();
      const msg: Message = payload && typeof payload === 'object' && 'message' in payload
        ? payload.message : payload;
      if (msg) upsertMessage(msg);
    } catch (err) {
      console.error('[cricket] send failed', err);
    }
  }, [match, activeTab, user, upsertMessage, sessionStatus]);

  const reactToMessage = useCallback(async (messageId: string, tab: 'predictions' | 'banter', emoji: string): Promise<void> => {
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
          username: user.username,
          image: user.image,
        }),
      });
    } catch (err) {
      console.error('[cricket] react failed', err);
    }
  }, [match.id, user.userId, user.username, user.image]);

  const castVote = useCallback(async (vote: VoteChoice): Promise<void> => {
    if (isCricketMatchReadOnly(match)) return;
    if (sessionStatus !== 'authenticated') {
      setShowAuthModal(true);
      return;
    }
    if (vote === 'draw') return;
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
          fanTeamId: user.cricketFanTeamId ?? null,
        }),
      });
      const data = await res.json();
      if (data && typeof data === 'object' && 'tally' in data) {
        setVotes((data as { tally: VoteTally }).tally);
      } else if (data && typeof data === 'object' && 'home' in data) {
        setVotes(data as VoteTally);
      }
      setUserVote(vote);
      try { localStorage.setItem(`ffc_uservote_${match.id}`, JSON.stringify(vote)); } catch {}
    } catch (err) {
      console.error('[cricket] vote failed', err);
    }
  }, [match, user, sessionStatus]);

  const isLive = match.status === 'live';
  const isReadOnly = isCricketMatchReadOnly(match);
  const requireLoginForPrediction = sessionStatus !== 'authenticated';
  const chatOpen = isCricketChatOpen(match);
  const canOpenBanter = chatOpen || isReadOnly;
  const banterEmptyStateText = isReadOnly
    ? 'Match ended. Banter is available in read-only mode.'
    : undefined;

  // If user lands on the banter tab while chat is closed, bounce them to predictions.
  useEffect(() => {
    if (activeTab === 'banter' && !canOpenBanter) setActiveTab('predictions');
  }, [activeTab, canOpenBanter]);

  return (
    <div className="ckr-room">
      {/* Top strip */}
      <div className="ckr-header">
        <button className="ckr-back" onClick={onBack} aria-label="Back to matches">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="ckr-strip">
          <div className="ckr-strip-team ckr-strip-team--home">
            <div className="ckr-strip-crest" style={{ background: match.home.color || '#334779' }}>
              {match.home.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.home.logo} alt="" />
              ) : (
                <span>{match.home.shortName.slice(0, 3)}</span>
              )}
            </div>
            <div className="ckr-strip-text">
              <div className="ckr-strip-name">{match.home.shortName}</div>
              <div className="ckr-strip-score">
                <span className="ckr-strip-runs">{headerScore(match, 'home')}</span>
                {headerOvers(match, 'home') && (
                  <span className="ckr-strip-overs">{headerOvers(match, 'home')}</span>
                )}
              </div>
            </div>
          </div>

          <div className="ckr-strip-center">
            {isLive ? (
              <span className="ckr-strip-live">
                <span className="ckr-strip-dot" />
                LIVE
              </span>
            ) : match.status === 'finished' ? (
              <span className="ckr-strip-state">FT</span>
            ) : (
              <span className="ckr-strip-state">
                {new Date(match.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span className="ckr-strip-vs">vs</span>
          </div>

          <div className="ckr-strip-team ckr-strip-team--away">
            <div className="ckr-strip-text ckr-strip-text--right">
              <div className="ckr-strip-name">{match.away.shortName}</div>
              <div className="ckr-strip-score">
                {headerOvers(match, 'away') && (
                  <span className="ckr-strip-overs">{headerOvers(match, 'away')}</span>
                )}
                <span className="ckr-strip-runs">{headerScore(match, 'away')}</span>
              </div>
            </div>
            <div className="ckr-strip-crest" style={{ background: match.away.color || '#334779' }}>
              {match.away.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.away.logo} alt="" />
              ) : (
                <span>{match.away.shortName.slice(0, 3)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="ckr-tabs" aria-label="Match sections">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          const isLocked = t.id === 'banter' && !canOpenBanter;
          return (
            <button
              key={t.id}
              type="button"
              className={`ckr-tab ${active ? 'active' : ''} ${isLocked ? 'ckr-tab--locked' : ''}`}
              onClick={() => { if (!isLocked) setActiveTab(t.id); }}
              aria-current={active ? 'page' : undefined}
              aria-disabled={isLocked || undefined}
              disabled={isLocked}
              title={isLocked ? 'Banter opens once the match goes live' : undefined}
            >
              <span className="ckr-tab-icon">{t.icon}</span>
              <span className="ckr-tab-label">{t.label}</span>
              {isLocked && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ckr-tab-lock" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="ckr-content">
        {activeTab === 'predictions' && (
          <div className="ckr-predict-center">
            <CricketVotePicker
              match={match}
              votes={votes}
              userVote={userVote}
              onVote={castVote}
              readOnly={isReadOnly}
              requireLogin={requireLoginForPrediction}
            />
          </div>
        )}

        {activeTab === 'scorecard' && (
          <div className="ckr-scroll">
            <CricketScorecard match={match} />
          </div>
        )}

        {activeTab === 'squad' && (
          <div className="ckr-scroll">
            <CricketSquad match={match} />
          </div>
        )}

        {activeTab === 'banter' && (
          canOpenBanter ? (
            <ChatPanel
              messages={messages.banter}
              user={user}
              onSendMessage={sendMessage}
              onReact={(id: string, emoji: string) => reactToMessage(id, 'banter', emoji)}
              placeholder="Talk your talk…"
              linkSenderProfile
              compact
              readOnly={isReadOnly}
              emptyStateText={banterEmptyStateText}
            />
          ) : (
            <div className="ckr-banter-locked">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <h3>Banter opens at match start</h3>
              <p>Predictions and squad info are available now. Come back when the action begins.</p>
            </div>
          )
        )}
      </div>
      {showAuthModal && (
        <AuthRequiredModal
          title="Login required to participate"
          message="You can read this room as a guest. Login or signup to post messages and make predictions."
          onClose={() => setShowAuthModal(false)}
          onContinue={() => {
            setShowAuthModal(false);
            void startGoogleSignInRedirect();
          }}
        />
      )}
    </div>
  );
}
