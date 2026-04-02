'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';
import type { Match, User, Message, VoteTally, VoteChoice, TabId, Reactions } from '@/lib/types';
import ChatPanel from './ChatPanel';
import TeamSheet from './TeamSheet';
import Predictions from './Predictions';
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
  id: number;
  text: string;
}

export default function MatchRoom({ match, user, onBack }: MatchRoomProps) {
  const [activeTab, setActiveTab] = useState<TabId>('predictions');
  const [messages, setMessages] = useState<MessagesByTab>({ predictions: [], teamsheet: [], banter: [] });
  const [votes, setVotes] = useState<VoteTally>({ home: 0, draw: 0, away: 0 });
  const [userVote, setUserVote] = useState<VoteChoice | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const pusherRef = useRef<Pusher | null>(null);

  const upsertMessage = useCallback((msg: Message) => {
    setMessages(prev => {
      const tab = msg.tab as keyof MessagesByTab;
      const existing = prev[tab] || [];
      if (existing.some(m => m.id === msg.id)) return prev;
      return { ...prev, [tab]: [...existing, msg] };
    });
  }, []);

  // Fetch initial data
  useEffect(() => {
    async function init() {
      try {
        const [pRes, tRes, bRes, vRes] = await Promise.all([
          fetch(`/api/messages?matchId=${match.id}&tab=predictions`),
          fetch(`/api/messages?matchId=${match.id}&tab=teamsheet`),
          fetch(`/api/messages?matchId=${match.id}&tab=banter`),
          fetch(`/api/vote?matchId=${match.id}`),
        ]);
        const [predictions, teamsheet, banter, tally]: [Message[], Message[], Message[], VoteTally] = await Promise.all([
          pRes.json(), tRes.json(), bRes.json(), vRes.json(),
        ]);
        setMessages({ predictions, teamsheet, banter });
        setVotes(tally);
      } catch (err) {
        console.error('Failed to load room data', err);
      }
    }
    init();
  }, [match.id]);

  // Pusher subscription
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu';
    if (!key) return;

    pusherRef.current = new Pusher(key, { cluster });
    const channel = pusherRef.current.subscribe(`match-${match.id}`);

    channel.bind('new-message', (msg: Message) => {
      upsertMessage(msg);
    });

    channel.bind('vote-updated', (tally: VoteTally) => setVotes(tally));

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
  }, [match.id, upsertMessage]);

  function addNotification(text: string): void {
    const id = Date.now();
    setNotifications(n => [...n, { id, text }]);
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 3500);
  }

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
      const msg: Message = await res.json();
      // Ensure the sender sees their message even if realtime is misconfigured.
      upsertMessage(msg);
    } catch (err) {
      console.error('Send failed', err);
    }
  }, [match.id, activeTab, user, upsertMessage]);

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
        body: JSON.stringify({ matchId: match.id, userId: user.userId, vote }),
      });
      const tally: VoteTally = await res.json();
      setVotes(tally);
      setUserVote(vote);
    } catch (err) {
      console.error('Vote failed', err);
    }
  }, [match.id, user.userId]);

  const isLive = match.status === 'live';
  const kickoff = new Date(match.kickoff);
  const kickoffStr = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mr-room">
      {/* Notifications */}
      <div className="mr-toasts">
        {notifications.map(n => (
          <div key={n.id} className="mr-toast">{n.text}</div>
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
          <span className="mr-strip-badge">{match.homeTeam.badge}</span>
          <div className="mr-strip-info">
            <span className="mr-strip-teams">
              {match.homeTeam.shortName} vs {match.awayTeam.shortName}
            </span>
            <span className="mr-strip-meta">
              {isLive ? (
                <span className="mr-strip-live">
                  <span className="mr-strip-live-dot" />
                  LIVE
                </span>
              ) : (
                <>{match.competition} &middot; {kickoffStr}</>
              )}
            </span>
          </div>
          <span className="mr-strip-badge">{match.awayTeam.badge}</span>
        </div>
      </div>

      {/* Tab bar - iOS style segmented control */}
      <div className="mr-tabs">
        <div className="mr-tabs-inner">
          {TABS.map(tab => {
            const count = messages[tab.id]?.length || 0;
            return (
              <button
                key={tab.id}
                className={`mr-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <TabIcon type={tab.icon} active={activeTab === tab.id} />
                <span className="mr-tab-label">{tab.label}</span>
                {count > 0 && (
                  <span className="mr-tab-badge">{count > 99 ? '99+' : count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mr-content">
        {activeTab === 'predictions' && (
          <Predictions
            match={match}
            votes={votes}
            userVote={userVote}
            onVote={castVote}
            messages={messages.predictions}
            user={user}
            onSendMessage={sendMessage}
            onReact={(id: string, emoji: string) => reactToMessage(id, 'predictions', emoji)}
          />
        )}
        {activeTab === 'teamsheet' && (
          <div className="mr-teamsheet-layout">
            <TeamSheet match={match} />
            <ChatPanel
              messages={messages.teamsheet}
              user={user}
              onSendMessage={sendMessage}
              onReact={(id: string, emoji: string) => reactToMessage(id, 'teamsheet', emoji)}
              placeholder="React to the lineup..."
            />
          </div>
        )}
        {activeTab === 'banter' && (
          <ChatPanel
            messages={messages.banter}
            user={user}
            onSendMessage={sendMessage}
            onReact={(id: string, emoji: string) => reactToMessage(id, 'banter', emoji)}
            placeholder="Talk your talk..."
            fullHeight
          />
        )}
      </div>
    </div>
  );
}
