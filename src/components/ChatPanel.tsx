'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Message, User } from '@/lib/types';
import { TEAMS } from '@/lib/teams';
import TeamLogoImage from './TeamLogoImage';
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
  onLoadOlder?: () => void;
  hasMore?: boolean;
  loadingOlder?: boolean;
  placeholder?: string;
  fullHeight?: boolean;
  /** Denser bubbles and spacing — fits more messages on screen */
  compact?: boolean;
  /** When true, hide the input composer (read-only feed). */
  readOnly?: boolean;
}

export default function ChatPanel({
  messages,
  user,
  onSendMessage,
  onReact,
  onLoadOlder,
  hasMore = false,
  loadingOlder = false,
  placeholder,
  fullHeight,
  compact,
  readOnly = false,
}: ChatPanelProps) {
  const [input, setInput] = useState<string>('');
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prevCountRef = useRef(messages.length);
  useEffect(() => {
    // Only auto-scroll when a new message is added, not on tab switch
    if (messages.length > prevCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100); // delay for mobile keyboard to finish opening
  };

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
    inputRef.current?.focus();
  };

  const teamColor = (fanTeamId: string | null): string =>
    fanTeamId ? TEAM_COLORS[fanTeamId] || 'var(--accent-blue)' : 'var(--accent-blue)';

  const getTeamInfo = (fanTeamId: string | null) => {
    if (!fanTeamId) return null;
    const team = TEAMS.find((item) => item.id === fanTeamId);
    if (!team) return null;
    return team;
  };

  const formatTime = (ts: string): string => {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const parseFangroundUserMention = (
    text: string
  ): { profileSlug: string; displayName: string; rest: string } | null => {
    // Format: [[user|<profileSlug>|<displayName>]] <rest>
    const m = text.match(/^\[\[user\|([^|]+)\|([^\]]+)\]\]\s*(.*)$/);
    if (!m) return null;
    const profileSlug = (m[1] ?? '').trim();
    const displayName = (m[2] ?? '').trim();
    const rest = m[3] ?? '';
    if (!profileSlug || !displayName) return null;
    return { profileSlug, displayName, rest };
  };

  return (
    <div className={`cp ${fullHeight ? 'cp-full' : ''} ${compact ? 'cp-compact' : ''}`} onClick={() => setShowEmojiFor(null)}>

      {/* Messages */}
      <div className="cp-messages">
        {onLoadOlder && hasMore && (
          <button
            type="button"
            className="cp-load-older"
            onClick={onLoadOlder}
            disabled={loadingOlder}
          >
            {loadingOlder ? 'Loading...' : 'Load older messages'}
          </button>
        )}
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

        {messages.map((msg, index) => {
          const isOwn = msg.userId === user.userId;
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showSenderMeta = !prevMsg || prevMsg.userId !== msg.userId;
          const color = teamColor(msg.fanTeamId);
          const teamInfo = getTeamInfo(msg.fanTeamId);

          return (
            <div key={msg.id} className={`cp-msg ${isOwn ? 'own' : ''} ${!showSenderMeta ? 'cp-msg-cont' : ''}`}>
              {showSenderMeta ? (
                <div className="cp-msg-avatar" style={{ background: color }}>
                  {msg.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- OAuth avatars use many domains; next/image would error without listing every host
                    <img src={msg.image} alt="" width={compact ? 24 : 32} height={compact ? 24 : 32} />
                  ) : (
                    msg.username?.[0]?.toUpperCase()
                  )}
                </div>
              ) : (
                <div className="cp-msg-avatar-spacer" />
              )}

              <div className="cp-msg-body">
                {showSenderMeta && (
                  <div className="cp-msg-meta">
                    <span className="cp-msg-name" style={{ color }}>{msg.username}</span>
                  </div>
                )}
                {showSenderMeta && teamInfo && (
                  <div className="cp-msg-team-row">
                    <span className="cp-msg-team">
                      <TeamLogoImage src={teamInfo.logo} alt="" className="cp-msg-team-logo" />
                      <span className="cp-msg-team-name">{teamInfo.name}</span>
                    </span>
                  </div>
                )}

                <div className="cp-bubble-wrap">
                  <div className={`cp-bubble ${isOwn ? 'cp-bubble-own' : ''}`}>
                    {msg.userId === 'fanground' ? (() => {
                      const parsed = parseFangroundUserMention(msg.text);
                      if (!parsed) return msg.text;
                      return (
                        <>
                          <Link className="cp-sys-userlink" href={`/profile/${encodeURIComponent(parsed.profileSlug)}`}>
                            {parsed.displayName}
                          </Link>{' '}
                          <span>{parsed.rest}</span>
                        </>
                      );
                    })() : msg.text}
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
                  <span className="cp-msg-time">{formatTime(msg.timestamp)}</span>
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
      {!readOnly && (
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
              onFocus={scrollToBottom}
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
      )}
    </div>
  );
}
