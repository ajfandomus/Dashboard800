import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors = {
  Delivered:    'bg-green-100 text-green-800 border-green-200',
  Dispatched:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  'No Driver':  'bg-rose-100 text-rose-700 border-rose-200',
  'Not Needed': 'bg-slate-100 text-slate-500 border-slate-200',
  PRINTED:      'bg-green-100 text-green-800 border-green-200',
  Printed:      'bg-green-100 text-green-800 border-green-200',
  'Not Printed':'bg-red-100 text-red-700 border-red-200',
  Pending:      'bg-rose-50 text-rose-700 border-rose-200',
  Processing:   'bg-blue-50 text-blue-700 border-blue-200',
  Cancelled:    'bg-red-50 text-red-700 border-red-200',
};

const compactColumns = ['quantity', 'payment', 'print_status', 'delivery_status'];
const wideColumns = ['product', 'address'];
const mediumColumns = ['order_date', 'delivery_date', 'customer_name', 'florist'];

function StatusBadge({ value }) {
  const raw = String(value ?? '').trim();

  if (!raw || raw === '—') {
    return <span className="text-slate-400">—</span>;
  }

  const colorClass =
    statusColors[raw] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full border px-3 py-1 text-[11px] font-semibold',
        colorClass
      )}
    >
      {raw}
    </Badge>
  );
}

export default function DataTable({ columns, data, pageSize = 10 }) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [expandedRows, setExpandedRows] = useState({});

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pageData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = key => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }

    setPage(0);
  };

  const toggleExpanded = orderId => {
    setExpandedRows(prev => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const getCellClass = key => {
    if (wideColumns.includes(key)) return 'min-w-[260px] max-w-[360px]';
    if (mediumColumns.includes(key)) return 'min-w-[140px] max-w-[190px]';
    if (compactColumns.includes(key)) return 'min-w-[90px] max-w-[120px]';
    return 'min-w-[120px]';
  };

  const formatCell = (value, col) => {
    // if the column has a custom renderer, use it
    if (typeof col.render === 'function') return col.render(value);

    const raw = String(value ?? '').trim();

    if (!raw || raw === 'N/A' || raw === 'n/a') return <span className="text-slate-400">-</span>;

    if (col.format === 'number') {
      return (
        <span className="font-semibold tabular-nums">
          {Number(value).toLocaleString()}
        </span>
      );
    }

    if (
      col.key === 'delivery_status' ||
      col.key === 'print_status' ||
      col.format === 'status'
    ) {
      return <StatusBadge value={raw} />;
    }

    if (col.key === 'order_id') {
      return <span className="font-semibold text-slate-950">{raw}</span>;
    }

    if (col.key === 'product') {
      return <span className="line-clamp-2 leading-relaxed">{raw}</span>;
    }

    if (col.key === 'address') {
      return <span className="line-clamp-3 text-slate-600">{raw}</span>;
    }

    if (col.key === 'payment') {
      return (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {raw}
        </span>
      );
    }

    return <span>{raw}</span>;
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-rose-50 to-white px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">
              Orders List
            </h3>
            <p className="text-sm text-slate-500">
              {sortedData.length} records synced
            </p>
          </div>

          <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
            {totalPages ? page + 1 : 0}/{totalPages || 0}
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 bg-slate-50/60 p-3 md:hidden">
        {pageData.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
            No orders found
          </div>
        ) : (
          pageData.map((row, i) => {
            const rowKey = row.order_id || String(i);
            const isExpanded = !!expandedRows[rowKey];

            return (
              <div
                key={`${rowKey}-${i}`}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Order
                    </p>
                    <p className="mt-1 truncate text-lg font-bold text-slate-950">
                      {row.order_id || '—'}
                    </p>
                  </div>

                  <StatusBadge value={row.delivery_status || row.status} />
                </div>

                <div className="mt-4 rounded-2xl bg-rose-50/70 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Customer
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-950">
                        {row.customer_name || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Delivery
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {row.delivery_date || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Qty
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {row.quantity || 1}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Florist
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-950">
                        {row.florist || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Product
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-800">
                    {row.product || 'N/A'}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge value={row.print_status} />

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {row.payment || '—'}
                  </span>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Order Date
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {row.order_date || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Channel
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {row.payment || '—'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Address
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {row.address || '—'}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleExpanded(rowKey)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  {isExpanded ? 'Hide details' : 'View details'}
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="border-b border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              {columns.map(col => (
                <TableHead
                  key={col.key}
                  className={cn(
                    'h-12 whitespace-nowrap px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500',
                    getCellClass(col.key)
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <button className="flex items-center gap-1.5 hover:text-slate-900">
                    {col.label}
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-16 text-center text-sm text-slate-500"
                >
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((row, i) => (
                <TableRow
                  key={`${row.order_id || i}-${i}`}
                  className="border-b border-slate-100 transition-colors hover:bg-rose-50/30"
                >
                  {columns.map(col => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        'px-4 py-4 align-middle text-sm',
                        getCellClass(col.key)
                      )}
                    >
                      {formatCell(row[col.key], col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-4 sm:px-5">
          <p className="text-xs font-medium text-slate-500">
            {page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, sortedData.length)} of{' '}
            {sortedData.length}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-9 rounded-full px-3"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-9 rounded-full px-3"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}