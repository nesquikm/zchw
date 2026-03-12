// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { AiCallout } from '../../../../packages/web/src/components/layout/ai-callout';

const STORAGE_KEY = 'agentview-ai-callout-dismissed';

describe('AiCallout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders MCP promotion copy by default', () => {
    render(<AiCallout />);
    expect(screen.getByText(/explore this data conversationally/i)).toBeInTheDocument();
    expect(screen.getByText(/connect AgentView to Claude Desktop/i)).toBeInTheDocument();
  });

  it('renders coming soon teaser', () => {
    render(<AiCallout />);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('is visible by default when localStorage has no dismiss state', () => {
    render(<AiCallout />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('hides banner when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    render(<AiCallout />);

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    await user.click(dismissButton);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('persists dismissed state in localStorage', async () => {
    const user = userEvent.setup();
    render(<AiCallout />);

    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('remains hidden after remount when dismissed', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AiCallout />);

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    unmount();

    // Re-render — should still be hidden
    render(<AiCallout />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
