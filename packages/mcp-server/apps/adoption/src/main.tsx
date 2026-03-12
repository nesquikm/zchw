import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdoptionApp } from './adoption-app.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdoptionApp />
  </StrictMode>,
);
