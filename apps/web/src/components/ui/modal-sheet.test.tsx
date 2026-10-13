import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ModalSheet } from './modal-sheet';

function Harness({ onClose = () => undefined }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <ModalSheet
          label="Example"
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        >
          <button>Inside</button>
        </ModalSheet>
      )}
    </>
  );
}

describe('ModalSheet', () => {
  it('is a labelled modal dialog that takes focus', () => {
    render(
      <ModalSheet label="Example" onClose={vi.fn()}>
        <p>Hello</p>
      </ModalSheet>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Example' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();
  });

  it('stays narrow unless asked to be wide', () => {
    const { unmount } = render(
      <ModalSheet label="Narrow" onClose={vi.fn()}>
        <p>Hello</p>
      </ModalSheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Narrow' })).toHaveClass('max-w-md');
    unmount();
    render(
      <ModalSheet label="Wide" wide onClose={vi.fn()}>
        <p>Hello</p>
      </ModalSheet>,
    );
    const wide = screen.getByRole('dialog', { name: 'Wide' });
    expect(wide).toHaveClass('max-w-5xl');
    expect(wide).not.toHaveClass('max-w-md');
  });

  it('focuses the requested element instead of the panel', () => {
    const target = { current: null as HTMLButtonElement | null };
    render(
      <ModalSheet label="Example" initialFocus={target} onClose={vi.fn()}>
        <button ref={(element) => void (target.current = element)}>Primary</button>
      </ModalSheet>,
    );
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveFocus();
  });

  it('closes on Escape and on a scrim press, but not on a press inside', () => {
    const onClose = vi.fn();
    render(
      <ModalSheet label="Example" onClose={onClose}>
        <button>Inside</button>
      </ModalSheet>,
    );
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Inside' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('returns focus to what opened it', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('does not steal focus again when the close handler changes', async () => {
    const { rerender } = render(
      <ModalSheet label="Example" onClose={() => undefined}>
        <input aria-label="Name" />
      </ModalSheet>,
    );
    screen.getByLabelText('Name').focus();
    rerender(
      <ModalSheet label="Example" onClose={() => undefined}>
        <input aria-label="Name" />
      </ModalSheet>,
    );
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });
});
