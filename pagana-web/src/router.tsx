import { createBrowserRouter } from 'react-router-dom';

import { GuestOnlyRoute, ProtectedRoute } from '@/features/auth/route-guards';
import AppLayout from '@/components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import StorefrontPage from './pages/StorefrontPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrderDetailPage from './pages/OrderDetailPage';
import PaymentPage from './pages/PaymentPage';
import PaymentStatusPage from './pages/PaymentStatusPage';
import OrdersPage from './pages/OrdersPage';
import AccountPage from './pages/AccountPage';

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
      {
        path: '/checkout',
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/checkout/success/:publicId',
        element: (
          <ProtectedRoute>
            <OrderConfirmationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/checkout/payment/:publicId',
        element: (
          <ProtectedRoute>
            <PaymentPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/checkout/payment/:publicId/status',
        element: (
          <ProtectedRoute>
            <PaymentStatusPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/orders',
        element: (
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/orders/:publicId',
        element: (
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/account',
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
