import { createBrowserRouter } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';

// Placeholder router configuration for operations portal
// Full routing will be implemented during project lifecycle
export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
]);

