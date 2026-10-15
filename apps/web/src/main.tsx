import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
import './styles.css';
import './nordic.css';
import './sunset.css';
import './sunset-polish.css';
import './workspace-layout.css';
import { applyAppearance, readAppearance } from './appearance';

// Apply the saved theme before the first React paint to avoid palette flashing.
applyAppearance(readAppearance());

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
