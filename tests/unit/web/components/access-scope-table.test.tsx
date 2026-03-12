// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AccessScopeTable } from '../../../../packages/web/src/components/charts/access-scope-table';

const sampleScope = [
  { repository: 'repo-alpha', sessionCount: 12, eventCount: 45 },
  { repository: 'repo-beta', sessionCount: 8, eventCount: 30 },
  { repository: 'repo-gamma', sessionCount: 3, eventCount: 10 },
];

describe('AccessScopeTable', () => {
  it('renders heading', () => {
    render(<AccessScopeTable scope={sampleScope} />);
    expect(screen.getByText('Access Scope')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<AccessScopeTable scope={sampleScope} />);
    expect(screen.getByText('Repository')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('renders repository, session count, event count', () => {
    render(<AccessScopeTable scope={sampleScope} />);
    expect(screen.getByText('repo-alpha')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('repo-beta')).toBeInTheDocument();
    expect(screen.getByText('repo-gamma')).toBeInTheDocument();
  });

  it('handles empty scope', () => {
    render(<AccessScopeTable scope={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
