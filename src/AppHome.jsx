import { useEffect } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  Code2,
  Database,
  FlaskConical,
  House,
  Layers3,
  LayoutDashboard,
  MapPin,
  Orbit,
  Palette,
  Users,
} from 'lucide-react';
import Starfield from './Starfield';
import { teams } from './teamCatalog';
import { programStages } from './eventData';
import orbitalDawn from './assets/orbital-dawn.webp';
import './app-home.css';

const navigation = [
  { href: '/app', label: 'Home', Icon: House },
  { href: '/app/teams', label: 'Teams', Icon: Users },
  { href: '/app/program', label: 'Program', Icon: Orbit },
  { href: '/dashboard', label: 'Workspace', Icon: LayoutDashboard },
];
const teamIcons = {
  frontend: Code2,
  backend: Layers3,
  ml: BrainCircuit,
  data: Database,
  research: FlaskConical,
  design: Palette,
};

function TeamList({ compact = false }) {
  return (
    <ul className={compact ? 'hub-teams compact' : 'hub-teams'}>
      {(compact ? teams.slice(0, 3) : teams).map(
        ({ id, name, description }) => {
          const Icon = teamIcons[id];
          return (
            <li key={id}>
              <a href={'/teams/' + id}>
                <span className="hub-team-icon">
                  <Icon size={20} />
                </span>
                <span>
                  <strong>{name}</strong>
                  {!compact && <small>{description}</small>}
                </span>
                <ChevronRight className="hub-chevron" size={16} />
              </a>
            </li>
          );
        },
      )}
    </ul>
  );
}

function StageList({ stages }) {
  return (
    <ol className="hub-stages">
      {stages.map((stage) => (
        <li key={stage.id}>
          <div className="hub-milestone">
            <span aria-hidden="true" />
            {stage.dateLabel}
          </div>
          <h3>{stage.title}</h3>
          <p>{stage.description}</p>
        </li>
      ))}
    </ol>
  );
}

function Overview() {
  // Date-only milestones use the event's local calendar.
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Manila',
  }).format(new Date());
  const nextStage =
    programStages.find(
      (stage) => stage.date?.length === 10 && stage.date >= today,
    ) ?? programStages.find((stage) => !stage.date);
  return (
    <>
      <div className="hub-feature" data-glass>
        <img
          className="hub-feature-image"
          src={orbitalDawn}
          alt=""
          fetchPriority="high"
        />
        <div className="hub-feature-copy">
          <p className="hub-location">
            <MapPin size={14} /> Batangas City
          </p>
          <h1>
            Digital <em>Bayanihan.</em>
          </h1>
          <p>Build the city’s digital services with the DAGITAB collective.</p>
          <a className="hub-action" href="/dashboard">
            Open workspace <ArrowRight size={17} />
          </a>
        </div>
      </div>
      <div className="hub-columns">
        <section className="hub-section" aria-labelledby="hub-teams-heading">
          <header>
            <h2 id="hub-teams-heading">Team directory</h2>
            <a href="/app/teams">
              All teams <ArrowRight size={15} />
            </a>
          </header>
          <div className="hub-pane" data-glass>
            <TeamList compact />
          </div>
        </section>
        <section className="hub-section" aria-labelledby="hub-program-heading">
          <header>
            <h2 id="hub-program-heading">On the program</h2>
            <a href="/app/program">
              Timeline <ArrowRight size={15} />
            </a>
          </header>
          <div className="hub-pane hub-preview" data-glass>
            <CalendarDays size={21} aria-hidden="true" />
            <StageList stages={[nextStage]} />
          </div>
        </section>
      </div>
    </>
  );
}

export default function AppHome() {
  const path = window.location.pathname.replace(/\/+$/, '');
  const current = navigation.find((item) => item.href === path);
  useEffect(() => {
    document.title = (current?.label ?? 'Page not found') + ' · DAGITAB App';
  }, [current]);

  return (
    <div className="builder-hub">
      <a className="skip-link" href="#hub-content">
        Skip to content
      </a>
      <Starfield />
      <header className="hub-masthead">
        <div className="hub-width">
          <a className="hub-brand" href="/app" aria-label="DAGITAB app home">
            <img
              src="/brand/dagitab-logo.svg"
              width="106"
              height="36"
              alt="DAGITAB"
            />
            <span>Builder hub</span>
          </a>
          <a className="hub-site-link" href="/">
            The initiative <ArrowUpRight size={15} />
          </a>
        </div>
      </header>
      <main id="hub-content" tabIndex="-1" className="hub-width hub-body">
        {path === '/app' ? (
          <Overview />
        ) : path === '/app/teams' ? (
          <>
            <h1 className="hub-title">Team directory</h1>
            <p className="hub-lede">
              Explore each team’s focus and registration availability.
            </p>
            <div className="hub-pane" data-glass>
              <TeamList />
            </div>
          </>
        ) : path === '/app/program' ? (
          <>
            <h1 className="hub-title">Program timeline</h1>
            <p className="hub-lede">
              Planned milestones for the collective. All dates are in Philippine
              time.
            </p>
            <div className="hub-pane hub-timeline" data-glass>
              <StageList stages={programStages} />
            </div>
            <a className="hub-document" href="/dagitab-event-brief.pdf">
              Read the event brief (PDF) <ArrowUpRight size={16} />
            </a>
          </>
        ) : (
          <>
            <h1 className="hub-title">Page not found</h1>
            <a className="hub-document" href="/app">
              Return home <ArrowRight size={16} />
            </a>
          </>
        )}
      </main>
      <nav className="hub-dock" aria-label="App navigation" data-glass>
        {navigation.map(({ href, label, Icon }) => (
          <a
            key={href}
            href={href}
            aria-current={path === href ? 'page' : undefined}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
