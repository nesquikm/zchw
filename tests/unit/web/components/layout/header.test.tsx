// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Header } from '../../../../../packages/web/src/components/layout/header';

describe('Header', () => {
  it('renders the organization name', () => {
    render(<Header />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders the plan badge', () => {
    render(<Header />);
    expect(screen.getByText('enterprise')).toBeInTheDocument();
  });

  it('renders a header element', () => {
    render(<Header />);
    expect(document.querySelector('header')).toBeInTheDocument();
  });
});
