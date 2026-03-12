import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QualityApp } from './quality-app.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QualityApp />
  </StrictMode>,
);
