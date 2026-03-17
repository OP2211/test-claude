import React, { useState, useEffect, useRef } from 'react';
import './ChatPanel.css';

const TEAM_COLORS = {
  'manchester-united': '#DA020E',
  'liverpool':         '#C8102E',
  'arsenal':           '#EF0107',
  'chelsea':           '#034694',
  'manchester-city':   '#6CABDD',
  'tottenham':         '#132257',
  'barcelona':         '#A50044',
  'real-madrid':       '#FEBE10',
  'bayern-munich':     '#DC052D',
  'juventus':          '#9a9a9a',
};

const QUICK_REACTIONS = ['😂', '🔥', '💪', '😤', '🎯', '👏'];

export default function ChatPanel({ tab, messages, user, onSendMessage, onReact, placeholder, fullHeight }) {
  const [input, setInput] = useState('');
  const [showEmojiFor, setShowEmojiFor] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
    inputRef.current?.focus();
  };

  const teamColor = (fanTeamId) => TEAM_COLORS[fanTeamId] || '#6060aa';

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`chat-panel ${fullHeight ? 'full-height' : ''}`}
         onClick={() => setShowEmojiFor(null)}>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="chat-empty-icon">💬</span>
            <p>Be the first to talk!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.userId === user.userId;
          const color = teamColor(msg.fanTeamId);
          const totalReactions = Object.values(msg.reactions || {}).reduce((s, arr) => s + arr.length, 0);

          return (
            <div
              key={msg.id}
              className={`chat-message ${isOwn ? 'own' : ''}`}
              onMouseEnter={() => {}}
            >
              {!isOwn && (
                <div className="msg-avatar" style={{ background: color }}>
                  {msg.username?.[0]?.toUpperCase()}
                </div>
              )}

              <div className="msg-body">
                {!isOwn && (
                  <div className="msg-meta">
                    <span className="msg-username" style={{ color }}>{msg.username}</span>
                    <span className="msg-time">{formatTime(msg.timestamp)}</span>
                  </div>
                )}

                <div className="msg-bubble-row">
                  <div className={`msg-bubble ${isOwn ? 'own-bubble' : ''}`}>
                    {msg.text}
                  </div>
                  {isOwn && (
                    <div className="msg-time own-time">{formatTime(msg.timestamp)}</div>
                  )}
                </div>

                {/* Reactions */}
                <div className="msg-reactions-row">
                  {Object.entries(msg.reactions || {}).map(([emoji, users]) => (
                    users.length > 0 && (
                      <button
                        key={emoji}
                        className={`reaction-chip ${users.includes(user.userId) ? 'reacted' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onReact(msg.id, emoji); }}
                      >
                        {emoji} {users.length}
                      </button>
                    )
                  ))}
                  <button
                    className="add-reaction-btn"
                    onClick={(e) => { e.stopPropagation(); setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id); }}
                    title="Add reaction"
                  >
                    +😊
                  </button>

                  {showEmojiFor === msg.id && (
                    <div className="emoji-picker" onClick={e => e.stopPropagation()}>
                      {QUICK_REACTIONS.map(e => (
                        <button
                          key={e}
                          className="emoji-pick"
                          onClick={() => { onReact(msg.id, e); setShowEmojiFor(null); }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <div className="chat-input-inner">
          <div className="input-avatar" style={{ background: teamColor(user.fanTeamId) }}>
            {user.username?.[0]?.toUpperCase()}
          </div>
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            value={input}
            maxLength={500}
            placeholder={placeholder || 'Type a message...'}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <button
            className={`send-btn ${input.trim() ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!input.trim()}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
