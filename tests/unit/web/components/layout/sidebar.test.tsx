// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock TanStack Router hooks and components
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useMatchRoute: () => (opts: { to: string }) => opts.to === '/dashboard',
}));

import { Sidebar } from '../../../../../packages/web/src/components/layout/sidebar';

describe('Sidebar', () => {
  it('renders the AgentView title', () => {
    render(<Sidebar />);
    expect(screen.getByText('AgentView')).toBeInTheDocument();
  });

  it('renders all navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Spend')).toBeInTheDocument();
    expect(screen.getByText('Adoption')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('has a navigation landmark', () => {
    render(<Sidebar />);
    const aside = document.querySelector('aside[role="navigation"]');
    expect(aside).toBeInTheDocument();
  });

  it('renders navigation links with correct hrefs', () => {
    render(<Sidebar />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute('href', '/dashboard');
    expect(links[1]).toHaveAttribute('href', '/dashboard/spend');
  });
});
