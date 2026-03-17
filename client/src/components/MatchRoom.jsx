import React, { useState, useEffect, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';
import ChatPanel from './ChatPanel';
import TeamSheet from './TeamSheet';
import Predictions from './Predictions';
import './MatchRoom.css';

const TABS = [
  { id: 'predictions', label: '🎯 Predictions', desc: 'Scoreline calls & votes' },
  { id: 'teamsheet',   label: '📋 Team Sheet',  desc: 'Lineup talk & reactions' },
  { id: 'banter',      label: '🔥 Banter',      desc: 'Rival fan trash talk' },
];

export default function MatchRoom({ match, user, onBack }) {
  const [activeTab, setActiveTab] = useState('predictions');
  const [messages, setMessages] = useState({ predictions: [], teamsheet: [], banter: [] });
  const [votes, setVotes] = useState({ home: 0, draw: 0, away: 0 });
  const [userVote, setUserVote] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    async function init() {
      try {
        // Load messages for all three tabs in parallel
        const [pRes, tRes, bRes, vRes] = await Promise.all([
          fetch(`/api/messages?matchId=${match.id}&tab=predictions`),
          fetch(`/api/messages?matchId=${match.id}&tab=teamsheet`),
          fetch(`/api/messages?matchId=${match.id}&tab=banter`),
          fetch(`/api/vote?matchId=${match.id}`),
        ]);
        const [predictions, teamsheet, banter, tally] = await Promise.all([
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

  // Subscribe to Pusher channel
  useEffect(() => {
    const key = process.env.REACT_APP_PUSHER_KEY;
    const cluster = process.env.REACT_APP_PUSHER_CLUSTER || 'eu';

    if (!key) {
      console.warn('REACT_APP_PUSHER_KEY not set — real-time updates disabled');
      return;
    }

    pusherRef.current = new Pusher(key, { cluster });
    const channel = pusherRef.current.subscribe(`match-${match.id}`);
    channelRef.current = channel;

    channel.bind('new-message', (msg) => {
      setMessages(prev => ({
        ...prev,
        [msg.tab]: [...(prev[msg.tab] || []), msg],
      }));
    });

    channel.bind('vote-updated', (tally) => {
      setVotes(tally);
    });

    channel.bind('reaction-updated', ({ messageId, reactions }) => {
      setMessages(prev => {
        const updated = {};
        for (const tab of ['predictions', 'teamsheet', 'banter']) {
          updated[tab] = (prev[tab] || []).map(m =>
            m.id === messageId ? { ...m, reactions } : m
          );
        }
        return updated;
      });
    });

    channel.bind('user-event', ({ text }) => {
      addNotification(text);
    });

    return () => {
      channel.unbind_all();
      pusherRef.current.unsubscribe(`match-${match.id}`);
      pusherRef.current.disconnect();
    };
  }, [match.id]);

  function addNotification(text) {
    const id = Date.now();
    setNotifications(n => [...n, { id, text }]);
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 3500);
  }

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    try {
      await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          tab: activeTab,
          userId: user.userId,
          username: user.username,
          fanTeamId: user.fanTeamId,
          text,
        }),
      });
    } catch (err) {
      console.error('Send failed', err);
    }
  }, [match.id, activeTab, user]);

  const reactToMessage = useCallback(async (messageId, tab, emoji) => {
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

  const castVote = useCallback(async (vote) => {
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, userId: user.userId, vote }),
      });
      const tally = await res.json();
      setVotes(tally);
      setUserVote(vote);
    } catch (err) {
      console.error('Vote failed', err);
    }
  }, [match.id, user.userId]);

  const kickoff = new Date(match.kickoff);
  const isLive = match.status === 'live';
  const kickoffStr = kickoff.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="match-room">
      {/* Toast notifications */}
      <div className="notifications">
        {notifications.map(n => (
          <div key={n.id} className="notification">{n.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="room-header">
        <button className="back-btn" onClick={onBack}>← All Matches</button>

        <div className="room-match-info">
          <div className="room-teams">
            <span className="room-badge">{match.homeTeam.badge}</span>
            <div className="room-team-names">
              <span className="room-home">{match.homeTeam.name}</span>
              <span className="room-divider">vs</span>
              <span className="room-away">{match.awayTeam.name}</span>
            </div>
            <span className="room-badge">{match.awayTeam.badge}</span>
          </div>

          <div className="room-meta">
            <span className="room-competition">{match.competition} · {match.venue}</span>
            {isLive ? (
              <span className="room-live-badge">🔴 LIVE NOW</span>
            ) : (
              <span className="room-kickoff">⏰ {kickoffStr}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
            {messages[tab.id]?.length > 0 && (
              <span className="tab-count">{messages[tab.id].length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="room-content">
        {activeTab === 'predictions' && (
          <Predictions
            match={match}
            votes={votes}
            userVote={userVote}
            onVote={castVote}
            messages={messages.predictions}
            user={user}
            onSendMessage={sendMessage}
            onReact={(id, emoji) => reactToMessage(id, 'predictions', emoji)}
          />
        )}
        {activeTab === 'teamsheet' && (
          <div className="teamsheet-chat-layout">
            <TeamSheet match={match} />
            <ChatPanel
              tab="teamsheet"
              messages={messages.teamsheet}
              user={user}
              onSendMessage={sendMessage}
              onReact={(id, emoji) => reactToMessage(id, 'teamsheet', emoji)}
              placeholder="React to the lineup..."
            />
          </div>
        )}
        {activeTab === 'banter' && (
          <ChatPanel
            tab="banter"
            messages={messages.banter}
            user={user}
            onSendMessage={sendMessage}
            onReact={(id, emoji) => reactToMessage(id, 'banter', emoji)}
            placeholder="Start the banter... 🔥"
            fullHeight
          />
        )}
      </div>
    </div>
  );
}
