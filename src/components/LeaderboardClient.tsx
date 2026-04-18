'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Heart, MessageSquare } from 'lucide-react';
import TeamLogoImage from '@/components/TeamLogoImage';
import EarlyAdopterBadge from '@/components/EarlyAdopterBadge';
import { TEAMS } from '@/lib/teams';
import type { LeaderboardProfile } from '@/lib/profile-repo';

type LeaderboardSort = 'latest' | 'messages' | 'reactions' | 'invites' | 'name';

interface ApiResponse {
  users: LeaderboardProfile[];
  total: number;
  hasMore: boolean;
  page: number;
}

const FOUNDING_FAN_TIER_CLASS: Record<'founding' | 'silver' | 'bronze', string> = {
  founding: 'leaderboard-badge--founding-gold',
  silver: 'leaderboard-badge--founding-silver',
  bronze: 'leaderboard-badge--founding-bronze',
};

export default function LeaderboardClient() {
  const [profiles, setProfiles] = useState<LeaderboardProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<LeaderboardSort>('latest');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setPage(1);
    setProfiles([]);
  }, [debouncedSearch, sort]);

  // Fetch data (min 400ms loading for skeleton visibility)
  const fetchData = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    const start = Date.now();
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        sort,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/leaderboard?${params}`);
      const data: ApiResponse = await res.json();

      // Ensure skeleton shows for at least 400ms so it doesn't flash
      const elapsed = Date.now() - start;
      if (append && elapsed < 400) {
        await new Promise(r => setTimeout(r, 400 - elapsed));
      }

      if (append) {
        setProfiles(prev => [...prev, ...data.users]);
      } else {
        setProfiles(data.users);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort, debouncedSearch]);

  useEffect(() => {
    void fetchData(page, page > 1);
  }, [page, fetchData]);

  // Infinite scroll — observe sentinel element
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore && hasMore) {
          setPage(p => p + 1);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  const handleSortChange = (newSort: LeaderboardSort) => {
    setSort(newSort);
  };

  // Compute badges
  const mostMessages = profiles.reduce((max, p) => Math.max(max, p.messagesSent), 0);
  const mostReactions = profiles.reduce((max, p) => Math.max(max, p.reactionsReceived), 0);

  return (
    <section className="leaderboard-card" aria-label="Leaderboard">
      <div className="leaderboard-head">
        <h1 className="leaderboard-title">Leaderboard</h1>
        <p className="leaderboard-subtitle">All users with teams, stats, and badges.</p>

        {/* Search */}
        <div className="lb-search-wrap">
          <svg className="lb-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="lb-search-input"
            placeholder="Search by name or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="lb-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="leaderboard-sort-row" aria-label="Sort leaderboard">
          <span className="leaderboard-sort-label">Sort:</span>
          {(['latest', 'messages', 'reactions', 'invites', 'name'] as const).map(s => (
            <button
              key={s}
              className={`leaderboard-sort-link ${sort === s ? 'is-active' : ''}`}
              onClick={() => handleSortChange(s)}
            >
              {s === 'latest' ? 'Latest' : s === 'messages' ? 'Messages' : s === 'reactions' ? 'Reactions' : s === 'invites' ? 'Referrals' : 'Name'}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <p className="lb-count">
          Showing {profiles.length} of {total} fan{total !== 1 ? 's' : ''}
          {debouncedSearch && <span> matching &ldquo;{debouncedSearch}&rdquo;</span>}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="lb-loading">
          <div className="lb-spinner" />
        </div>
      )}

      {/* Empty state */}
      {!loading && profiles.length === 0 && (
        <div className="lb-empty">
          <p>No fans found{debouncedSearch ? ` matching "${debouncedSearch}"` : ''}.</p>
        </div>
      )}

      {/* Table */}
      {!loading && profiles.length > 0 && (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Team</th>
                <th>
                  <span className="leaderboard-th-long">Messages Sent</span>
                  <span className="leaderboard-th-short">Msgs</span>
                </th>
                <th>
                  <span className="leaderboard-th-long">Reactions Received</span>
                  <span className="leaderboard-th-short">Reacts</span>
                </th>
                <th>
                  <span className="leaderboard-th-long">Referrals</span>
                  <span className="leaderboard-th-short">Referrals</span>
                </th>
                <th>Badges</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const team = TEAMS.find((item) => item.id === profile.fan_team_id) ?? null;
                const displayName = profile.full_name?.trim() || profile.username;
                return (
                  <tr key={profile.google_sub}>
                    <td data-label="Name">
                      <Link href={`/profile/${encodeURIComponent(profile.username)}`} className="leaderboard-user-link">
                        <span className="leaderboard-user-cell">
                          <span className="leaderboard-user-avatar" aria-hidden>
                            {profile.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={profile.image} alt="" />
                            ) : (
                              displayName[0]?.toUpperCase() ?? '?'
                            )}
                          </span>
                          <span className="leaderboard-user-meta">
                            <span className="leaderboard-user-name">{displayName}</span>
                            <span className="leaderboard-user-username">@{profile.username}</span>
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td data-label="Team">
                      {team ? (
                        <span className="leaderboard-team">
                          <TeamLogoImage src={team.logo} alt={`${team.name} logo`} className="leaderboard-team-logo" />
                          <span>{team.name}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td data-label="Messages Sent">{profile.messagesSent}</td>
                    <td data-label="Reactions Received">{profile.reactionsReceived}</td>
                    <td data-label="Referrals">{profile.successfulInvites}</td>
                    <td data-label="Badges">
                      <div className="leaderboard-badges">
                        <EarlyAdopterBadge />
                        {mostMessages > 0 && profile.messagesSent === mostMessages && (
                          <span className="leaderboard-badge leaderboard-badge--messages" aria-label="Badge: Most Messages">
                            <MessageSquare size={13} aria-hidden />
                            <span className="leaderboard-badge-text">Most Messages</span>
                          </span>
                        )}
                        {mostReactions > 0 && profile.reactionsReceived === mostReactions && (
                          <span className="leaderboard-badge leaderboard-badge--reactions" aria-label="Badge: Most Reactions">
                            <Heart size={13} aria-hidden />
                            <span className="leaderboard-badge-text">Most Reactions</span>
                          </span>
                        )}
                        {profile.foundingFanTier && team && (
                          <span
                            className={`leaderboard-badge ${FOUNDING_FAN_TIER_CLASS[profile.foundingFanTier]}`}
                            aria-label="Badge: Founding Fan"
                          >
                            <TeamLogoImage src={team.logo} alt="" className="leaderboard-badge-team-logo" />
                            <span className="leaderboard-badge-text">Founding Fan</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Infinite scroll sentinel + skeleton rows */}
      {hasMore && !loading && (
        <div ref={sentinelRef} className="lb-sentinel">
          {loadingMore && (
            <div className="lb-skeleton-rows">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="lb-skeleton-row">
                  <div className="lb-sk-avatar" />
                  <div className="lb-sk-lines">
                    <div className="lb-sk-line lb-sk-w60" />
                    <div className="lb-sk-line lb-sk-w40" />
                  </div>
                  <div className="lb-sk-line lb-sk-w20" />
                  <div className="lb-sk-line lb-sk-w20" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
