import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SpendApp } from './spend-app.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpendApp />
  </StrictMode>,
);
