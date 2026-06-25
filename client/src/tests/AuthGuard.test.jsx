// Feature: project-scaffolding-auth — AuthGuard property tests (Properties 13–16)

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as fc from 'fast-check';
import AuthGuard from '../components/AuthGuard';
import AuthContext from '../context/AuthContext';

// Helper: render AuthGuard inside a MemoryRouter at a given initial path,
// with a controlled AuthContext value and a mock outlet.
function renderGuard({ initialPath, contextValue, requiredRole }) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={contextValue}>
        <Routes>
          <Route element={<AuthGuard requiredRole={requiredRole} />}>
            <Route path={initialPath} element={<div data-testid="outlet-content">Outlet</div>} />
          </Route>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/client/dashboard" element={<div data-testid="client-dashboard">Client</div>} />
          <Route path="/provider/dashboard" element={<div data-testid="provider-dashboard">Provider</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

const unauthenticatedContext = { user: null, token: null, isLoading: false, login: vi.fn(), logout: vi.fn() };

const clientUser = { id: '1', name: 'Alice', email: 'alice@test.com', role: 'client', company: 'ACME' };
const providerUser = { id: '2', name: 'Bob', email: 'bob@test.com', role: 'provider', company: 'ACME' };

function makeAuthContext(user) {
  return { user, token: 'fake-token', isLoading: false, login: vi.fn(), logout: vi.fn() };
}

// Feature: project-scaffolding-auth, Property 13: Unauthenticated users are redirected to /login from protected routes
describe('P13: unauthenticated users are redirected to /login from protected routes', () => {
  test('redirects to /login for both protected route types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/client/dashboard', '/provider/dashboard'),
        fc.constantFrom('client', 'provider'),
        (path, requiredRole) => {
          const { unmount } = renderGuard({
            initialPath: path,
            contextValue: unauthenticatedContext,
            requiredRole,
          });

          expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument();
          expect(screen.getByTestId('login-page')).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: project-scaffolding-auth, Property 14: Role-mismatched users are redirected to their own dashboard
describe('P14: role-mismatched authenticated users are redirected to their own dashboard', () => {
  test('client accessing /provider/dashboard is redirected to /client/dashboard', () => {
    fc.assert(
      fc.property(fc.constant(clientUser), (user) => {
        const { unmount } = renderGuard({
          initialPath: '/provider/dashboard',
          contextValue: makeAuthContext(user),
          requiredRole: 'provider',
        });

        expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument();
        expect(screen.getByTestId('client-dashboard')).toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  test('provider accessing /client/dashboard is redirected to /provider/dashboard', () => {
    fc.assert(
      fc.property(fc.constant(providerUser), (user) => {
        const { unmount } = renderGuard({
          initialPath: '/client/dashboard',
          contextValue: makeAuthContext(user),
          requiredRole: 'client',
        });

        expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument();
        expect(screen.getByTestId('provider-dashboard')).toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: project-scaffolding-auth, Property 15: Authenticated users with correct role can access their dashboard
describe('P15: authenticated users with correct role render outlet without redirection', () => {
  test('client accessing /client/dashboard renders outlet', () => {
    fc.assert(
      fc.property(fc.constant(clientUser), (user) => {
        const { unmount } = renderGuard({
          initialPath: '/client/dashboard',
          contextValue: makeAuthContext(user),
          requiredRole: 'client',
        });

        expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  test('provider accessing /provider/dashboard renders outlet', () => {
    fc.assert(
      fc.property(fc.constant(providerUser), (user) => {
        const { unmount } = renderGuard({
          initialPath: '/provider/dashboard',
          contextValue: makeAuthContext(user),
          requiredRole: 'provider',
        });

        expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: project-scaffolding-auth, Property 16: Authenticated users are redirected away from /login and /register
describe('P16: authenticated users are redirected away from /login and /register (Mode B)', () => {
  test('authenticated client visiting /login is redirected to /client/dashboard', () => {
    fc.assert(
      fc.property(fc.constant(clientUser), (user) => {
        const { unmount } = render(
          <MemoryRouter initialEntries={['/login']}>
            <AuthContext.Provider value={makeAuthContext(user)}>
              <Routes>
                {/* Mode B: no requiredRole */}
                <Route element={<AuthGuard />}>
                  <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                </Route>
                <Route path="/client/dashboard" element={<div data-testid="client-dashboard">Client</div>} />
                <Route path="/provider/dashboard" element={<div data-testid="provider-dashboard">Provider</div>} />
              </Routes>
            </AuthContext.Provider>
          </MemoryRouter>
        );

        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
        expect(screen.getByTestId('client-dashboard')).toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  test('authenticated provider visiting /register is redirected to /provider/dashboard', () => {
    fc.assert(
      fc.property(fc.constant(providerUser), (user) => {
        const { unmount } = render(
          <MemoryRouter initialEntries={['/register']}>
            <AuthContext.Provider value={makeAuthContext(user)}>
              <Routes>
                <Route element={<AuthGuard />}>
                  <Route path="/register" element={<div data-testid="register-page">Register</div>} />
                </Route>
                <Route path="/client/dashboard" element={<div data-testid="client-dashboard">Client</div>} />
                <Route path="/provider/dashboard" element={<div data-testid="provider-dashboard">Provider</div>} />
              </Routes>
            </AuthContext.Provider>
          </MemoryRouter>
        );

        expect(screen.queryByTestId('register-page')).not.toBeInTheDocument();
        expect(screen.getByTestId('provider-dashboard')).toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
