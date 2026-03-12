// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DateRangePicker } from '../../../../../packages/web/src/components/filters/date-range-picker';

describe('DateRangePicker', () => {
  it('renders preset options (7d, 30d, 90d, custom)', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value="30d" onChange={onChange} />);

    expect(screen.getByRole('button', { name: /7d/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30d/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /90d/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /custom/i })).toBeInTheDocument();
  });

  it('highlights the currently selected preset', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value="30d" onChange={onChange} />);

    const active = screen.getByRole('button', { name: /30d/i });
    expect(active).toHaveAttribute('data-active', 'true');
  });

  it('calls onChange with correct range when clicking a preset', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value="30d" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /7d/i }));
    expect(onChange).toHaveBeenCalledWith('7d', undefined);
  });

  it('calls onChange when custom is clicked', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value="30d" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /custom/i }));
    expect(onChange).toHaveBeenCalledWith('custom', undefined);
  });

  it('renders custom date inputs when value is custom', () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value="custom"
        customFrom="2026-01-01"
        customTo="2026-02-01"
        onChange={onChange}
      />,
    );

    const fromInput = screen.getByLabelText(/from/i);
    const toInput = screen.getByLabelText(/to/i);
    expect(fromInput).toHaveValue('2026-01-01');
    expect(toInput).toHaveValue('2026-02-01');
  });

  it('calls onChange with custom dates when from input changes', () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value="custom"
        customFrom="2026-01-01"
        customTo="2026-02-01"
        onChange={onChange}
      />,
    );

    const fromInput = screen.getByLabelText(/from/i);
    fireEvent.change(fromInput, { target: { value: '2025-12-15' } });

    expect(onChange).toHaveBeenCalledWith('custom', { from: '2025-12-15', to: '2026-02-01' });
  });

  it('calls onChange with custom dates when to input changes', () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value="custom"
        customFrom="2026-01-01"
        customTo="2026-02-01"
        onChange={onChange}
      />,
    );

    const toInput = screen.getByLabelText(/to/i);
    fireEvent.change(toInput, { target: { value: '2026-02-15' } });

    expect(onChange).toHaveBeenCalledWith('custom', { from: '2026-01-01', to: '2026-02-15' });
  });

  it('does not render date inputs for non-custom presets', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value="7d" onChange={onChange} />);

    expect(screen.queryByLabelText(/from/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/to/i)).not.toBeInTheDocument();
  });
});
