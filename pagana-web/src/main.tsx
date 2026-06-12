import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { queryClient } from '@/lib/queryClient'
import { router } from './router'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="pagana-ui-theme">
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>,
)

