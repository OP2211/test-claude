import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatPanel from './ChatPanel';
import TeamSheet from './TeamSheet';
import Predictions from './Predictions';
import './MatchRoom.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

const TABS = [
  { id: 'predictions', label: '🎯 Predictions', desc: 'Scoreline calls & votes' },
  { id: 'teamsheet',   label: '📋 Team Sheet',  desc: 'Lineup talk & reactions' },
  { id: 'banter',      label: '🔥 Banter',      desc: 'Rival fan trash talk' },
];

export default function MatchRoom({ match, user, socket, onBack }) {
  const [activeTab, setActiveTab] = useState('predictions');
  const [messages, setMessages] = useState({ predictions: [], teamsheet: [], banter: [] });
  const [votes, setVotes] = useState({ home: 0, draw: 0, away: 0 });
  const [userVote, setUserVote] = useState(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [notifications, setNotifications] = useState([]);
  const joinedRef = useRef(false);

  // Join the match room
  useEffect(() => {
    if (!socket || joinedRef.current) return;
    joinedRef.current = true;

    socket.emit('join_match', {
      matchId: match.id,
      userId: user.userId,
      username: user.username,
      fanTeamId: user.fanTeamId,
    });

    socket.on('room_history', ({ predictions, teamsheet, banter }) => {
      setMessages({ predictions, teamsheet, banter });
    });

    socket.on('votes_updated', (tally) => {
      setVotes(tally);
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => ({
        ...prev,
        [msg.tab]: [...(prev[msg.tab] || []), msg],
      }));
    });

    socket.on('reaction_updated', ({ messageId, reactions }) => {
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

    socket.on('online_count', setOnlineCount);

    socket.on('user_joined', ({ username, teamName }) => {
      if (username !== user.username) {
        addNotification(`${username} (${teamName}) joined`);
      }
    });

    socket.on('user_left', ({ username }) => {
      if (username !== user.username) {
        addNotification(`${username} left`);
      }
    });

    return () => {
      ['room_history', 'votes_updated', 'new_message', 'reaction_updated',
       'online_count', 'user_joined', 'user_left'].forEach(e => socket.off(e));
    };
  }, [socket, match.id, user]);

  // Fetch user's existing vote
  useEffect(() => {
    fetch(`${SERVER_URL}/api/matches/${match.id}/predictions/votes`)
      .then(r => r.json())
      .then(setVotes)
      .catch(() => {});
  }, [match.id]);

  function addNotification(text) {
    const id = Date.now();
    setNotifications(n => [...n, { id, text }]);
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 3500);
  }

  const sendMessage = useCallback((text) => {
    if (!text.trim() || !socket) return;
    socket.emit('send_message', {
      matchId: match.id,
      tab: activeTab,
      userId: user.userId,
      username: user.username,
      fanTeamId: user.fanTeamId,
      text,
    });
  }, [socket, match.id, activeTab, user]);

  const reactToMessage = useCallback((messageId, tab, emoji) => {
    if (!socket) return;
    socket.emit('react_message', {
      matchId: match.id,
      messageId,
      tab,
      emoji,
      userId: user.userId,
    });
  }, [socket, match.id, user.userId]);

  const castVote = useCallback(async (vote) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/matches/${match.id}/predictions/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, vote }),
      });
      const data = await res.json();
      setVotes(data);
      setUserVote(vote);
    } catch {}
  }, [match.id, user.userId]);

  const kickoff = new Date(match.kickoff);
  const isLive = match.status === 'live';
  const kickoffStr = kickoff.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  });

  const unreadByTab = { predictions: 0, teamsheet: 0, banter: 0 };

  return (
    <div className="match-room">
      {/* Notifications */}
      <div className="notifications">
        {notifications.map(n => (
          <div key={n.id} className="notification">{n.text}</div>
        ))}
      </div>

      {/* Room header */}
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
            <span className="room-online">👥 {onlineCount} online</span>
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
