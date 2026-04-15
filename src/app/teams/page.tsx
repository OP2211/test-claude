import Link from 'next/link';
import type { CSSProperties } from 'react';
import AppHeaderSession from '@/components/AppHeaderSession';
import SiteFooter from '@/components/SiteFooter';
import TeamLogoImage from '@/components/TeamLogoImage';
import { TEAMS } from '@/lib/teams';
import './teams.css';

export default function TeamsPage() {
  return (
    <div className="app">
      <AppHeaderSession />
      <main className="app-main">
        <div className="ml-page teams-page">
          <section className="teams-hero">
            <h1 className="teams-title">All Teams</h1>
            <p className="teams-subtitle">Browse clubs and explore their supporter communities.</p>
          </section>

          <section className="teams-grid" aria-label="Team list">
            {TEAMS.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="team-card"
                style={{ '--team-accent': team.color } as CSSProperties}
              >
                <span className="team-card-logo-wrap">
                  <TeamLogoImage src={team.logo} alt={`${team.name} logo`} className="team-card-logo" />
                </span>
                <span className="team-card-name">{team.name}</span>
              </Link>
            ))}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
