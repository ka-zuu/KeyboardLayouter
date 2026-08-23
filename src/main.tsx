import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import './ui/theme/tokens.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root element not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
