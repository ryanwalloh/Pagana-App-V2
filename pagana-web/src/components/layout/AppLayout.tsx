import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ChevronDown, Menu, User as UserIcon, X } from 'lucide-react';

import { useAuth } from '@/features/auth/AuthProvider';
import { useLogout } from '@/hooks/useAuth';
import { CartNavButton } from '@/features/cart/CartNavButton';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import paganaLogo from '@/assets/logos/pagana-index-logo.png';

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const logout = useLogout();
  const { user, isAuthenticated } = useAuth();

  const close = () => onNavigate?.();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" asChild onClick={close}>
          <Link to="/login">Sign In</Link>
        </Button>
        <Button asChild className="bg-brand hover:bg-brand-hover text-white" onClick={close}>
          <Link to="/register">Get Started</Link>
        </Button>
      </div>
    );
  }

  return (
    <nav className="flex flex-col gap-1" aria-label="Account navigation">
      <Link
        to="/dashboard"
        onClick={close}
        className="rounded-md px-3 py-2 text-sm hover:bg-muted"
      >
        Dashboard
      </Link>
      {user.role === 'customer' && (
        <>
          <Link
            to="/orders"
            onClick={close}
            className="rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Orders
          </Link>
          <Link
            to="/account"
            onClick={close}
            className="rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Account
          </Link>
        </>
      )}
      <button
        type="button"
        onClick={() => {
          close();
          logout();
        }}
        className="rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
      >
        Log out
      </button>
    </nav>
  );
}

export default function AppLayout() {
  const { user, isAuthenticated } = useAuth();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:m-2 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2">
            <Link to="/" className="flex shrink-0 items-center">
              <img src={paganaLogo} alt="Pagana" className="h-10 w-auto" />
            </Link>

            <div className="flex items-center gap-1 sm:gap-2">
              <CartNavButton />
              <ModeToggle />

              {/* Desktop navigation */}
              <div className="hidden md:flex items-center gap-2">
                {isAuthenticated && user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="gap-2 max-w-[240px]">
                        <UserIcon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate text-sm">{user.email}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="w-full cursor-pointer">
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      {user.role === 'customer' && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link to="/orders" className="w-full cursor-pointer">
                              Orders
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/account" className="w-full cursor-pointer">
                              Account
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onSelect={logout}
                      >
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Button variant="ghost" asChild>
                      <Link to="/login">Sign In</Link>
                    </Button>
                    <Button asChild className="bg-brand hover:bg-brand-hover text-white">
                      <Link to="/register">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>

              {/* Mobile menu trigger */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Menu
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {isAuthenticated && user && (
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          )}
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
