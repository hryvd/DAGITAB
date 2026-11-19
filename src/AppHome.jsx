import { useEffect } from 'react';
import { House, Users, Orbit, LayoutDashboard } from 'lucide-react';
import App from './App';
import Portal from './Portal';
import './app-home.css';

const navigation = [
  { href: '/app', label: 'Home', Icon: House },
  { href: '/app/teams', label: 'Teams', Icon: Users },
  { href: '/app/program', label: 'Program', Icon: Orbit },
  { href: '/app/workspace', label: 'Workspace', Icon: LayoutDashboard },
];

export default function AppHome() {
  const path = location.pathname.replace(/\/+$/, '');
  const directory = path === '/app/teams' || path.startsWith('/app/teams/');
  const active = directory ? '/app/teams' : path;
  const current = navigation.find((item) => item.href === active);
  useEffect(() => {
    if (current) document.title = current.label + ' · DAGITAB';
  }, [current]);

  return (
    <div className="builder-hub">
      {directory || path === '/app/workspace' ? (
        <Portal pagePath={directory ? path.slice(4) : '/dashboard'} />
      ) : current ? (
        <App appView={path === '/app/program' ? 'program' : 'home'} />
      ) : (
        <Portal />
      )}
      <nav className="hub-dock" aria-label="App navigation" data-glass>
        {navigation.map(({ href, label, Icon }) => (
          <a
            key={href}
            href={href}
            aria-current={active === href ? 'page' : undefined}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
