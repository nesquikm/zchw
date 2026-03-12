// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Sparkline } from '../../../../packages/web/src/components/charts/sparkline';

describe('Sparkline', () => {
  it('renders an SVG element', () => {
    render(<Sparkline data={[1, 2, 3, 4, 5]} />);
    const svg = screen.getByRole('img', { hidden: true });
    expect(svg.tagName).toBe('svg');
  });

  it('renders polyline with points for valid data', () => {
    const { container } = render(<Sparkline data={[10, 20, 30, 20, 10]} />);
    const polyline = container.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
    const points = polyline!.getAttribute('points')!;
    // Should have 5 coordinate pairs
    expect(points.split(' ').length).toBe(5);
  });

  it('handles empty data gracefully', () => {
    const { container } = render(<Sparkline data={[]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // No polyline when no data
    const polyline = container.querySelector('polyline');
    expect(polyline).toBeNull();
  });

  it('handles single data point', () => {
    const { container } = render(<Sparkline data={[42]} />);
    const polyline = container.querySelector('polyline');
    // Single point should still render
    expect(polyline).toBeInTheDocument();
    const points = polyline!.getAttribute('points')!;
    expect(points.split(' ').length).toBe(1);
  });

  it('skips null values in data', () => {
    const { container } = render(<Sparkline data={[1, null, 3, null, 5]} />);
    const polyline = container.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
    const points = polyline!.getAttribute('points')!;
    // Only 3 non-null points
    expect(points.split(' ').length).toBe(3);
  });

  it('applies custom width and height', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} width={100} height={30} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '100');
    expect(svg).toHaveAttribute('height', '30');
  });
});
