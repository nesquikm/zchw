// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { ModelFilter } from '../../../../../packages/web/src/components/filters/model-filter';

const models = ['gpt-4o', 'claude-3-opus', 'gemini-pro'];

describe('ModelFilter', () => {
  it('renders "All" button and all model names', () => {
    render(<ModelFilter models={models} selected={[]} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'gpt-4o' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'claude-3-opus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'gemini-pro' })).toBeInTheDocument();
  });

  it('calls onChange with empty array when "All" is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ModelFilter models={models} selected={['gpt-4o']} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('adds a model when clicking an unselected model', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ModelFilter models={models} selected={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'claude-3-opus' }));
    expect(onChange).toHaveBeenCalledWith(['claude-3-opus']);
  });

  it('removes a model when clicking a selected model', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ModelFilter models={models} selected={['gpt-4o', 'gemini-pro']} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'gpt-4o' }));
    expect(onChange).toHaveBeenCalledWith(['gemini-pro']);
  });

  it('displays "Models:" label', () => {
    render(<ModelFilter models={models} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Models:')).toBeInTheDocument();
  });
});
