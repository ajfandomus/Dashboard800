import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

export default function PageHeader({ title, subtitle, onRefresh, isLoading }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-slate-500 mt-1">{subtitle}</p>
      </div>
      {onRefresh && (
        <Button onClick={onRefresh} size="sm" variant="secondary" disabled={isLoading}>
          <RefreshCcw className="h-4 w-4" />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      )}
    </div>
  );
}
