import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Package, Users,
DollarSign, FileText, Truck, BarChart3,
Sparkles, Settings, ChevronLeft, ChevronRight, Flower, X,
ListOrdered,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Orders', path: '/orders', icon: ShoppingBag },
  { label: 'All Orders', path: '/all-orders', icon: ListOrdered },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Finance', path: '/finance', icon: DollarSign },
  { label: 'Invoices', path: '/invoices', icon: FileText },
  { label: 'Delivery', path: '/delivery', icon: Truck },
  { label: 'Summary', path: '/summary', icon: BarChart3 },
  { label: 'AI Ask', path: '/ai-ask', icon: Sparkles },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}) {
  const location = useLocation();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
          'w-[250px] lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'lg:w-[68px]' : 'lg:w-[230px]'
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center shrink-0">
              <Flower className="h-5 w-5 text-sidebar-primary" />
            </div>

            <div className={cn('overflow-hidden', collapsed && 'lg:hidden')}>
              <p className="font-playfair font-bold text-base text-sidebar-foreground leading-tight whitespace-nowrap">
                800Flower
              </p>
              <p className="text-[10px] text-sidebar-primary whitespace-nowrap opacity-80">
                overall Dashboard
              </p>
            </div>
          </div>

          <button
            onClick={onMobileClose}
            className="lg:hidden rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map(item => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-sidebar-primary/15 text-sidebar-primary'
                    : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0',
                    isActive && 'text-sidebar-primary'
                  )}
                />

                <span className={cn('whitespace-nowrap', collapsed && 'lg:hidden')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block p-2 border-t border-sidebar-border shrink-0">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center py-2 rounded-lg text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}