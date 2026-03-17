import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import MatchList from './components/MatchList';
import MatchRoom from './components/MatchRoom';
import OnboardingModal from './components/OnboardingModal';
import './App.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

function generateUserId() {
  return 'user-' + Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [user, setUser] = useState(null); // { userId, username, fanTeamId }
  const [socket, setSocket] = useState(null);
  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingMatch, setPendingMatch] = useState(null);

  // Load user from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ffc_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Connect socket when user is set
  useEffect(() => {
    if (!user) return;
    const s = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/matches`);
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches', err);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const handleSelectMatch = (match) => {
    if (!user) {
      setPendingMatch(match);
      setShowOnboarding(true);
      return;
    }
    setActiveMatch(match);
  };

  const handleOnboardingComplete = (userData) => {
    const newUser = { userId: generateUserId(), ...userData };
    localStorage.setItem('ffc_user', JSON.stringify(newUser));
    setUser(newUser);
    setShowOnboarding(false);
    if (pendingMatch) {
      setActiveMatch(pendingMatch);
      setPendingMatch(null);
    }
  };

  const handleBack = () => {
    setActiveMatch(null);
    fetchMatches();
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <button className="logo" onClick={handleBack}>
            <span className="logo-icon">⚽</span>
            <span className="logo-text">MatchDay Chat</span>
          </button>
          {user && (
            <div className="user-pill">
              <span className="user-badge">{user.fanTeamId ? '🏟️' : '👤'}</span>
              <span className="user-name">{user.username}</span>
              <button
                className="switch-btn"
                onClick={() => { localStorage.removeItem('ffc_user'); setUser(null); setActiveMatch(null); }}
              >
                Switch Fan
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {activeMatch && user && socket ? (
          <MatchRoom
            match={activeMatch}
            user={user}
            socket={socket}
            onBack={handleBack}
          />
        ) : (
          <MatchList
            matches={matches}
            user={user}
            onSelectMatch={handleSelectMatch}
          />
        )}
      </main>

      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onClose={() => { setShowOnboarding(false); setPendingMatch(null); }}
        />
      )}
    </div>
  );
}
