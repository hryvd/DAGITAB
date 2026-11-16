import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Code2,
  Database,
  FlaskConical,
  Layers3,
  LayoutDashboard,
  ListTodo,
  LoaderCircle,
  LogOut,
  Orbit,
  Palette,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  BrainCircuit,
} from 'lucide-react';
import Starfield from './Starfield';

const teamIcons = {
  frontend: Code2,
  backend: Layers3,
  ml: BrainCircuit,
  data: Database,
  research: FlaskConical,
  design: Palette,
};
const skills = [
  'Front-end',
  'Back-end',
  'Machine learning',
  'Data',
  'Research',
  'UI/UX design',
];
const statusNames = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  planned: 'Planned',
  active: 'Active',
};
let csrfToken = '';
let pendingBootstrap;
function bootstrap() {
  pendingBootstrap ||= Promise.all([api('/session'), api('/teams')]).finally(
    () => {
      pendingBootstrap = null;
    },
  );
  return pendingBootstrap;
}
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response
    .json()
    .catch(() => ({ error: 'The server returned an unexpected response.' }));
  if (!response.ok)
    throw new Error(data.error || 'Something went wrong. Please try again.');
  if (data.csrfToken) csrfToken = data.csrfToken;
  return data;
}
const send = (path, body, method = 'POST') => api(path, { method, body });
const teamName = (teams, id) =>
  teams.find((team) => team.id === id)?.name || 'Team';
function Availability({ team }) {
  const full = team.capacity !== null && team.memberCount >= team.capacity;
  return (
    <span className={`p-badge ${team.open && !full ? 'gold' : 'muted'}`}>
      <span aria-hidden="true">●</span>{' '}
      {!team.open
        ? 'Registration paused'
        : full
          ? 'Team full'
          : team.capacity === null
            ? 'Open to join'
            : `${team.capacity - team.memberCount} places available`}
    </span>
  );
}
function Constellation() {
  return (
    <svg
      className="auth-constellation"
      viewBox="0 0 480 280"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="orbit-gold">
          <stop stopColor="#ffb84f" />
          <stop offset="1" stopColor="#a995ff" />
        </linearGradient>
      </defs>
      <ellipse
        cx="240"
        cy="145"
        rx="190"
        ry="68"
        stroke="url(#orbit-gold)"
        transform="rotate(-25 240 145)"
      />
      <ellipse
        cx="240"
        cy="145"
        rx="174"
        ry="96"
        stroke="#b5a0ff"
        strokeOpacity=".2"
        transform="rotate(24 240 145)"
      />
      <path
        d="m80 205 90-130 110 75 100-90-20 155-80-65-60 80-140-25Z"
        stroke="url(#orbit-gold)"
        strokeOpacity=".6"
      />
      {[
        [80, 205],
        [170, 75],
        [280, 150],
        [380, 60],
        [360, 215],
        [220, 230],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle
            cx={cx}
            cy={cy}
            r="9"
            fill={i % 2 ? '#b5a0ff' : '#ffb84f'}
            opacity=".12"
          />
          <circle cx={cx} cy={cy} r="3" fill={i % 2 ? '#d5caff' : '#ffcf86'} />
        </g>
      ))}
      <path
        d="M240 118c3 18 9 24 27 27-18 3-24 9-27 27-3-18-9-24-27-27 18-3 24-9 27-27Z"
        fill="#ffc773"
      />
    </svg>
  );
}
function PortalHeader({ user, onLogout, path }) {
  return (
    <header className="portal-header">
      <a className="portal-brand" href="/" aria-label="DAGITAB home">
        <img
          src="/brand/dagitab-logo.svg"
          width="116"
          height="40"
          alt="DAGITAB"
        />
        <span>THE BUILDER COLLECTIVE</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/">The initiative</a>
        <a className={path.startsWith('/teams') ? 'active' : ''} href="/teams">
          Explore teams
        </a>
        {user && (
          <a
            href="/dashboard"
            className={path === '/dashboard' ? 'active' : ''}
          >
            Workspace
          </a>
        )}
      </nav>
      <div className="portal-account">
        {user ? (
          <>
            <span className="p-badge purple">
              {user.role === 'admin' ? 'Admin' : user.name.split(' ')[0]}
            </span>
            <button className="p-button secondary small" onClick={onLogout}>
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <>
            <a className="portal-login-link" href="/login">
              Sign in
            </a>
            <a className="p-button primary small" href="/register">
              Join the collective <ArrowUpRight size={16} />
            </a>
          </>
        )}
      </div>
    </header>
  );
}
function Teams({ teams, selectedId, user }) {
  const selected = teams.find((team) => team.id === selectedId);
  return (
    <main id="main" className="portal-main">
      <div className="portal-heading-row">
        <div className="portal-heading">
          <p className="portal-eyebrow">
            <Orbit size={15} /> DIFFERENT SKILLS. ONE SHARED MISSION.
          </p>
          <h1>
            Find your <span className="heading-accent">constellation.</span>
          </h1>
          <p>
            Six teams. One connected platform. Bring what you know, learn
            alongside others, and build for a better Batangas.
          </p>
        </div>
        <div className="portal-orbit">
          <Constellation />
        </div>
      </div>
      <div className="portal-banner">
        <div className="portal-banner-copy">
          <Sparkles size={22} />
          <div>
            <strong>Every discipline has a place here.</strong>
            <p>
              UI/UX has its own creative team. Team pages show live registration
              availability; project assignments appear in your workspace after
              an admin creates them.
            </p>
          </div>
        </div>
      </div>
      {selected && (
        <section className="team-detail" aria-labelledby="team-detail-title">
          <a className="p-button secondary small" href="/teams">
            <ArrowLeft size={15} /> All teams
          </a>
          <div className="portal-heading">
            <p className="portal-eyebrow">YOUR AREA OF IMPACT</p>
            <h2 id="team-detail-title">{selected.name}</h2>
            <p>{selected.description}</p>
          </div>
          <Availability team={selected} />
          <h3>What you could contribute</h3>
          <ul className="team-focus">
            {selected.focus.map((item) => (
              <li key={item}>
                <Check size={15} />
                {item}
              </li>
            ))}
          </ul>
          <p className="form-help">
            These are areas of contribution, not confirmed city assignments. The
            admin publishes the team’s actual projects and tasks in the
            workspace.
          </p>
          <a
            className="p-button primary"
            href={user ? '/dashboard' : `/register?team=${selected.id}`}
          >
            {user ? 'Open your workspace' : 'Choose this team'}
            <ArrowRight size={16} />
          </a>
        </section>
      )}
      <section className="portal-grid" aria-label="Development teams">
        {teams.map((team, index) => {
          const Icon = teamIcons[team.id] || Users;
          return (
            <article className="team-card" key={team.id}>
              <div className="team-card-top">
                <span className="team-icon">
                  <Icon size={24} />
                </span>
                <span className="team-number">0{index + 1} / COLLECTIVE</span>
              </div>
              <h2>{team.name}</h2>
              <p>{team.description}</p>
              <ul className="team-focus">
                {team.focus.slice(0, 3).map((item) => (
                  <li key={item}>
                    <ArrowUpRight size={11} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Availability team={team} />
              <div className="team-card-footer">
                <span>
                  {team.memberCount}{' '}
                  {team.memberCount === 1 ? 'builder' : 'builders'} joined
                </span>
                <a
                  href={`/teams/${team.id}`}
                  aria-label={`Explore ${team.name}`}
                >
                  Explore team <ArrowUpRight size={17} />
                </a>
              </div>
            </article>
          );
        })}
      </section>
      <div className="auth-note">
        <ShieldCheck size={17} />
        <p>
          Choose one home team when you register. Add all your areas of
          expertise so your team can delegate work that fits.
        </p>
      </div>
    </main>
  );
}
function Auth({ mode, teams, setSession, user }) {
  const registering = mode === 'register',
    admin = mode === 'admin';
  const [teamId, setTeamId] = useState(
    new URLSearchParams(location.search).get('team') || '',
  );
  const [expertise, setExpertise] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const team = teams.find((team) => team.id === teamId);
  const unavailable =
    team &&
    (!team.open ||
      (team.capacity !== null && team.memberCount >= team.capacity));
  useEffect(() => {
    document.title = `${registering ? 'Join the collective' : admin ? 'Admin sign in' : 'Welcome back'} · DAGITAB`;
  }, [registering, admin]);
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (registering && !expertise.length) {
      setError('Select at least one area of expertise.');
      return;
    }
    setBusy(true);
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const session = await send(
        registering ? '/register' : '/login',
        registering ? { ...form, teamId, expertise } : form,
      );
      setSession(session);
      location.assign('/dashboard');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  if (user)
    return (
      <main className="portal-main">
        <div className="portal-empty">
          <CheckCircle2 />
          <h1>You’re signed in.</h1>
          <p>Your team workspace is ready to open.</p>
          <a className="p-button primary" href="/dashboard">
            Go to workspace <ArrowRight size={16} />
          </a>
        </div>
      </main>
    );
  return (
    <main id="main" className="portal-main auth-layout">
      <aside className="auth-story">
        <a className="p-button secondary small" href="/teams">
          <ArrowLeft size={15} /> Explore the teams
        </a>
        <p className="portal-eyebrow">DAGITAB / THE BUILDER COLLECTIVE</p>
        <h1>
          {registering ? (
            <>
              Your skills.
              <br />
              Our next <span className="gold-text">spark.</span>
            </>
          ) : (
            <>
              Good things
              <br />
              are built <span className="gold-text">together.</span>
            </>
          )}
        </h1>
        <p>
          {registering
            ? 'A space for developers, researchers, data thinkers, and creative minds. Find your team and turn shared ideas into meaningful work.'
            : 'Your team, your projects, your next contribution. Pick up where you left off.'}
        </p>
        <Constellation />
        <div className="auth-note">
          <ShieldCheck size={19} />
          <div>
            <strong>A private space to collaborate.</strong>
            <p>
              Your account uses a password-protected session. Only your team and
              event admins can access your team’s work.
            </p>
          </div>
        </div>
      </aside>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-tabs">
          <a className={!registering ? 'active' : ''} href="/login">
            Sign in
          </a>
          <a className={registering ? 'active' : ''} href="/register">
            Create account
          </a>
        </div>
        <p className="portal-eyebrow">
          {admin
            ? 'EVENT ADMINISTRATION'
            : registering
              ? 'YOUR FIRST STEP'
              : 'BACK TO BUILDING'}
        </p>
        <h2 id="auth-title">
          {registering
            ? 'Join the collective'
            : admin
              ? 'Admin sign in'
              : 'Welcome back'}
        </h2>
        <p className="form-help">
          {registering
            ? 'Choose your team. Tell us what you bring.'
            : 'Use your account email and password to continue.'}
        </p>
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            {registering && (
              <div className="field-row">
                <label className="p-field">
                  Full name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Your full name"
                  />
                </label>
                <label className="p-field">
                  School / organization
                  <input
                    name="school"
                    autoComplete="organization"
                    required
                    minLength={2}
                    maxLength={150}
                    placeholder="e.g. BatStateU"
                  />
                </label>
              </div>
            )}
            <label className="p-field">
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@example.com"
              />
            </label>
            <label className="p-field">
              Password
              <input
                type="password"
                name="password"
                autoComplete={registering ? 'new-password' : 'current-password'}
                required
                minLength={registering ? 12 : 1}
                maxLength={128}
                placeholder={
                  registering
                    ? 'Create a password (12+ characters)'
                    : 'Enter your password'
                }
              />
              {registering && (
                <span className="form-help">
                  Use at least 12 characters. A unique passphrase works well.
                </span>
              )}
            </label>
            {registering && (
              <>
                <label className="p-field">
                  Your home team
                  <select
                    name="teamId"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select a team
                    </option>
                    {teams.map((team) => (
                      <option
                        key={team.id}
                        value={team.id}
                        disabled={
                          !team.open ||
                          (team.capacity !== null &&
                            team.memberCount >= team.capacity)
                        }
                      >
                        {team.name}
                        {!team.open
                          ? ' · Paused'
                          : team.capacity !== null &&
                              team.memberCount >= team.capacity
                            ? ' · Full'
                            : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {team && <p className="form-help">{team.description}</p>}
                <fieldset className="expertise-fieldset">
                  <legend>
                    Areas of expertise <span>(choose all that apply)</span>
                  </legend>
                  <div className="expertise-options">
                    {skills.map((skill) => (
                      <label key={skill}>
                        <input
                          type="checkbox"
                          checked={expertise.includes(skill)}
                          onChange={(e) =>
                            setExpertise(
                              e.target.checked
                                ? [...expertise, skill]
                                : expertise.filter((item) => item !== skill),
                            )
                          }
                        />
                        <span>{skill}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="p-field">
                  How would you like to contribute?{' '}
                  <span className="form-help">Optional</span>
                  <textarea
                    name="intent"
                    maxLength={1000}
                    rows={3}
                    placeholder="A role, a strength, or something you’d like to learn…"
                  />
                </label>
                <p className="form-help">
                  We store your name, email, organization, team, and skills to
                  run the event workspace. These details are accessible to event
                  admins; your team sees your name.
                </p>
              </>
            )}
            {error && (
              <p role="alert" className="form-message error">
                {error}
              </p>
            )}
            {unavailable && registering && (
              <p role="alert" className="form-message error">
                This team is not accepting registrations. Please choose another
                team.
              </p>
            )}
            <button
              className="p-button primary"
              type="submit"
              disabled={busy || (registering && unavailable)}
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={17} /> Please wait…
                </>
              ) : (
                <>
                  {registering ? 'Create my account' : 'Sign in to workspace'}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </fieldset>
        </form>
        <div className="auth-footer">
          {registering ? (
            <>
              Already part of the collective? <a href="/login">Sign in</a>
            </>
          ) : (
            <>
              New to DAGITAB? <a href="/register">Create an account</a>
            </>
          )}
        </div>
        {!registering && (
          <p className="form-help">
            {admin ? (
              'Admin accounts are provisioned by the event operator. Public registration creates member accounts only.'
            ) : (
              <a href="/admin/login">
                Event administrator? Sign in here <ArrowUpRight size={12} />
              </a>
            )}
          </p>
        )}
      </section>
    </main>
  );
}
function Editor({ kind, data, user, initialTeamId, onClose, onSave }) {
  const ref = useRef(null);
  const titleId = useId();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState(
    data.projects.find((p) => !initialTeamId || p.teamId === initialTeamId)
      ?.id || '',
  );
  const [teamId, setTeamId] = useState(
    initialTeamId || user.teamId || data.teams[0]?.id || '',
  );
  const project = data.projects.find((p) => String(p.id) === String(projectId));
  const members = data.members.filter((m) => m.teamId === project?.teamId);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await send(
        kind === 'project' ? '/projects' : '/tasks',
        kind === 'project'
          ? { ...form, teamId }
          : {
              ...form,
              projectId: Number(projectId),
              assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
            },
      );
      await onSave();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <dialog
      className="p-dialog portal"
      ref={ref}
      onCancel={onClose}
      aria-labelledby={titleId}
    >
      <div className="dialog-heading">
        <div>
          <p className="portal-eyebrow">MAKE THE NEXT MOVE</p>
          <h2 id={titleId}>
            {kind === 'project' ? 'Create a project' : 'Add a task'}
          </h2>
        </div>
        <button
          className="dialog-close"
          aria-label="Close form"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {kind === 'project' ? (
            <label className="p-field">
              Team
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                required
              >
                {data.teams.map((team) => (
                  <option value={team.id} key={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="p-field">
              Project
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a project
                </option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} · {teamName(data.teams, project.teamId)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="p-field">
            {kind === 'project' ? 'Project name' : 'Task title'}
            <input
              name="title"
              required
              minLength={2}
              maxLength={150}
              placeholder={
                kind === 'project'
                  ? 'What are we building?'
                  : 'What needs to happen?'
              }
            />
          </label>
          <label className="p-field">
            Description
            <textarea
              name="description"
              rows={3}
              maxLength={2000}
              placeholder="Add the context your team needs…"
            />
          </label>
          <div className="field-row">
            <label className="p-field">
              Status
              <select name="status">
                {(kind === 'project'
                  ? ['planned', 'active', 'done']
                  : ['todo', 'in_progress', 'done']
                ).map((s) => (
                  <option key={s} value={s}>
                    {statusNames[s]}
                  </option>
                ))}
              </select>
            </label>
            {kind === 'task' && (
              <label className="p-field">
                Assign to
                <select name="assigneeId" key={projectId}>
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.id === user.id ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {error && (
            <p className="form-message error" role="alert">
              {error}
            </p>
          )}
          <button className="p-button primary" disabled={busy}>
            {busy
              ? 'Saving…'
              : kind === 'project'
                ? 'Create project'
                : 'Add task'}
            <Plus size={17} />
          </button>
        </fieldset>
      </form>
    </dialog>
  );
}
function TeamSetting({ team, refresh }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      await send(
        `/teams/${team.id}`,
        {
          open: f.get('open') === 'on',
          capacity: f.get('capacity') === '' ? null : Number(f.get('capacity')),
        },
        'PATCH',
      );
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="team-setting" onSubmit={save}>
      <div>
        <h3>{team.name}</h3>
        <p className="form-help">{team.memberCount} registered builders</p>
        <Availability team={team} />
      </div>
      <label className="p-field">
        Member limit
        <input
          name="capacity"
          type="number"
          min={team.memberCount}
          max="10000"
          defaultValue={team.capacity ?? ''}
          placeholder="No limit"
        />
      </label>
      <label className="team-open-label">
        <input type="checkbox" name="open" defaultChecked={team.open} />{' '}
        Registration open
      </label>
      <button disabled={busy} className="p-button secondary small">
        {busy ? 'Saving…' : 'Save settings'}
      </button>
      {error && (
        <p role="alert" className="form-message error">
          {error}
        </p>
      )}
    </form>
  );
}
function Dashboard({ user }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [tab, setTab] = useState('tasks'),
    [filter, setFilter] = useState('all'),
    [editor, setEditor] = useState(null),
    [working, setWorking] = useState(null);
  const admin = user?.role === 'admin';
  async function refresh() {
    const result = await api('/workspace');
    setData(result);
    setError('');
  }
  useEffect(() => {
    document.title = 'Workspace · DAGITAB';
    if (!user) {
      location.replace('/login');
      return;
    }
    refresh().catch((err) => setError(err.message));
  }, [user]);
  async function updateTask(task, change) {
    setWorking(task.id);
    setError('');
    setNotice('');
    try {
      await send(`/tasks/${task.id}`, change, 'PATCH');
      await refresh();
      setNotice('Task updated. Your team has the latest changes.');
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(null);
    }
  }
  if (!user) return <Loading />;
  if (!data)
    return (
      <main className="portal-main">
        {error ? (
          <ErrorState
            error={error}
            retry={() => refresh().catch((err) => setError(err.message))}
          />
        ) : (
          <Loading />
        )}
      </main>
    );
  const teams = data.teams,
    projects = data.projects.filter(
      (p) => filter === 'all' || p.teamId === filter,
    ),
    projectIds = new Set(projects.map((p) => p.id)),
    tasks = data.tasks.filter((t) => projectIds.has(t.projectId)),
    members = data.members.filter(
      (m) => filter === 'all' || m.teamId === filter,
    );
  const completed = tasks.filter((t) => t.status === 'done').length;
  return (
    <main id="main" className="portal-main workspace-layout">
      <aside className="workspace-sidebar">
        <p className="portal-eyebrow">
          {admin ? 'ADMIN CONSOLE' : 'YOUR WORKSPACE'}
        </p>
        <div className="workspace-team-icon">
          <Orbit size={30} />
        </div>
        <h2>{admin ? 'Mission control' : teamName(teams, user.teamId)}</h2>
        <p className="form-help">
          {admin
            ? 'Connect people. Move work forward.'
            : 'Different strengths. Shared momentum.'}
        </p>
        <nav className="workspace-nav" aria-label="Workspace">
          {[
            ['tasks', ListTodo, 'Task board'],
            ['projects', LayoutDashboard, 'Projects'],
            ['members', Users, 'Team members'],
            ...(admin ? [['settings', ShieldCheck, 'Team settings']] : []),
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={() => {
                setTab(id);
                setNotice('');
              }}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon size={18} />
              {label}
              {id === 'tasks' && <span>{tasks.length}</span>}
            </button>
          ))}
        </nav>
        <div className="auth-note">
          <Sparkles size={18} />
          <p>
            {admin
              ? 'Publish real assignments as city priorities are confirmed.'
              : 'Work is shared with your team. Pick up a task, update progress, and keep building.'}
          </p>
        </div>
        <a className="p-button secondary small" href="/teams">
          Explore all teams <ArrowUpRight size={15} />
        </a>
      </aside>
      <section className="workspace-main">
        <div className="workspace-top">
          <div className="portal-heading">
            <p className="portal-eyebrow">
              DAGITAB / {admin ? 'EVENT ADMINISTRATION' : 'TEAM COLLABORATION'}
            </p>
            <h1>
              {tab === 'tasks'
                ? 'Small steps. Real impact.'
                : tab === 'projects'
                  ? 'The work ahead.'
                  : tab === 'members'
                    ? 'Your people.'
                    : 'Shape the collective.'}
            </h1>
            <p>
              Welcome back, {user.name.split(' ')[0]}.{' '}
              {admin
                ? 'Here’s where the collective comes together.'
                : 'Let’s build something that matters.'}
            </p>
          </div>
          <button
            className="p-button secondary small"
            aria-label="Refresh workspace"
            onClick={() => refresh().catch((err) => setError(err.message))}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="workspace-stats">
          <div className="stat-card">
            <span>TEAM PROJECTS</span>
            <strong>{projects.length.toString().padStart(2, '0')}</strong>
            <LayoutDashboard size={20} />
          </div>
          <div className="stat-card">
            <span>IN PROGRESS</span>
            <strong>
              {tasks
                .filter((t) => t.status === 'in_progress')
                .length.toString()
                .padStart(2, '0')}
            </strong>
            <Orbit size={20} />
          </div>
          <div className="stat-card">
            <span>COMPLETED TASKS</span>
            <strong>{completed.toString().padStart(2, '0')}</strong>
            <CheckCircle2 size={20} />
          </div>
        </div>
        <div className="workspace-toolbar">
          <h2>
            {tab === 'tasks'
              ? 'Team task board'
              : tab === 'projects'
                ? 'Projects'
                : tab === 'members'
                  ? 'Team members'
                  : 'Registration & capacity'}
          </h2>
          <div className="portal-actions">
            {admin && tab !== 'settings' && (
              <label className="workspace-filter">
                <span className="sr-only">Filter by team</span>
                <select
                  aria-label="Filter by team"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All teams</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {tab === 'projects' && admin && (
              <button
                className="p-button primary small"
                onClick={() => setEditor('project')}
              >
                <Plus size={16} /> New project
              </button>
            )}
            {tab === 'tasks' && (
              <button
                className="p-button primary small"
                disabled={!data.projects.length}
                onClick={() => setEditor('task')}
              >
                <Plus size={16} /> Add task
              </button>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="form-message error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="portal-toast">
            <Check size={16} />
            {notice}
          </p>
        )}
        {tab === 'tasks' &&
          (projects.length ? (
            <div className="task-board">
              {['todo', 'in_progress', 'done'].map((status) => (
                <section className={`task-column ${status}`} key={status}>
                  <h3 className="task-column-title">
                    <span>
                      <span className="column-dot" />
                      {statusNames[status]}
                    </span>
                    <span>
                      {tasks.filter((t) => t.status === status).length}
                    </span>
                  </h3>
                  {tasks
                    .filter((t) => t.status === status)
                    .map((task) => (
                      <article className="task-card" key={task.id}>
                        <p className="task-project">
                          {
                            data.projects.find((p) => p.id === task.projectId)
                              ?.title
                          }
                        </p>
                        <h4 className="task-card-title">{task.title}</h4>
                        {task.description && <p>{task.description}</p>}
                        <div className="task-card-controls">
                          <label>
                            <span>Assignee</span>
                            <select
                              disabled={working === task.id}
                              aria-label={`Assignee for ${task.title}`}
                              value={task.assigneeId ?? ''}
                              onChange={(e) =>
                                updateTask(task, {
                                  assigneeId: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                })
                              }
                            >
                              <option value="">Unassigned</option>
                              {data.members
                                .filter((m) => m.teamId === task.teamId)
                                .map((m) => (
                                  <option value={m.id} key={m.id}>
                                    {m.name}
                                    {m.id === user.id ? ' (you)' : ''}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label>
                            <span>Status</span>
                            <select
                              disabled={working === task.id}
                              aria-label={`Status for ${task.title}`}
                              value={task.status}
                              onChange={(e) =>
                                updateTask(task, { status: e.target.value })
                              }
                            >
                              {['todo', 'in_progress', 'done'].map((s) => (
                                <option value={s} key={s}>
                                  {statusNames[s]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </article>
                    ))}
                  {!tasks.some((t) => t.status === status) && (
                    <p className="column-empty">
                      {status === 'done'
                        ? 'Good work will land here.'
                        : 'No tasks here yet.'}
                    </p>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <Empty
              icon={ListTodo}
              title="A fresh start for your team."
              text={
                admin
                  ? 'Create a project, then break it into tasks and delegate them to the team.'
                  : 'An event admin will publish your team’s projects here. Once a project is assigned, anyone on your team can add, claim, and update tasks.'
              }
            />
          ))}
        {tab === 'projects' &&
          (projects.length ? (
            <div className="project-list">
              {projects.map((project) => {
                const projectTasks = data.tasks.filter(
                    (t) => t.projectId === project.id,
                  ),
                  done = projectTasks.filter((t) => t.status === 'done').length;
                return (
                  <article className="project-card" key={project.id}>
                    <div className="project-meta">
                      <span className="p-badge purple">
                        {teamName(teams, project.teamId)}
                      </span>
                      {admin ? (
                        <label className="project-status">
                          <span className="sr-only">
                            Project status for {project.title}
                          </span>
                          <select
                            aria-label={`Project status for ${project.title}`}
                            value={project.status}
                            disabled={working === `project-${project.id}`}
                            onChange={async (e) => {
                              setWorking(`project-${project.id}`);
                              try {
                                await send(
                                  `/projects/${project.id}`,
                                  { status: e.target.value },
                                  'PATCH',
                                );
                                await refresh();
                                setNotice('Project status updated.');
                              } catch (err) {
                                setError(err.message);
                              } finally {
                                setWorking(null);
                              }
                            }}
                          >
                            {['planned', 'active', 'done'].map((s) => (
                              <option value={s} key={s}>
                                {statusNames[s]}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <span className="p-badge muted">
                          {statusNames[project.status]}
                        </span>
                      )}
                    </div>
                    <h3>{project.title}</h3>
                    <p>{project.description || 'No description added yet.'}</p>
                    <div className="project-progress">
                      <progress
                        value={done}
                        max={projectTasks.length || 1}
                        aria-label={`${project.title} task completion`}
                      />
                      <span>
                        {done} / {projectTasks.length} tasks complete
                      </span>
                    </div>
                    <button
                      className="p-button secondary small"
                      onClick={() => setTab('tasks')}
                    >
                      View team tasks <ArrowRight size={15} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty
              icon={LayoutDashboard}
              title="Room for meaningful work."
              text={
                admin
                  ? 'Use New project to give a team its first assignment.'
                  : 'Your team’s projects will appear here once assigned by an event admin.'
              }
            />
          ))}
        {tab === 'members' && (
          <div className="member-list">
            {members.map((member) => (
              <article className="member-row" key={member.id}>
                <span className="member-avatar">
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <div>
                  <h3>
                    {member.name}
                    {member.id === user.id ? ' (you)' : ''}
                  </h3>
                  <p>{teamName(teams, member.teamId)}</p>
                  {admin && (
                    <>
                      <p>
                        {member.school} · {member.email}
                      </p>
                      <p>{member.expertise?.join(' · ')}</p>
                      {member.intent && (
                        <p className="member-intent">{member.intent}</p>
                      )}
                    </>
                  )}
                </div>
                <span className="p-badge muted">Team member</span>
              </article>
            ))}
            {!members.length && (
              <Empty
                icon={Users}
                title="The team starts here."
                text="Registered team members will appear here."
              />
            )}
          </div>
        )}
        {tab === 'settings' && admin && (
          <div className="team-settings">
            <p className="form-help">
              Pause registration or set a member limit for each team. An empty
              limit means no fixed capacity. Existing accounts keep access when
              registration is paused.
            </p>
            {teams.map((team) => (
              <TeamSetting
                key={`${team.id}-${team.open}-${team.capacity}-${team.memberCount}`}
                team={team}
                refresh={refresh}
              />
            ))}
          </div>
        )}
      </section>
      {editor && (
        <Editor
          kind={editor}
          data={data}
          user={user}
          initialTeamId={filter === 'all' ? user.teamId : filter}
          onClose={() => setEditor(null)}
          onSave={refresh}
        />
      )}
    </main>
  );
}
function Empty({ icon: Icon, title, text }) {
  return (
    <div className="portal-empty">
      <Icon size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Loading() {
  return (
    <div className="portal-loading" role="status">
      <LoaderCircle size={22} className="spin" /> Connecting to the collective…
    </div>
  );
}
function ErrorState({ error, retry }) {
  return (
    <div className="portal-error" role="alert">
      <ShieldCheck size={26} />
      <h1>We couldn’t connect.</h1>
      <p>{error}</p>
      <p>
        The workspace needs its application server running. Your information has
        not been submitted.
      </p>
      <button className="p-button primary" onClick={retry}>
        Try again <RefreshCw size={16} />
      </button>
    </div>
  );
}
export default function Portal() {
  const [session, setSession] = useState(null),
    [teams, setTeams] = useState([]),
    [error, setError] = useState('');
  const path = location.pathname.replace(/\/$/, '') || '/';
  async function load() {
    setError('');
    try {
      const [sessionData, teamData] = await bootstrap();
      setSession(sessionData);
      setTeams(teamData.teams);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
    if (path.startsWith('/teams')) document.title = 'Find your team · DAGITAB';
  }, []);
  async function logout() {
    try {
      await send('/logout', {});
      location.assign('/login');
    } catch (err) {
      setError(err.message);
    }
  }
  const known =
    path === '/teams' ||
    path.startsWith('/teams/') ||
    ['/register', '/login', '/admin/login', '/dashboard'].includes(path);
  return (
    <div className="portal">
      <Starfield />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <PortalHeader user={session?.user} path={path} onLogout={logout} />
      {error ? (
        <main className="portal-main">
          <ErrorState error={error} retry={load} />
        </main>
      ) : !session ? (
        <Loading />
      ) : path.startsWith('/teams') ? (
        <Teams
          teams={teams}
          selectedId={path.split('/')[2]}
          user={session.user}
        />
      ) : path === '/dashboard' ? (
        <Dashboard user={session.user} />
      ) : known ? (
        <Auth
          mode={
            path === '/register'
              ? 'register'
              : path === '/admin/login'
                ? 'admin'
                : 'login'
          }
          teams={teams}
          user={session.user}
          setSession={setSession}
        />
      ) : (
        <main className="portal-main">
          <Empty
            icon={Orbit}
            title="A little off orbit."
            text="This page doesn’t exist. Find your way back to the collective."
          />
          <a className="p-button primary" href="/teams">
            Explore teams
          </a>
        </main>
      )}
      <footer className="portal-footer">
        <a href="/">DAGITAB</a>
        <span>Different skills. One shared mission.</span>
        <a href="/admin/login">
          Admin access <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}
