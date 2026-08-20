import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/hooks/useChartLinks', () => ({
  useLinkedChartTarget: () => ({
    name: 'Target Organization Chart',
    isLoading: false,
  }),
}));

import LinkedChartPopup from '../src/components/editor/LinkedChartPopup';

const popup = {
  x: 1200,
  y: 760,
  node: {
    id: 'node-1',
    data: {
      name: 'Source unit',
      linkedChartId: '11111111-1111-4111-8111-111111111111',
    },
  },
};

describe('LinkedChartPopup', () => {
  it('shows the target chart and exposes open and manage actions', () => {
    const onOpen = vi.fn();
    const onManage = vi.fn();
    const onClose = vi.fn();

    render(
      <LinkedChartPopup
        popup={popup}
        onOpen={onOpen}
        onManage={onManage}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Target Organization Chart')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Linked chart' })).toHaveClass(
      'linked-chart-popup--above',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Manage Link' }));
    expect(onManage).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Open Chart' }));
    expect(onOpen).toHaveBeenCalledWith(popup.node.data.linkedChartId);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes with Escape', () => {
    const onClose = vi.fn();

    render(
      <LinkedChartPopup
        popup={popup}
        onOpen={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
