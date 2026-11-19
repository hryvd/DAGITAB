import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import App from './App.jsx';
import AppHome from './AppHome.jsx';
import GlassRefraction from './GlassRefraction.jsx';
import Portal from './Portal.jsx';
import './styles.css';
import './redesign.css';
import './liquid-glass.css';
import './mobile.css';
import './navigation.css';
import './starfield.css';
import './orbit-theme.css';
import './portal.css';

const { pathname } = window.location;
let Page = Portal;
if (pathname === '/') Page = App;
if (pathname === '/app' || pathname.startsWith('/app/')) Page = AppHome;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlassRefraction />
    <Page />
  </React.StrictMode>,
);
