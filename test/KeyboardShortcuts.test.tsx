import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KeyboardShortcuts from '../components/KeyboardShortcuts';

// Mock the SparkleIcon component
vi.mock('../components/icons/SparkleIcon', () => ({
  default: ({ className }: { className: string }) => (
    <div data-testid="sparkle-icon" className={className} />
  ),
}));

describe('KeyboardShortcuts', () => {
  it('renders shortcuts when visible', () => {
    render(<KeyboardShortcuts isVisible={true} />);

    expect(screen.getByText('Shortcuts')).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\+K/)).toBeInTheDocument();
    expect(screen.getByText(/Esc/)).toBeInTheDocument();
    expect(screen.getByTestId('sparkle-icon')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    const { container } = render(<KeyboardShortcuts isVisible={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders with default visibility', () => {
    render(<KeyboardShortcuts />);

    expect(screen.getByText('Shortcuts')).toBeInTheDocument();
  });

  it('displays keyboard shortcuts with proper styling', () => {
    render(<KeyboardShortcuts />);

    const ctrlKKey = screen.getByText('Ctrl+K');
    const escKey = screen.getByText('Esc');

    expect(ctrlKKey).toHaveClass('bg-slate-700', 'px-1', 'rounded');
    expect(escKey).toHaveClass('bg-slate-700', 'px-1', 'rounded');
  });
});
