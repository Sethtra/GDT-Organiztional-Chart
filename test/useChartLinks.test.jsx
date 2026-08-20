import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ownedChartsResult: vi.fn(),
  linkedChartResult: vi.fn(),
}));

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../src/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: (columns) =>
        columns === 'id, name'
          ? {
              eq: () => ({ order: mocks.ownedChartsResult }),
            }
          : {
              eq: () => ({ maybeSingle: mocks.linkedChartResult }),
            },
    }),
  },
}));

import {
  useLinkedChartTarget,
  useOwnedChartOptions,
} from '../src/hooks/useChartLinks';

describe('chart link data hooks', () => {
  beforeEach(() => {
    mocks.ownedChartsResult.mockReset();
    mocks.linkedChartResult.mockReset();
  });

  it('returns only valid owned chart options', async () => {
    mocks.ownedChartsResult.mockResolvedValue({
      data: [
        { id: 'chart-1', name: 'Organization Chart' },
        null,
        { id: 2, name: 'Invalid chart' },
      ],
      error: null,
    });

    const { result } = renderHook(() => useOwnedChartOptions());

    await waitFor(() => {
      expect(result.current).toEqual([
        { id: 'chart-1', name: 'Organization Chart' },
      ]);
    });
  });

  it('resolves a linked chart name with explicit loading state', async () => {
    mocks.linkedChartResult.mockResolvedValue({
      data: { name: 'Target Chart' },
      error: null,
    });

    const { result } = renderHook(() => useLinkedChartTarget('chart-2'));
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current).toEqual({ name: 'Target Chart', isLoading: false });
    });
  });

  it('uses a stable fallback when the linked chart cannot be loaded', async () => {
    mocks.linkedChartResult.mockResolvedValue({
      data: null,
      error: new Error('not available'),
    });

    const { result } = renderHook(() => useLinkedChartTarget('chart-3'));

    await waitFor(() => {
      expect(result.current).toEqual({ name: 'Linked chart', isLoading: false });
    });
  });
});
