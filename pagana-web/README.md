# Pagana Web - Frontend Application

## Overview

This is the web frontend for the Pagana multi-platform application, built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, **React Query**, and **Shadcn UI**.

## ✅ Status

This is a **fully configured and ready-to-run** frontend skeleton with UI toolkit and state management configured.

## Technology Stack

- **React** 18.2 - UI library
- **Vite** 5.0 - Build tool and dev server
- **TypeScript** 5.2 - Type safety
- **Tailwind CSS** 3.3 - Utility-first CSS framework
- **Shadcn UI** - High-quality component library (Button, Card, Input)
- **TanStack Query (React Query)** 5.12 - Server state management
- **React Router v6** - Client-side routing
- **Axios** - HTTP client

## Key Features

- ✅ **Fully configured** - Ready-to-run skeleton
- ✅ **React Query integration** - API state management setup with examples
- ✅ **UI Toolkit configured** - Tailwind CSS + Shadcn UI components
- ✅ **Authentication pages** - Login/registration with React Router
- ✅ **TypeScript support** - Type-safe development
- ✅ **Path aliases** - `@/` alias for `src/` directory

## Project Structure

```
pagana-web/
├── src/
│   ├── api/              # API client and React Query hooks
│   │   ├── client.ts     # Axios client configuration
│   │   ├── auth.ts       # Authentication API
│   │   └── users.ts      # Users API with React Query hooks
│   ├── components/       # Reusable UI components
│   │   └── ui/          # Shadcn UI components (Button, Card, Input)
│   ├── features/         # Feature-based modules
│   ├── pages/            # Route pages (Login, Register, Dashboard)
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── DashboardPage.tsx
│   ├── hooks/            # Custom React hooks
│   │   └── useAuth.ts   # Authentication hooks
│   ├── lib/              # Utility functions
│   │   └── utils.ts     # cn() utility for className merging
│   ├── styles/           # Global styles
│   │   └── globals.css  # Tailwind CSS with Shadcn variables
│   ├── router.tsx        # React Router configuration
│   ├── main.tsx          # Application entry point
│   └── App.tsx           # App component (reference)
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
├── tsconfig.json         # TypeScript configuration
├── components.json       # Shadcn UI configuration
└── package.json          # Dependencies
```

## Local Development Workflow

The app requires a running `pagana-api` backend. Use two terminals:

**Terminal 1 — backend:**

```bash
cd ../pagana-api
python3 -m venv .venv               # first time only
.venv/bin/pip install -r requirements.txt   # first time only
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver 8000
```

**Terminal 2 — frontend:**

```bash
cd pagana-web
npm install                         # first time only
npm run dev                         # serves on http://localhost:5173
```

The backend already allows CORS from `http://localhost:5173`.

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment file:**

   `.env.development` is committed with the local default:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```
   For other environments, copy `.env.example` and adjust.

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### React Query Setup

React Query is configured in `src/main.tsx` with a QueryClientProvider. The client is configured with sensible defaults:

- Refetch on window focus: disabled
- Retry on error: 1 attempt

**Example usage:**
```typescript
import { useUsers } from '@/api/users';

function MyComponent() {
  const { data, isLoading, error } = useUsers();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{/* Render data */}</div>;
}
```

**Mutation example:**
```typescript
import { useLogin } from '@/hooks/useAuth';

function LoginForm() {
  const { mutate: login, isPending } = useLogin();
  
  const handleSubmit = (credentials) => {
    login(credentials);
  };
}
```

### UI Components (Shadcn UI)

Shadcn UI components are located in `src/components/ui/`. Available components:

- `Button` - Various button variants (default, outline, ghost, etc.)
- `Card` - Card container with header, content, footer
- `Input` - Text input component

**Usage:**
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button>Click me</Button>
  </CardContent>
</Card>
```

### Routing

React Router v6 is configured in `src/router.tsx`. Routes:

- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Dashboard (protected route)
- `/` - Redirects to `/dashboard`

Protected routes check for authentication token in localStorage.

### API Client

The API client (`src/api/client.ts`) is configured with:

- Base URL from environment variable
- Request interceptor for adding auth tokens
- Response interceptor for error handling (401 redirects to login)

**Usage:**
```typescript
import { apiClient } from '@/api/client';

const response = await apiClient.get('/users/');
```

### Tailwind CSS

Tailwind CSS is configured with Shadcn UI design tokens:

- CSS variables for theming
- Dark mode support (class-based)
- Custom color palette
- Custom border radius variables

Styles are in `src/styles/globals.css`.

### Path Aliases

TypeScript path aliases are configured:

- `@/` → `src/`

**Usage:**
```typescript
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
```

## Configuration Files

### `vite.config.ts`
- React plugin configuration
- Path alias setup (`@/` → `src/`)

### `tailwind.config.js`
- Shadcn UI theme configuration
- CSS variable-based color system
- Custom animations and utilities

### `tsconfig.json`
- TypeScript compiler options
- Path mapping for `@/` alias
- Strict type checking enabled

### `components.json`
- Shadcn UI configuration
- Component and utility paths
- Style configuration

## Example: React Query API Call

See `src/pages/DashboardPage.tsx` for a complete example:

```typescript
import { useUsers } from '@/api/users';

export default function DashboardPage() {
  const { data: users, isLoading, error } = useUsers();
  
  // Render users list
}
```

The `useUsers` hook is defined in `src/api/users.ts` and uses React Query's `useQuery`.

## Authentication Flow

1. User submits login/registration form
2. API call made via React Query mutation
3. On success, token stored in localStorage
4. User redirected to dashboard
5. Protected routes check for token

See `src/hooks/useAuth.ts` for authentication hooks.

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

```bash
npm run preview
```

Preview the production build locally.

## Next Steps

- Add more Shadcn UI components as needed
- Implement additional API endpoints
- Add more React Query hooks
- Enhance authentication (token refresh, persistent sessions)
- Add form validation library (React Hook Form + Zod)
- Implement error boundaries
- Add loading states and skeletons
- Set up testing (Vitest, React Testing Library)

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Router Documentation](https://reactrouter.com/)
- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

