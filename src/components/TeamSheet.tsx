'use client';

import { useState } from 'react';
import type { Match, Team } from '@/lib/types';
import TeamLogoImage from './TeamLogoImage';
import './TeamSheet.css';

interface FormationRow {
  pos: string[];
}

const FORMATION_ROWS: Record<string, FormationRow[]> = {
  '4-3-3': [
    { pos: ['GK'] },
    { pos: ['RB', 'CB', 'CB', 'LB'] },
    { pos: ['CM', 'CM', 'CM'] },
    { pos: ['RW', 'ST', 'LW'] },
  ],
  '4-4-2': [
    { pos: ['GK'] },
    { pos: ['RB', 'CB', 'CB', 'LB'] },
    { pos: ['RM', 'CM', 'CM', 'LM'] },
    { pos: ['ST', 'ST'] },
  ],
  '4-2-3-1': [
    { pos: ['GK'] },
    { pos: ['RB', 'CB', 'CB', 'LB'] },
    { pos: ['CDM', 'CDM'] },
    { pos: ['RW', 'AM', 'LW'] },
    { pos: ['ST'] },
  ],
  '4-1-4-1': [
    { pos: ['GK'] },
    { pos: ['RB', 'CB', 'CB', 'LB'] },
    { pos: ['CDM'] },
    { pos: ['RM', 'CM', 'CM', 'LM'] },
    { pos: ['ST'] },
  ],
  '4-2-2-2': [
    { pos: ['GK'] },
    { pos: ['LB', 'LCB', 'RCB', 'RB'] },
    { pos: ['LCM', 'RCM'] },
    { pos: ['LAM', 'RAM'] },
    { pos: ['LCF', 'RCF'] },
  ],
  '3-4-3': [
    { pos: ['GK'] },
    { pos: ['CB', 'CB', 'CB'] },
    { pos: ['RM', 'CM', 'CM', 'LM'] },
    { pos: ['RW', 'ST', 'LW'] },
  ],
  '3-5-2': [
    { pos: ['GK'] },
    { pos: ['CB', 'CB', 'CB'] },
    { pos: ['RM', 'CM', 'CM', 'CM', 'LM'] },
    { pos: ['ST', 'ST'] },
  ],
  '5-3-2': [
    { pos: ['GK'] },
    { pos: ['RWB', 'CB', 'CB', 'CB', 'LWB'] },
    { pos: ['CM', 'CM', 'CM'] },
    { pos: ['ST', 'ST'] },
  ],
  '5-4-1': [
    { pos: ['GK'] },
    { pos: ['RWB', 'CB', 'CB', 'CB', 'LWB'] },
    { pos: ['RM', 'CM', 'CM', 'LM'] },
    { pos: ['ST'] },
  ],
  '4-4-1-1': [
    { pos: ['GK'] },
    { pos: ['RB', 'CB', 'CB', 'LB'] },
    { pos: ['RM', 'CM', 'CM', 'LM'] },
    { pos: ['AM'] },
    { pos: ['ST'] },
  ],
  '4-3-2-1': [
    { pos: ['GK'] },
    { pos: ['RB', 'CB', 'CB', 'LB'] },
    { pos: ['CM', 'CM', 'CM'] },
    { pos: ['AM', 'AM'] },
    { pos: ['ST'] },
  ],
  '3-4-2-1': [
    { pos: ['GK'] },
    { pos: ['CB', 'CB', 'CB'] },
    { pos: ['RM', 'CM', 'CM', 'LM'] },
    { pos: ['AM', 'AM'] },
    { pos: ['ST'] },
  ],
};

/** Dynamically build formation rows from a formation string like "4-2-3-1". */
function parseFormation(formation: string): FormationRow[] {
  const known = FORMATION_ROWS[formation];
  if (known) return known;

  const parts = formation.split('-').map(Number).filter(n => n > 0);
  if (parts.length < 2) return FORMATION_ROWS['4-3-3'];

  const rows: FormationRow[] = [{ pos: ['GK'] }];
  const posLabels = ['CB', 'CM', 'AM', 'ST'];
  parts.forEach((count, i) => {
    const label = posLabels[Math.min(i, posLabels.length - 1)];
    rows.push({ pos: Array(count).fill(label) });
  });
  return rows;
}

interface PitchViewProps {
  team: Team;
  players: string[];
  positions?: string[];
  formation: string;
}

function PitchView({ team, players, positions, formation }: PitchViewProps) {
  const rows = parseFormation(formation);

  // Assign players to rows. Players array is ordered GK → DEF → MID → FWD.
  let playerIdx = 0;
  const assignedRows = rows.map(row => {
    return row.pos.map(fallbackPos => {
      const player = players[playerIdx] || '?';
      // Use real ESPN position if available, otherwise fall back to formation template
      const pos = positions?.[playerIdx] || fallbackPos;
      playerIdx++;
      return { player, pos };
    });
  });

  return (
    <div className="ts-pitch">
      <div className="ts-pitch-surface">
        {/* Field markings */}
        <div className="ts-pitch-halfway" />
        <div className="ts-pitch-circle" />
        <div className="ts-pitch-box top" />
        <div className="ts-pitch-box bottom" />

        {/* Render rows top-to-bottom: attackers first, GK last */}
        {[...assignedRows].reverse().map((row, ri) => (
          <div key={ri} className="ts-pitch-row">
            {row.map((slot, pi) => {
              const surname = slot.player.split(' ').pop();
              return (
                <div key={pi} className="ts-player">
                  <div className="ts-player-dot" style={{ background: team.color, boxShadow: `0 2px 10px ${team.color}60` }}>
                    <span className="ts-player-initial">{slot.player[0] === '?' ? '?' : slot.player[0]}</span>
                  </div>
                  <span className="ts-player-name">{surname}</span>
                  <span className="ts-player-pos">{slot.pos}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TeamSheetProps {
  match: Match;
}

export default function TeamSheet({ match }: TeamSheetProps) {
  const [view, setView] = useState<'home' | 'away'>('home');
  const teamData = view === 'home' ? match.homeTeam : match.awayTeam;
  const sheetData = view === 'home' ? match.teamSheet.home : match.teamSheet.away;
  // Real match-day lineup is only present when positions[] is populated (from ESPN summary)
  const hasRealLineup = Array.isArray(sheetData.positions) && sheetData.positions.length > 0;

  return (
    <div className="ts">
      {/* Team switcher */}
      <div className="ts-switcher">
        <button
          className={`ts-sw-btn ${view === 'home' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          {match.homeTeam.logo ? (
            <TeamLogoImage src={match.homeTeam.logo} alt="" className="ts-sw-logo" />
          ) : (
            <span className="ts-sw-badge">{match.homeTeam.badge}</span>
          )}
          <span className="ts-sw-name">{match.homeTeam.shortName}</span>
        </button>
        <button
          className={`ts-sw-btn ${view === 'away' ? 'active' : ''}`}
          onClick={() => setView('away')}
        >
          {match.awayTeam.logo ? (
            <TeamLogoImage src={match.awayTeam.logo} alt="" className="ts-sw-logo" />
          ) : (
            <span className="ts-sw-badge">{match.awayTeam.badge}</span>
          )}
          <span className="ts-sw-name">{match.awayTeam.shortName}</span>
        </button>
      </div>

      {/* Status */}
      {hasRealLineup && (
        <div className="ts-status">
          <span className={`ts-confirmed ${sheetData.confirmed ? 'yes' : 'no'}`}>
            {sheetData.confirmed ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Confirmed
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Predicted
              </>
            )}
          </span>
          <span className="ts-formation-badge">{sheetData.formation}</span>
        </div>
      )}

      {/* Pitch or "not announced" message */}
      {hasRealLineup ? (
        <PitchView
          team={teamData}
          players={sheetData.players}
          positions={sheetData.positions}
          formation={sheetData.formation}
        />
      ) : (
        <div className="ts-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <p className="ts-empty-title">Lineups not announced yet</p>
          <p className="ts-empty-sub">Usually confirmed 60 minutes before kickoff</p>
        </div>
      )}

      {/* Substitutes */}
      {sheetData.subs && sheetData.subs.length > 0 && (
        <div className="ts-subs">
          <div className="ts-subs-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            <span className="ts-subs-title">Bench</span>
            <span className="ts-subs-count">{sheetData.subs.length}</span>
          </div>
          <div className="ts-subs-grid">
            {sheetData.subs.map((player, i) => (
              <div key={i} className="ts-sub-card">
                <span className="ts-sub-num">{i + 12}</span>
                <span className="ts-sub-name">{player}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
