import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HrAdminRoute from '../src/components/HrAdminRoute';
import { useHrAdmin } from '../src/hooks/useHrAdmin';

vi.mock('../src/hooks/useHrAdmin', () => ({
  useHrAdmin: vi.fn(),
}));

const mockedUseHrAdmin = vi.mocked(useHrAdmin);

describe('HrAdminRoute', () => {
  beforeEach(() => {
    mockedUseHrAdmin.mockReset();
  });

  it('renders protected content for an HR administrator', () => {
    mockedUseHrAdmin.mockReturnValue({
      isHrAdmin: true,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <HrAdminRoute>
          <div>Protected HR content</div>
        </HrAdminRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Protected HR content')).toBeInTheDocument();
  });

  it('denies a normal authenticated user', () => {
    mockedUseHrAdmin.mockReturnValue({
      isHrAdmin: false,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <HrAdminRoute>
          <div>Protected HR content</div>
        </HrAdminRoute>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'HR administrator access required',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Protected HR content')).not.toBeInTheDocument();
  });

  it('does not render protected content while role verification is pending', () => {
    mockedUseHrAdmin.mockReturnValue({
      isHrAdmin: false,
      loading: true,
      error: null,
    });

    render(
      <MemoryRouter>
        <HrAdminRoute>
          <div>Protected HR content</div>
        </HrAdminRoute>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('status', {
        name: 'Checking HR administrator access',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Protected HR content')).not.toBeInTheDocument();
  });
});
