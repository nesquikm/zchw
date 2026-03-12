import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GovernanceApp } from './governance-app.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GovernanceApp />
  </StrictMode>,
);
