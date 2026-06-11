import { createBrowserRouter } from 'react-router-dom';

import { GuestOnlyRoute, ProtectedRoute } from '@/features/auth/route-guards';
import AppLayout from '@/components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import StorefrontPage from './pages/StorefrontPage';
import CartPage from './pages/CartPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: (
      <GuestOnlyRoute>
        <LoginPage />
      </GuestOnlyRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <GuestOnlyRoute>
        <RegisterPage />
      </GuestOnlyRoute>
    ),
  },
  {
    element: <AppLayout />,
    children: [
      {
        // Public storefront browsing — no auth required.
        path: '/merchants/:merchantId',
        element: <StorefrontPage />,
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/cart',
        element: (
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        ),
      },
      // Future authenticated routes (orders, account) mount here.
    ],
  },
]);
