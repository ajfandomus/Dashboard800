import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function SummaryBlock({ title, items, className }) {
  return (
    <Card className={cn('bg-card border-border/50 p-5', className)}>
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.dot && (
                <div className={cn('h-2 w-2 rounded-full', item.dot)} />
              )}
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}