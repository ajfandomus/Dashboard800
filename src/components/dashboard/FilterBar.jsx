import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, SlidersHorizontal } from 'lucide-react';

export default function FilterBar({ filterConfigs, filters, onFilterChange }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    const cleared = {};
    filterConfigs.forEach(f => {
      cleared[f.key] = '';
    });
    onFilterChange(cleared);
  };

  const hasActiveFilters = Object.values(filters).some(
    v => v && v !== '' && v !== 'all'
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <SlidersHorizontal className="h-4 w-4" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Filters</p>
            <p className="text-xs text-slate-500">Refine order list</p>
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 rounded-full px-3 text-xs text-slate-500"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
        {filterConfigs.map(config => {
          if (config.type === 'select') {
            return (
              <Select
                key={config.key}
                value={filters[config.key] || 'all'}
                onValueChange={val => handleChange(config.key, val)}
              >
                <SelectTrigger className="h-11 w-full rounded-2xl border-0 bg-slate-50 px-4 text-sm shadow-none lg:h-9 lg:w-[170px]">
                  <SelectValue placeholder={config.label} />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All {config.label}</SelectItem>

                  {config.options.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          if (config.type === 'date') {
            return (
              <Input
                key={config.key}
                type="date"
                value={filters[config.key] || ''}
                onChange={e => handleChange(config.key, e.target.value)}
                placeholder={config.label}
                className="h-11 w-full rounded-2xl border-0 bg-slate-50 px-4 text-sm shadow-none lg:h-9 lg:w-[170px]"
              />
            );
          }

          return (
            <Input
              key={config.key}
              value={filters[config.key] || ''}
              onChange={e => handleChange(config.key, e.target.value)}
              placeholder={config.label}
              className="h-11 w-full rounded-2xl border-0 bg-slate-50 px-4 text-sm shadow-none lg:h-9 lg:w-[170px]"
            />
          );
        })}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="hidden h-9 rounded-full text-muted-foreground hover:text-foreground lg:flex"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}