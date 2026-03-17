import React, { useState } from 'react';
import './TeamSheet.css';

const FORMATION_ROWS = {
  '4-3-3': [
    { pos: ['GK'],                 label: 'Goalkeeper' },
    { pos: ['RB', 'CB', 'CB', 'LB'], label: 'Defence' },
    { pos: ['CM', 'CM', 'CM'],    label: 'Midfield' },
    { pos: ['RW', 'ST', 'LW'],    label: 'Attack' },
  ],
  '4-4-2': [
    { pos: ['GK'],                      label: 'Goalkeeper' },
    { pos: ['RB', 'CB', 'CB', 'LB'],    label: 'Defence' },
    { pos: ['RM', 'CM', 'CM', 'LM'],    label: 'Midfield' },
    { pos: ['ST', 'ST'],                label: 'Attack' },
  ],
  '3-5-2': [
    { pos: ['GK'],                             label: 'Goalkeeper' },
    { pos: ['CB', 'CB', 'CB'],                 label: 'Defence' },
    { pos: ['RM', 'CM', 'CM', 'CM', 'LM'],    label: 'Midfield' },
    { pos: ['ST', 'ST'],                       label: 'Attack' },
  ],
};

function PitchView({ team, players, formation }) {
  const rows = FORMATION_ROWS[formation] || FORMATION_ROWS['4-3-3'];
  let playerIdx = 0;

  return (
    <div className="pitch">
      <div className="pitch-surface">
        <div className="pitch-center-circle" />
        <div className="pitch-halfway" />

        {[...rows].reverse().map((row, ri) => (
          <div key={ri} className="pitch-row">
            {row.pos.map((pos, pi) => {
              const player = players[playerIdx++] || '?';
              return (
                <div key={pi} className="pitch-player">
                  <div className="player-dot" style={{ background: team.color }}>
                    {player[0]}
                  </div>
                  <span className="player-name-pitch">{player.split(' ').pop()}</span>
                  <span className="player-pos-pitch">{pos}</span>
                </div>
              );
            })}
          </div>
        ))}

        <div className="pitch-goal home-goal" />
      </div>
    </div>
  );
}

export default function TeamSheet({ match }) {
  const [view, setView] = useState('home');
  const teamData = view === 'home' ? match.homeTeam : match.awayTeam;
  const sheetData = view === 'home' ? match.teamSheet.home : match.teamSheet.away;

  return (
    <div className="teamsheet">
      {/* Team switcher */}
      <div className="ts-switcher">
        <button
          className={`ts-switch-btn ${view === 'home' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          <span>{match.homeTeam.badge}</span>
          <span>{match.homeTeam.shortName}</span>
        </button>
        <button
          className={`ts-switch-btn ${view === 'away' ? 'active' : ''}`}
          onClick={() => setView('away')}
        >
          <span>{match.awayTeam.badge}</span>
          <span>{match.awayTeam.shortName}</span>
        </button>
      </div>

      {/* Status */}
      <div className="ts-status">
        <span className={`ts-confirmed ${sheetData.confirmed ? 'yes' : 'no'}`}>
          {sheetData.confirmed ? '✅ Confirmed Lineup' : '⏳ Predicted Lineup'}
        </span>
        <span className="ts-formation">{sheetData.formation}</span>
      </div>

      {/* Pitch */}
      <PitchView
        team={teamData}
        players={sheetData.players}
        formation={sheetData.formation}
      />

      {/* Squad list */}
      <div className="squad-list">
        {sheetData.players.map((player, i) => (
          <div key={i} className="squad-player">
            <span className="squad-num">{i + 1}</span>
            <span className="squad-name">{player}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
