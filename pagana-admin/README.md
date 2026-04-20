# Pagana Admin Portal Suite

## Overview

This directory contains the administrative portal suite for the Pagana multi-platform application. The admin portal is split into two separate applications for different admin roles, each with its own React-based interface.

## Structure

```
pagana-admin/
├── pagana-superadmin/    # Full System Admin Portal
└── pagana-ops/           # Operations Staff Portal
```

## Technology Stack

Both admin portals use:
- **React** 18.2 - UI library
- **Vite** 5.0 - Build tool and dev server
- **TypeScript** 5.2 - Type safety
- **Tailwind CSS** 3.3 - Utility-first CSS framework
- **Shadcn UI** - High-quality component library
- **TanStack Query (React Query)** 5.12 - Server state management
- **React Router v6** - Client-side routing
- **Axios** - HTTP client

## Portal Descriptions

### 1. pagana-superadmin - Full System Admin Portal

**Purpose:**
- Complete system administration
- User management and permissions
- System configuration and settings
- Full access to all administrative features

**Features:**
- System overview and monitoring
- User management interface
- System configuration panel
- Comprehensive administrative controls

**Status:** ✅ Fully configured with React Router, React Query, and UI toolkit

**Structure:**
```
pagana-superadmin/
├── src/
│   ├── api/              # API client and React Query hooks
│   ├── components/       # Reusable UI components
│   │   └── ui/          # Shadcn UI components
│   ├── pages/            # Admin pages (Dashboard, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── styles/           # Global styles
│   ├── router.tsx        # React Router configuration
│   └── main.tsx          # Application entry point
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

### 2. pagana-ops - Operations Staff Portal

**Purpose:**
- Daily operations monitoring
- Staff actions and task management
- Operations tracking and reporting
- Limited administrative access

**Features:**
- Operations dashboard
- Monitoring and alerts
- Task management interface
- Daily operations tracking

**Status:** ✅ Fully configured with React Router, React Query, and UI toolkit

**Structure:**
```
pagana-ops/
├── src/
│   ├── api/              # API client and React Query hooks
│   ├── components/       # Reusable UI components
│   │   └── ui/          # Shadcn UI components
│   ├── pages/            # Operations pages (Dashboard, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── styles/           # Global styles
│   ├── router.tsx        # React Router configuration
│   └── main.tsx          # Application entry point
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Installation

### Superadmin Portal

1. **Navigate to the superadmin directory:**
   ```bash
   cd pagana-admin/pagana-superadmin
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173`

### Operations Portal

1. **Navigate to the ops directory:**
   ```bash
   cd pagana-admin/pagana-ops
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173` (or different port if superadmin is running)

## Configuration

### Environment Variables

Create a `.env` file in each portal directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Authentication

Each portal uses separate authentication tokens:
- **Superadmin Portal:** Uses `adminAuthToken` in localStorage
- **Operations Portal:** Uses `opsAuthToken` in localStorage

### API Client

Both portals include an Axios-based API client with:
- Request interceptors for adding auth tokens
- Response interceptors for error handling (401 redirects to login)
- Base URL configuration from environment variables

## Key Features

### React Query Integration

Both portals have React Query configured for server state management:
- QueryClientProvider setup in `main.tsx`
- Default query options configured
- Ready for API integration

### UI Components (Shadcn UI)

Both portals include Shadcn UI components:
- `Button` - Various button variants
- `Card` - Card container with header, content, footer
- Additional components can be added as needed

### Routing

React Router v6 is configured in `router.tsx`:
- Dashboard routes
- Ready for additional route expansion
- Protected route pattern can be implemented

### Tailwind CSS

Both portals use Tailwind CSS with Shadcn UI design tokens:
- CSS variables for theming
- Dark mode support (class-based)
- Custom color palette
- Consistent design language

## Development

### Available Scripts

Both portals support:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Path Aliases

TypeScript path aliases are configured:
- `@/` → `src/`

**Usage:**
```typescript
import { Button } from '@/components/ui/button';
import { useQuery } from '@/hooks/useQuery';
```

## Architecture Notes

- **Separate Applications:** Each portal is a standalone React application
- **Shared Backend:** Both portals connect to the same backend API
- **UI Consistency:** Both use the same UI toolkit (Shadcn UI) for consistency
- **Independent Deployment:** Each portal can be deployed independently
- **Role-Based Access:** Backend should enforce role-based permissions

## Future Development

- Authentication flow implementation
- Protected route components
- Additional pages and features
- Advanced React Query hooks
- More Shadcn UI components
- Error boundaries
- Loading states and skeletons
- Testing setup (Vitest, React Testing Library)

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Router Documentation](https://reactrouter.com/)
- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

