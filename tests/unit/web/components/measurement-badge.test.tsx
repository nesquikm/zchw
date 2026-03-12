// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MeasurementBadge } from '../../../../packages/web/src/components/metrics/measurement-badge';

describe('MeasurementBadge', () => {
  it('renders "Observed" text for observed type', () => {
    render(<MeasurementBadge type="observed" />);
    expect(screen.getByText('Observed')).toBeInTheDocument();
  });

  it('renders "Estimated" text for estimated type', () => {
    render(<MeasurementBadge type="estimated" />);
    expect(screen.getByText('Estimated')).toBeInTheDocument();
  });

  it('applies distinct styling for observed vs estimated', () => {
    const { rerender } = render(<MeasurementBadge type="observed" />);
    const observedEl = screen.getByText('Observed');
    const observedClasses = observedEl.className;

    rerender(<MeasurementBadge type="estimated" />);
    const estimatedEl = screen.getByText('Estimated');
    const estimatedClasses = estimatedEl.className;

    expect(observedClasses).not.toBe(estimatedClasses);
  });

  it('has a tooltip with description', () => {
    render(<MeasurementBadge type="observed" />);
    const badge = screen.getByText('Observed');
    expect(badge).toHaveAttribute('title');
    expect(badge.getAttribute('title')).toMatch(/git|CI|event/i);
  });

  it('has a tooltip for estimated type', () => {
    render(<MeasurementBadge type="estimated" />);
    const badge = screen.getByText('Estimated');
    expect(badge).toHaveAttribute('title');
    expect(badge.getAttribute('title')).toMatch(/model|derived/i);
  });
});
