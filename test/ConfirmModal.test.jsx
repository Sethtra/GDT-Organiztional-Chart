import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmModal from '../src/components/ConfirmModal';

describe('ConfirmModal', () => {
  it('shows the requested content and confirms the action', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        title="Delete position?"
        message="The position will be removed."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        danger
      />,
    );

    expect(screen.getByText('Delete position?')).toBeInTheDocument();
    expect(screen.getByText('The position will be removed.')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    expect(confirmButton).toHaveFocus();
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancels on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        title="Leave editor?"
        message="Unsaved work may be lost."
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
