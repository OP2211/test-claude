'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message, User } from '@/lib/types';
import './ChatPanel.css';

const TEAM_COLORS: Record<string, string> = {
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

const QUICK_REACTIONS: string[] = ['😂', '🔥', '💪', '😤', '🎯', '👏'];

interface ChatPanelProps {
  messages: Message[];
  user: User;
  onSendMessage: (text: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  placeholder?: string;
  fullHeight?: boolean;
  /** Denser bubbles and spacing — fits more messages on screen */
  compact?: boolean;
}

export default function ChatPanel({ messages, user, onSendMessage, onReact, placeholder, fullHeight, compact }: ChatPanelProps) {
  const [input, setInput] = useState<string>('');
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
    inputRef.current?.focus();
  };

  const teamColor = (fanTeamId: string | null): string =>
    fanTeamId ? TEAM_COLORS[fanTeamId] || 'var(--accent-blue)' : 'var(--accent-blue)';

  const formatTime = (ts: string): string => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`cp ${fullHeight ? 'cp-full' : ''} ${compact ? 'cp-compact' : ''}`} onClick={() => setShowEmojiFor(null)}>

      {/* Messages */}
      <div className="cp-messages">
        {messages.length === 0 && (
          <div className="cp-empty">
            <div className="cp-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="cp-empty-text">Be the first to talk!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.userId === user.userId;
          const color = teamColor(msg.fanTeamId);

          return (
            <div key={msg.id} className={`cp-msg ${isOwn ? 'own' : ''}`}>
              {!isOwn && (
                <div className="cp-msg-avatar" style={{ background: color }}>
                  {msg.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- OAuth avatars use many domains; next/image would error without listing every host
                    <img src={msg.image} alt="" width={compact ? 24 : 32} height={compact ? 24 : 32} />
                  ) : (
                    msg.username?.[0]?.toUpperCase()
                  )}
                </div>
              )}

              <div className="cp-msg-body">
                {!isOwn && (
                  <div className="cp-msg-meta">
                    <span className="cp-msg-name" style={{ color }}>{msg.username}</span>
                    <span className="cp-msg-time">{formatTime(msg.timestamp)}</span>
                  </div>
                )}

                <div className="cp-bubble-wrap">
                  <div className={`cp-bubble ${isOwn ? 'cp-bubble-own' : ''}`}>
                    {msg.text}
                  </div>
                  {msg.moderation?.moderated && (
                    <span
                      className="cp-moderation-badge"
                      title={`Content moderated by admin: ${msg.moderation.reason}`}
                      aria-label={`Content moderated by admin: ${msg.moderation.reason}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                    </span>
                  )}
                  {isOwn && <span className="cp-msg-time own-t">{formatTime(msg.timestamp)}</span>}
                </div>

                {/* Reactions */}
                <div className="cp-reactions">
                  {Object.entries(msg.reactions || {}).map(([emoji, users]) => (
                    users.length > 0 && (
                      <button
                        key={emoji}
                        className={`cp-react-chip ${users.includes(user.userId) ? 'mine' : ''}`}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onReact(msg.id, emoji); }}
                      >
                        {emoji}<span className="cp-react-count">{users.length}</span>
                      </button>
                    )
                  ))}
                  <button
                    className="cp-react-add"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                  </button>

                  {showEmojiFor === msg.id && (
                    <div className="cp-emoji-picker" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      {QUICK_REACTIONS.map(e => (
                        <button
                          key={e}
                          className="cp-emoji-btn"
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
      <div className="cp-input-bar">
        <div className="cp-input-wrap">
          <div className="cp-input-avatar" style={{ background: teamColor(user.fanTeamId) }}>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- OAuth avatars use many domains
              <img src={user.image} alt="" width={compact ? 22 : 26} height={compact ? 22 : 26} />
            ) : (
              user.username?.[0]?.toUpperCase()
            )}
          </div>
          <input
            ref={inputRef}
            className="cp-input"
            type="text"
            value={input}
            maxLength={500}
            placeholder={placeholder || 'Message...'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <button
            className={`cp-send ${input.trim() ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
