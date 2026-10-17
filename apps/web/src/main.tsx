import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
import './design-system.css';
import { applyAppearance, readAppearance, applyMotion, readMotionEnabled } from './appearance';

// Apply the saved theme before the first React paint to avoid palette flashing.
applyAppearance(readAppearance());
applyMotion(readMotionEnabled());

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
