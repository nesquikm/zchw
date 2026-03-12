// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MetricCard } from '../../../../packages/web/src/components/metrics/metric-card';

describe('MetricCard', () => {
  const baseProps = {
    label: 'Cost per Outcome',
    value: '$42.50',
    trend: { text: '+12.0%', direction: 'up' as const },
    sparklineData: [10, 20, 30, 25, 35],
    measurement: 'observed' as const,
  };

  it('renders label and value', () => {
    render(<MetricCard {...baseProps} />);
    expect(screen.getByText('Cost per Outcome')).toBeInTheDocument();
    expect(screen.getByText('$42.50')).toBeInTheDocument();
  });

  it('renders trend text', () => {
    render(<MetricCard {...baseProps} />);
    expect(screen.getByText('+12.0%')).toBeInTheDocument();
  });

  it('shows up arrow for upward trend', () => {
    render(<MetricCard {...baseProps} />);
    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('shows down arrow for downward trend', () => {
    render(<MetricCard {...baseProps} trend={{ text: '-5.0%', direction: 'down' }} />);
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('shows no arrow for neutral trend', () => {
    render(<MetricCard {...baseProps} trend={{ text: '0.0%', direction: 'neutral' }} />);
    expect(screen.queryByText('↑')).not.toBeInTheDocument();
    expect(screen.queryByText('↓')).not.toBeInTheDocument();
  });

  it('renders measurement badge', () => {
    render(<MetricCard {...baseProps} />);
    expect(screen.getByText('Observed')).toBeInTheDocument();
  });

  it('renders estimated measurement badge', () => {
    render(<MetricCard {...baseProps} measurement="estimated" />);
    expect(screen.getByText('Estimated')).toBeInTheDocument();
  });

  it('renders sparkline', () => {
    const { container } = render(<MetricCard {...baseProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<MetricCard {...baseProps} subtitle="$75/hr × 100h saved" />);
    expect(screen.getByText('$75/hr × 100h saved')).toBeInTheDocument();
  });

  it('does not render subtitle when omitted', () => {
    const { container } = render(<MetricCard {...baseProps} />);
    const subtitles = container.querySelectorAll('.text-xs.text-zinc-400');
    expect(subtitles.length).toBe(0);
  });

  it('handles trend with dash text gracefully', () => {
    render(<MetricCard {...baseProps} trend={{ text: '—', direction: 'neutral' }} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
