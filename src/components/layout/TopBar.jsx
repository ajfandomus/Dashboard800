import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';

const pageTitles = {
  '/': 'Dashboard',
  '/orders': 'Orders',
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

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
        
        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-3">
          
          {/* Mobile Menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-9 w-9 shrink-0 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop Title */}
          <div className="hidden lg:block">
            <h1 className="text-sm font-semibold text-foreground">
              {title}
            </h1>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-[240px] lg:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search orders, products..."
              className="
                h-9
                rounded-xl
                border-0
                bg-secondary/70
                pl-9
                text-sm
                shadow-none
                focus-visible:ring-1
                focus-visible:ring-primary/40
              "
            />
          </div>
        </div>

        {/* RIGHT */}
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
              A
            </div>

            <div className="hidden md:block">
              <p className="text-xs font-semibold text-foreground leading-tight">
                Admin
              </p>

              <p className="text-[10px] text-muted-foreground">
                Store Manager
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}