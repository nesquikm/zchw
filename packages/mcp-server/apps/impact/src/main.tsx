import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ImpactApp } from './impact-app.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ImpactApp />
  </StrictMode>,
);
