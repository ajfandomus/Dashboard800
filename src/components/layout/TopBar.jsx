import React from 'react';
import { Bell, Search, Menu, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const pageTitles = {
  '/': 'Dashboard',
  '/orders': 'Orders',
  '/all-orders': 'All Orders',
  '/products': 'Products',
  '/customers': 'Customers',
  '/finance': 'Finance',
  '/invoices': 'Invoices',
  '/delivery': 'Delivery',
  '/summary': 'Summary',
  '/ai-ask': 'AI Ask',
  '/settings': 'Settings',
};

export default function TopBar({ onMenuClick }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  const { user, logout } = useAuth();

  const email = user?.email || '';
  const displayName = email ? email.split('@')[0] : 'User';
  const avatarLetter = email ? email.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-9 w-9 shrink-0 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden lg:block">
            <h1 className="text-sm font-semibold text-foreground">
              {title}
            </h1>
          </div>

          <div className="relative w-full sm:w-[240px] lg:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search orders, products..."
              className="h-9 rounded-xl border-0 bg-secondary/70 pl-9 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
          </Button>

          <div className="flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
              {avatarLetter}
            </div>

            <div className="hidden md:block leading-tight">
              <p className="text-sm font-semibold text-foreground">
                {displayName}
              </p>

              <p className="max-w-[180px] truncate text-xs text-slate-500">
                {email || 'Logged in'}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Logout"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}