import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowDown,
  Plus,
  Minus,
  X,
  Menu,
  CalendarDays,
  Globe2,
  MapPin,
  Network,
  Fingerprint,
  FileCheck2,
  MessageSquare,
  Radio,
  LayoutDashboard,
  ShieldCheck,
  GitMerge,
  Users,
  Braces,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  MousePointer2,
} from 'lucide-react';
import LogoParticles from './LogoParticles';
import { GlassBackdrop, ExperienceGraphic } from './GlassGraphics';
import batstateuLogo from '../2.png';
import cursorLogo from '../3.png';
import ubLogo from '../4.png';
import lpuLogo from '../5.png';
import { REGISTRATION_URL, programStages, modules, faqs } from './eventData';

const icons = {
  Network,
  Fingerprint,
  FileCheck2,
  MessageSquare,
  Radio,
  MapPin,
  LayoutDashboard,
  ShieldCheck,
};
const navigation = [
  ['The initiative', '#about'],
  ['Your impact', '#modules'],
  ['The roadmap', '#roadmap'],
  ['FAQs', '#faqs'],
];
const roleSkills = [
  ['System design', 'API design', 'Version control'],
  ['Authentication', 'Access control', 'Backend development'],
  ['Workflow design', 'Forms & validation', 'Full-stack development'],
  ['User experience', 'Status tracking', 'Full-stack development'],
  ['Notifications', 'Information design', 'Backend development'],
  ['Frontend development', 'Content structure', 'User experience'],
  ['Data visualization', 'Admin workflows', 'Frontend development'],
  ['Software testing', 'Security review', 'Technical writing'],
];

function Spark({ className = '' }) {
  return (
    <svg
      className={`spark-mark ${className}`}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 0c2.4 12.7 7.3 17.6 20 20-12.7 2.4-17.6 7.3-20 20C17.6 27.3 12.7 22.4 0 20 12.7 17.6 17.6 12.7 20 0Z"
        fill="currentColor"
      />
      <path d="M20 10v20M10 20h20" stroke="currentColor" />
    </svg>
  );
}

function JoinLink({
  children = 'Join the developer hunt',
  className = 'button button-lime',
  ...props
}) {
  return (
    <a
      href={REGISTRATION_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...props}
    >
      {children}
      <ArrowUpRight size={19} aria-hidden="true" />
      <span className="sr-only"> (opens Notion in a new tab)</span>
    </a>
  );
}

function SectionLabel({ number, children }) {
  return (
    <p className="section-label">
      <span>{number}</span>
      {children}
    </p>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);
  const mobileNavRef = useRef(null);
  const menuId = useId();
  const [activeSection, setActiveSection] = useState('');
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            setActiveSection(
              entry.target.matches('.hero') ? '' : `#${entry.target.id}`,
            );
        });
      },
      { rootMargin: '-12% 0px -58% 0px', threshold: 0 },
    );
    const hero = document.querySelector('.hero');
    if (hero) observer.observe(hero);
    navigation.forEach(([, href]) => {
      const section = document.querySelector(href);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (event) => {
      if (
        !mobileNavRef.current?.contains(event.target) &&
        !toggleRef.current?.contains(event.target)
      )
        setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="reading-progress" aria-hidden="true" />
      <div className="nav-wrap container">
        <a className="brand" href="#top" aria-label="DAGITAB home">
          <img
            className="brand-logo"
            src="/brand/dagitab-logo.svg"
            alt="DAGITAB"
            width="124"
            height="46"
          />
          <span className="brand-sub">A CURSOR INITIATIVE</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={activeSection === href ? 'is-active' : undefined}
              aria-current={activeSection === href ? 'location' : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <JoinLink className="button button-small button-outline">
            Let’s build
          </JoinLink>
          <button
            ref={toggleRef}
            className="menu-toggle icon-button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav
          className="mobile-nav"
          ref={mobileNavRef}
          id={menuId}
          aria-label="Mobile navigation"
        >
          {navigation.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={activeSection === href ? 'is-active' : undefined}
              aria-current={activeSection === href ? 'location' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {label}
              <ArrowUpRight size={18} />
            </a>
          ))}
          <JoinLink className="button button-lime" />
        </nav>
      )}
    </header>
  );
}

function SignalTicker() {
  const words = [
    'DIGITAL BAYANIHAN',
    'MANY MINDS. ONE PLATFORM.',
    'BUILT FOR BATANGAS',
    'YOUR NEXT COLLECTIVE BUILD',
  ];
  return (
    <div className="signal-ticker" aria-hidden="true">
      <div className="ticker-track">
        {[0, 1].map((copy) => (
          <div className="ticker-group" key={copy}>
            {words.map((word) => (
              <span key={word}>
                <Spark />
                {word}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero({ paused, onToggleMotion }) {
  const [replayKey, setReplayKey] = useState(0);
  return (
    <>
      <section className="hero hero-v2" aria-labelledby="hero-title">
        <div className="hero-atmosphere" aria-hidden="true">
          <i />
          <i />
          <i />
          <div className="horizon-grid" />
        </div>
        <div className="container hero-content">
          <div className="hero-title-wrap">
            <h1 className="sr-only" id="hero-title">
              DAGITAB
            </h1>
            <div className="logo-stage">
              <LogoParticles paused={paused} replayKey={replayKey} />
            </div>
            <p className="hero-logo-caption">
              BUILDING INTEGRATED SYSTEMS FOR E-GOVERNANCE
            </p>
          </div>
          <div className="hero-copy">
            <h2>
              One spark.
              <br />
              <span>A city of possibilities.</span>
            </h2>
            <p>
              Cross campuses. Connect ideas. Build one e-governance platform for
              Batangas City—with a community that moves forward together.
            </p>
            <div className="hero-buttons">
              <JoinLink />
              <a className="text-link" href="#about">
                Discover the initiative
                <ArrowDown size={17} />
              </a>
            </div>
          </div>
          <div className="hero-controls">
            <span className="interaction-hint">
              <MousePointer2 size={13} />
              Move or tap the logo to explore.
            </span>
            <button
              className="replay-button"
              onClick={() => {
                if (paused) onToggleMotion();
                setReplayKey((key) => key + 1);
              }}
            >
              <RotateCcw size={13} />
              Replay formation
            </button>
            <button
              className="motion-toggle"
              onClick={onToggleMotion}
              aria-label={
                paused ? 'Play particle animation' : 'Pause particle animation'
              }
              aria-pressed={paused}
            >
              {paused ? <Play size={13} /> : <Pause size={13} />}
              <span>{paused ? 'Play motion' : 'Pause motion'}</span>
            </button>
          </div>
          <div className="hero-bottom">
            <div className="hero-details">
              <span>
                <CalendarDays size={16} />
                NOV 2026 — MAY 2027
              </span>
              <span>
                <Globe2 size={16} />
                ONLINE PROGRAM
              </span>
              <span>
                <MapPin size={16} />
                FOR BATANGAS CITY
              </span>
            </div>
            <a className="scroll-cue" href="#about">
              EXPLORE THE COLLECTIVE
              <ArrowDown size={14} />
            </a>
          </div>
        </div>
      </section>
      <SignalTicker />
    </>
  );
}

const organizations = [
  {
    name: 'CURSOR',
    role: 'HOST ORGANIZATION',
    logo: cursorLogo,
    detail: 'Computer Engineering Students Organization · BatStateU',
  },
  {
    name: 'Batangas State University',
    role: 'HOST UNIVERSITY',
    logo: batstateuLogo,
    detail: 'The National Engineering University',
  },
  {
    name: 'LPU Batangas',
    role: 'STUDENT COMMUNITY',
    logo: lpuLogo,
    wide: true,
    detail: 'Lyceum of the Philippines University–Batangas',
  },
  {
    name: 'University of Batangas',
    role: 'STUDENT COMMUNITY',
    logo: ubLogo,
    detail: 'Connecting student builders across campuses',
  },
];

function Organizations() {
  return (
    <section
      className="organization-section"
      aria-labelledby="organization-title"
    >
      <div className="container">
        <div className="organization-heading">
          <p className="section-label">THE COMMUNITY BEHIND THE BUILD</p>
          <h2 id="organization-title">
            Different campuses.
            <br />
            <span className="muted">One collective spark.</span>
          </h2>
        </div>
        <div className="organization-grid">
          <GlassBackdrop />
          {organizations.map((item) => (
            <article
              className={`organization-card ${item.role === 'HOST ORGANIZATION' ? 'host-organization' : ''}`}
              key={item.name}
            >
              <p className="organization-role">{item.role}</p>
              <img
                className={`organization-logo${item.wide ? ' organization-logo--wide' : ''}`}
                src={item.logo}
                alt={`${item.name} logo`}
                width="2000"
                height="2500"
                loading="lazy"
                decoding="async"
              />
              <h3>{item.name}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SystemDiagram() {
  return (
    <div
      className="system-diagram"
      aria-label="One shared architecture connects citizen services, permits, reports, alerts, and the LGU dashboard"
    >
      <div className="diagram-top">
        <span className="tiny-label">THE COLLECTIVE BUILD</span>
        <span className="diagram-live">
          <span />
          CONNECTED BY PURPOSE
        </span>
      </div>
      <div className="diagram-orbit orbit-one" />
      <div className="diagram-orbit orbit-two" />
      <svg
        className="diagram-lines"
        viewBox="0 0 500 340"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M250 170 94 85M250 170l160-60M250 170l-130 100M250 170l145 100M250 170V45"
          stroke="currentColor"
          strokeDasharray="4 5"
        />
      </svg>
      <div className="diagram-core">
        <Spark />
        <span>
          ONE SHARED
          <br />
          PLATFORM
        </span>
      </div>
      <span className="diagram-node node-id">
        <Fingerprint size={20} />
        Digital ID
      </span>
      <span className="diagram-node node-permits">
        <FileCheck2 size={20} />
        Permits
      </span>
      <span className="diagram-node node-reports">
        <MessageSquare size={20} />
        Reports
      </span>
      <span className="diagram-node node-alerts">
        <Radio size={20} />
        Alerts
      </span>
      <span className="diagram-node node-dashboard">
        <LayoutDashboard size={20} />
        Dashboard
      </span>
      <div className="diagram-foot">
        <Braces size={15} />
        <span>many minds. one codebase.</span>
        <span className="diagram-corner">↗</span>
      </div>
    </div>
  );
}

function About() {
  return (
    <section id="about" className="section about-section">
      <div className="container">
        <SectionLabel number="01">THE INITIATIVE</SectionLabel>
        <div className="about-grid">
          <div>
            <h2>
              Big ideas.
              <br />
              <span className="muted">Local impact.</span>
            </h2>
            <p className="about-intro">
              A spark becomes something bigger
              <br className="desktop-break" /> when we build together.
            </p>
            <p>
              DAGITAB brings student developers across CpE, IT, CS, and allied
              tech organizations into one community. The mission? Build a
              working, integrated e-governance platform for Batangas City.
            </p>
            <p>
              Work in cross-campus module teams, learn with mentors, and connect
              your contribution to a system designed for real public service.
            </p>
            <div className="bayanihan-note">
              <Spark />
              <p>
                <strong>Digital Bayanihan.</strong>
                <span>
                  A shared purpose. A shared platform. A collective
                  breakthrough.
                </span>
              </p>
            </div>
          </div>
          <SystemDiagram />
        </div>
        <div className="impact-strip">
          <div>
            <strong>01</strong>
            <span>SHARED PLATFORM</span>
          </div>
          <span className="strip-plus">+</span>
          <div>
            <strong>08</strong>
            <span>MODULES & TEAMS</span>
          </div>
          <span className="strip-plus">+</span>
          <div>
            <strong>∞</strong>
            <span>POSSIBILITIES TOGETHER</span>
          </div>
          <p>
            Not competing.
            <br />
            <span>Connecting.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function RoleDialog({ index, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const item = modules[index];
  const Icon = icons[item.icon];
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="role-dialog"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const focusable = event.currentTarget.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex="0"]',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <button
          className="icon-button dialog-close"
          aria-label="Close role details"
          onClick={onClose}
        >
          <X size={21} />
        </button>
        <span className="role-icon">
          <Icon size={28} />
        </span>
        <p className="tiny-label">
          MODULE {String(index + 1).padStart(2, '0')} / {item.category}
        </p>
        <h2 id={titleId}>{item.title}</h2>
        <p>{item.description}</p>
        <h3>Where your skills could fit</h3>
        <ul className="skill-tags">
          {roleSkills[index].map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
        <div className="dialog-note">
          <Users size={20} />
          <p>
            You’ll collaborate with other module teams on one platform. Team
            assignments and prerequisites will be confirmed by CURSOR.
          </p>
        </div>
        <JoinLink>Explore the developer sign-up</JoinLink>
        <small>You’ll continue to the official Notion registration page.</small>
      </div>
    </dialog>
  );
}

function Modules() {
  const [activeRole, setActiveRole] = useState(null);
  return (
    <section id="modules" className="section modules-section">
      <div className="container">
        <SectionLabel number="02">FIND YOUR SPARK</SectionLabel>
        <div className="section-heading-row">
          <h2>
            One mission.
            <br />
            <span className="muted">Many ways to make it happen.</span>
          </h2>
          <p>
            From the first API to the final user flow.
            <br />
            Find the part of the platform
            <br />
            you want to help bring to life.
          </p>
        </div>
        <div className="module-grid">
          <GlassBackdrop />
          {modules.map((item, index) => {
            const Icon = icons[item.icon];
            return (
              <button
                className="module-card"
                onPointerMove={(event) => {
                  if (event.pointerType === 'touch') return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  event.currentTarget.style.setProperty(
                    '--spot-x',
                    `${((event.clientX - bounds.left) / bounds.width) * 100}%`,
                  );
                  event.currentTarget.style.setProperty(
                    '--spot-y',
                    `${((event.clientY - bounds.top) / bounds.height) * 100}%`,
                  );
                }}
                key={item.title}
                onClick={() => setActiveRole(index)}
                aria-haspopup="dialog"
              >
                <div className="module-card-top">
                  <Icon size={25} strokeWidth={1.5} />
                  <span>{String(index + 1).padStart(2, '0')}</span>
                </div>
                <p className="tiny-label">{item.category}</p>
                <h3>{item.title}</h3>
                <p className="module-description">{item.description}</p>
                <div className="module-card-bottom">
                  <span>Explore the role</span>
                  <ArrowUpRight size={19} />
                </div>
              </button>
            );
          })}
        </div>
        <p className="section-footnote">
          <GitMerge size={15} />
          Every module connects to the same architecture. Every contribution
          moves us forward.
        </p>
      </div>
      {activeRole !== null && (
        <RoleDialog
          key={activeRole}
          index={activeRole}
          onClose={() => setActiveRole(null)}
        />
      )}
    </section>
  );
}

function Experience() {
  return (
    <section id="experience" className="section experience-section">
      <div className="container">
        <SectionLabel number="03">MORE THAN A BUILD</SectionLabel>
        <div className="section-heading-row">
          <h2>
            Less “what if.”
            <br />
            <span className="muted">More “we built this.”</span>
          </h2>
          <span className="experience-caption">
            REAL WORK. REAL CONNECTIONS.
            <br />A SHARED IMPACT.
          </span>
        </div>
        <div className="experience-grid">
          <article className="experience-card">
            <div className="experience-art art-purpose" aria-hidden="true">
              <ExperienceGraphic kind="purpose" />
              <span className="art-code">[ IMPACT ]</span>
            </div>
            <span className="tiny-label">01 / BUILD WITH PURPOSE</span>
            <h3>
              Code that leaves
              <br />
              the classroom.
            </h3>
            <p>
              Take on real governance needs. Build for the people and everyday
              services of Batangas City.
            </p>
          </article>
          <article className="experience-card">
            <div className="experience-art art-community" aria-hidden="true">
              <ExperienceGraphic kind="community" />
              <span className="art-code">[ COMMUNITY ]</span>
            </div>
            <span className="tiny-label">02 / CONNECT ACROSS CAMPUSES</span>
            <h3>
              Your next team
              <br />
              is out there.
            </h3>
            <p>
              Meet builders beyond your organization. Share ideas, learn with
              mentors, and solve problems side by side.
            </p>
          </article>
          <article className="experience-card">
            <div className="experience-art art-shipping" aria-hidden="true">
              <ExperienceGraphic kind="system" />
              <span className="art-code">[ COLLECTIVE ]</span>
            </div>
            <span className="tiny-label">03 / TURN IDEAS INTO SYSTEMS</span>
            <h3>
              Learn the work.
              <br />
              Ship it together.
            </h3>
            <p>
              Practice shared architecture, APIs, version control, integration,
              and testing in a mentor-supported environment.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

const phases = [
  { label: '01 / Connect', start: 0, end: 4 },
  { label: '02 / Build', start: 4, end: 6 },
  { label: '03 / Launch', start: 6, end: 9 },
];
function Roadmap() {
  const [phase, setPhase] = useState(0);
  const tabRefs = useRef([]);
  const panelId = useId();
  function changeTab(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % phases.length;
    if (event.key === 'ArrowLeft')
      next = (index + phases.length - 1) % phases.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = phases.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      setPhase(next);
      tabRefs.current[next]?.focus();
    }
  }
  const current = phases[phase];
  return (
    <section id="roadmap" className="section roadmap-section">
      <div className="container">
        <SectionLabel number="04">THE ROAD TO REAL IMPACT</SectionLabel>
        <div className="section-heading-row">
          <h2>
            From first spark
            <br />
            <span className="muted">to a shared future.</span>
          </h2>
          <a
            className="text-link brief-link"
            href="/dagitab-event-brief.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the event brief
            <ArrowUpRight size={18} />
            <span className="sr-only"> (PDF, opens in a new tab)</span>
          </a>
        </div>
        <div
          className="roadmap-tabs"
          role="tablist"
          aria-label="Program phases"
        >
          {phases.map((item, index) => (
            <button
              key={item.label}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`${panelId}-tab-${index}`}
              role="tab"
              aria-selected={phase === index}
              aria-controls={`${panelId}-panel`}
              tabIndex={phase === index ? 0 : -1}
              onClick={() => setPhase(index)}
              onKeyDown={(event) => changeTab(event, index)}
            >
              {item.label}
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
        <div
          className="roadmap-list"
          id={`${panelId}-panel`}
          role="tabpanel"
          aria-labelledby={`${panelId}-tab-${phase}`}
          tabIndex={0}
        >
          {programStages
            .slice(current.start, current.end)
            .map((item, index) => (
              <article className="roadmap-stage" key={item.id}>
                <span className="stage-number">
                  {String(current.start + index + 1).padStart(2, '0')}
                </span>
                <div className="stage-main">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <span className={`stage-date ${item.date ? '' : 'date-tba'}`}>
                  {item.date ? (
                    <CalendarDays size={15} />
                  ) : (
                    <span className="date-dot" />
                  )}
                  {item.dateLabel}
                </span>
              </article>
            ))}
        </div>
        <div className="roadmap-note">
          <p>
            <span />
            PLANNED PROGRAM · NOVEMBER 2026 — MAY 2027
          </p>
          <span>
            Preparatory dates begin in October. Times are in Philippine Time.
            <br />
            Final-stage dates, session arrangements, and venues await organizer
            confirmation.
          </span>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  const id = useId();
  return (
    <section id="faqs" className="section faq-section">
      <div className="container faq-grid">
        <div>
          <SectionLabel number="05">GOOD TO KNOW</SectionLabel>
          <h2>
            A few things
            <br />
            <span className="muted">before you spark.</span>
          </h2>
          <p>
            Curious minds ask questions.
            <br />
            Here’s a head start.
          </p>
          <a
            className="text-link"
            href="/dagitab-event-brief.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            More in the event brief
            <ArrowUpRight size={17} />
            <span className="sr-only"> (PDF, opens in a new tab)</span>
          </a>
        </div>
        <div className="faq-list">
          {faqs.map((item, index) => (
            <article
              className={`faq-item ${open === index ? 'is-open' : ''}`}
              key={item.question}
            >
              <h3>
                <button
                  id={`${id}-question-${index}`}
                  aria-expanded={open === index}
                  aria-controls={`${id}-answer-${index}`}
                  onClick={() => setOpen(open === index ? null : index)}
                >
                  {item.question}
                  {open === index ? <Minus size={19} /> : <Plus size={19} />}
                </button>
              </h3>
              <div
                id={`${id}-answer-${index}`}
                role="region"
                aria-labelledby={`${id}-question-${index}`}
                hidden={open !== index}
              >
                <p>{item.answer}</p>
                {index === faqs.length - 1 && (
                  <JoinLink className="text-link">
                    Open developer sign-up
                  </JoinLink>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Join() {
  return (
    <section id="join" className="join-section">
      <div className="container">
        <div className="join-card">
          <div className="join-grain" aria-hidden="true" />
          <div className="join-copy">
            <p className="tiny-label">
              <span className="status-dot" />
              THIS IS YOUR SPARK
            </p>
            <h2>
              Make your next commit
              <br />
              <span>mean something.</span>
            </h2>
            <p>
              Bring your curiosity. Find your people.
              <br />
              Let’s build something Batangas can use.
            </p>
            <JoinLink className="button button-dark" />
            <small>One community. One platform. Built together.</small>
          </div>
          <Spark className="join-spark" />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <a className="brand" href="#top">
            <img
              className="brand-logo"
              src="/brand/dagitab-logo.svg"
              alt="DAGITAB"
              width="160"
              height="60"
            />
            <span className="brand-sub">DIGITAL BAYANIHAN</span>
          </a>
          <p>
            Made of many minds.
            <br />
            <span>Built for one city.</span>
          </p>
          <a className="back-top text-link" href="#top">
            Back to top
            <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="organizer-row">
          <div className="organizer-identity">
            <img
              src={cursorLogo}
              alt="CURSOR BatStateU TNEU crest"
              width="35"
              height="50"
            />
            <p>
              AN INITIATIVE BY
              <strong>Computer Engineering Students Organization</strong>
              <span>
                CURSOR · Batangas State University, The National Engineering
                University
              </span>
            </p>
          </div>
          <p className="sdg-note">
            TECHNOLOGY FOR COMMUNITY.
            <br />
            <span>
              Aligned with SDG 9: Industry, Innovation & Infrastructure
            </span>
          </p>
        </div>
        <div className="footer-bottom">
          <span>© 2026 CURSOR. CPET BISEG: DAGITAB.</span>
          <span>Building Integrated Systems for E-Governance</span>
          <a href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer">
            Developer sign-up
            <ExternalLink size={12} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

function usePageMotion(paused) {
  useEffect(() => {
    document.body.classList.toggle('motion-paused', paused);
    return () => document.body.classList.remove('motion-paused');
  }, [paused]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'has-glass-refraction',
      CSS.supports('backdrop-filter', 'url("#liquid-refraction") blur(2px)'),
    );
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer;
    const elements = document.querySelectorAll(
      '.organization-heading, .organization-card, .section-label, .about-grid, .impact-strip, .module-card, .experience-card, .section-heading-row, .roadmap-tabs, .roadmap-list, .faq-grid, .join-card',
    );
    function initReveals() {
      observer?.disconnect();
      document.body.classList.remove('has-reveal');
      if (reduced.matches || !('IntersectionObserver' in window)) {
        elements.forEach((element) => element.classList.add('is-visible'));
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.06, rootMargin: '0px 0px -20px 0px' },
      );
      elements.forEach((element, index) => {
        element.classList.add('reveal');
        element.style.setProperty(
          '--reveal-delay',
          `${element.classList.contains('module-card') ? (index % 4) * 55 : 0}ms`,
        );
        observer.observe(element);
      });
      document.body.classList.add('has-reveal');
    }
    initReveals();
    reduced.addEventListener('change', initReveals);
    let frame = 0;
    function updateProgress() {
      frame = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      document.documentElement.style.setProperty(
        '--page-progress',
        total > 0 ? String(window.scrollY / total) : '0',
      );
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(updateProgress);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateProgress();
    return () => {
      observer?.disconnect();
      reduced.removeEventListener('change', initReveals);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
      document.body.classList.remove('has-reveal');
      document.documentElement.style.removeProperty('--page-progress');
      document.documentElement.classList.remove('has-glass-refraction');
    };
  }, []);
}

export default function App() {
  const [paused, setPaused] = useState(false);
  usePageMotion(paused);
  return (
    <>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: 'absolute' }}
      >
        <defs>
          <filter id="logo-no-glow" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncA type="gamma" exponent="4" />
            </feComponentTransfer>
          </filter>
          <filter id="liquid-refraction" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="1"
              seed="7"
              result="glass-noise"
            />
            <feGaussianBlur
              in="glass-noise"
              stdDeviation="2"
              result="smooth-glass"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="smooth-glass"
              scale="28"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div id="top" />
      <Header />
      <main id="main">
        <Hero
          paused={paused}
          onToggleMotion={() => setPaused((value) => !value)}
        />
        <Organizations />
        <About />
        <Modules />
        <Experience />
        <Roadmap />
        <Faq />
        <Join />
      </main>
      <Footer />
    </>
  );
}
