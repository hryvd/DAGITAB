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
import Portal from './Portal.jsx';
import './styles.css';
import './redesign.css';
import './liquid-glass.css';
import './mobile.css';
import './navigation.css';
import './starfield.css';
import './orbit-theme.css';
import './portal.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {window.location.pathname === '/' ? <App /> : <Portal />}
  </React.StrictMode>,
);
