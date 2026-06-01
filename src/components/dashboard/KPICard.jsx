import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ title, value, change, changeLabel, icon: Icon, color = 'rose' }) {
  const isPositive = change > 0;
  const isNeutral = change === 0 || change === undefined || change === null;

  const colorMap = {
    rose:   { bg: 'bg-rose-50',      icon: 'bg-rose-100 text-rose-600',    trend: 'text-rose-600' },
    pink:   { bg: 'bg-pink-50',      icon: 'bg-pink-100 text-pink-600',    trend: 'text-pink-600' },
    amber:  { bg: 'bg-amber-50',     icon: 'bg-amber-100 text-amber-600',  trend: 'text-amber-600' },
    teal:   { bg: 'bg-teal-50',      icon: 'bg-teal-100 text-teal-600',    trend: 'text-teal-600' },
    purple: { bg: 'bg-purple-50',    icon: 'bg-purple-100 text-purple-600',trend: 'text-purple-600' },
    red:    { bg: 'bg-red-50',       icon: 'bg-red-100 text-red-500',      trend: 'text-red-500' },
  };
  const c = colorMap[color] || colorMap.rose;

  return (
    <Card className={cn('relative overflow-hidden border-border/60 p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5', c.bg)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {!isNeutral && (
            <div className="flex items-center gap-1 text-xs">
              {isPositive ? <TrendingUp className={cn('h-3 w-3', c.trend)} /> : <TrendingDown className="h-3 w-3 text-destructive" />}
              <span className={isPositive ? c.trend : 'text-destructive'}>
                {isPositive ? '+' : ''}{typeof change === 'number' ? change.toFixed(1) : change}%
              </span>
              {changeLabel && <span className="text-muted-foreground">{changeLabel}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2.5 rounded-xl', c.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}