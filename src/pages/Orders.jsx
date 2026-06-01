import React, { useState, useMemo, useEffect } from 'react';
import { useSheetData, computeAggregations } from '@/lib/sheetsEngine';
import KPICard from '@/components/dashboard/KPICard';
import DataTable from '@/components/dashboard/DataTable';
import FilterBar from '@/components/dashboard/FilterBar';
import ChartCard from '@/components/dashboard/ChartCard';
import PageHeader from '@/components/dashboard/PageHeader';
import { useDashboardStore } from '@/lib/dashboardStore';
import LoadingState from '@/components/dashboard/LoadingState';
import { supabase } from '@/lib/supabaseClient';

import {
  ShoppingBag,
  Truck,
  Users,
  TrendingUp,
  CalendarDays,
  Eye,
  EyeOff,
  GripVertical,
} from 'lucide-react';

const columns = [
  { key: 'delivery_date', label: 'Delivery Date' },
  { key: 'order_id', label: 'Order Number' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'product', label: 'Product Description' },
  { key: 'quantity', label: 'Qty', format: 'number' },
  { key: 'print_status', label: 'Print Status' },
  { key: 'florist', label: 'Florist Name' },
  { key: 'delivery_status', label: 'Delivery Status' },
  { key: 'address', label: 'Shipping Address' },
  { key: 'order_date', label: 'Order Date' },
  { key: 'florist_time', label: 'Florist Time' },
  { key: 'storage_time', label: 'Storage Time' },
  { key: 'time_to_delivery', label: 'Time to Delivery' },
  { key: 'dispatch_time', label: 'Dispatch Time' },
  { key: 'payment', label: 'Channel' },
];

function parseOrderDate(value) {
  if (!value) return null;

  const text = String(value)
    .replace(/st|nd|rd|th/g, '')
    .replace(' - ', ' ')
    .trim();

  const currentYear = new Date().getFullYear();
  const parsed = new Date(`${text} ${currentYear}`);

  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseDeliveryDate(value) {
  if (!value) return null;

  const text = String(value).trim();
  const parts = text.split(/[\/\-]/);

  if (parts.length === 3) {
    const [day, month, year] = parts;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value) {
  const date = parseOrderDate(value);
  if (!date) return value;

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getDateRange(filterType, fromDate, toDate) {
  const today = new Date();
  let from = null;
  let to = null;

  if (filterType === 'today') {
    from = startOfDay(today);
    to = endOfDay(today);
  }

  if (filterType === 'yesterday') {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    from = startOfDay(y);
    to = endOfDay(y);
  }

  if (filterType === 'week') {
    const w = new Date();
    w.setDate(w.getDate() - 7);
    from = startOfDay(w);
    to = endOfDay(today);
  }

  if (filterType === 'month') {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
    to = endOfDay(today);
  }

  if (filterType === 'custom') {
    from = fromDate ? startOfDay(new Date(fromDate)) : null;
    to = toDate ? endOfDay(new Date(toDate)) : null;
  }

  return { from, to };
}

const dateButtons = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Last 7 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

export default function Orders() {
  const [filters, setFilters] = useState({});
  const [dateFilter, setDateFilter] = useState('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [deliveryDateFilter, setDeliveryDateFilter] = useState('today');
  const [deliveryFromDate, setDeliveryFromDate] = useState('');
  const [deliveryToDate, setDeliveryToDate] = useState('');

  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [dragColumnKey, setDragColumnKey] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState(
    columns.map(col => col.key)
  );

  const [savedViews, setSavedViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState('default');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const setPageData = useDashboardStore(s => s.setPageData);

  const {
    data,
    allData,
    isLoading,
    error,
    refetch,
  } = useSheetData('orders', { filters });

  useEffect(() => {
    loadViews();
  }, []);

  async function loadViews() {
    const { data, error } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('page_name', 'orders')
      .order('created_at', { ascending: true });

    if (!error) {
      setSavedViews(data || []);
    }
  }

  const displayedColumns = useMemo(
    () =>
      visibleColumns
        .map(key => columns.find(col => col.key === key))
        .filter(Boolean),
    [visibleColumns]
  );

  const popupColumns = useMemo(() => {
    return columns.slice().sort((a, b) => {
      const ai = visibleColumns.indexOf(a.key);
      const bi = visibleColumns.indexOf(b.key);

      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;

      return ai - bi;
    });
  }, [visibleColumns]);

  const toggleColumn = key => {
    setActiveViewId('custom');

    setVisibleColumns(prev =>
      prev.includes(key)
        ? prev.filter(item => item !== key)
        : [...prev, key]
    );
  };

  const moveColumn = targetKey => {
    if (!dragColumnKey || dragColumnKey === targetKey) return;

    setActiveViewId('custom');

    setVisibleColumns(prev => {
      const current = [...prev];

      if (!current.includes(dragColumnKey)) return current;
      if (!current.includes(targetKey)) return current;

      const fromIndex = current.indexOf(dragColumnKey);
      const toIndex = current.indexOf(targetKey);

      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, dragColumnKey);

      return current;
    });
  };

  const applyView = view => {
    setActiveViewId(view.id);
    setVisibleColumns(view.visible_columns || []);
  };

  const applyFullView = () => {
    setActiveViewId('default');
    setVisibleColumns(columns.map(col => col.key));
  };

  const saveCurrentView = async () => {
    if (!newViewName.trim()) {
      alert('Please enter view name');
      return;
    }

    const { data, error } = await supabase
      .from('dashboard_views')
      .insert({
        page_name: 'orders',
        view_name: newViewName.trim(),
        visible_columns: visibleColumns,
        active_view: false,
      })
      .select();

    if (error) {
      alert(error.message);
      return;
    }

    if (data?.length) {
      setSavedViews(prev => [...prev, data[0]]);
      setActiveViewId(data[0].id);
      setNewViewName('');
      setViewModalOpen(false);
    }
  };

  const deleteView = async viewId => {
    await supabase
      .from('dashboard_views')
      .delete()
      .eq('id', viewId);

    setSavedViews(prev => prev.filter(view => view.id !== viewId));

    if (activeViewId === viewId) {
      applyFullView();
    }
  };

  const filteredOrders = useMemo(() => {
    const orderRange = getDateRange(dateFilter, fromDate, toDate);

    const deliveryRange = getDateRange(
      deliveryDateFilter,
      deliveryFromDate,
      deliveryToDate
    );

    return data
      .filter(order => {
        const status = order.delivery_status || order.status || '';
        if (status === 'Delivered') return false;

        const orderDate = parseOrderDate(order.order_date);
        const deliveryDate = parseDeliveryDate(order.delivery_date);

        if (!orderDate) return false;

        if (orderRange.from && orderDate < orderRange.from) return false;
        if (orderRange.to && orderDate > orderRange.to) return false;

        if (deliveryDateFilter !== 'all') {
          if (!deliveryDate) return false;
          if (deliveryRange.from && deliveryDate < deliveryRange.from) return false;
          if (deliveryRange.to && deliveryDate > deliveryRange.to) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = parseOrderDate(a.order_date);
        const dateB = parseOrderDate(b.order_date);

        return dateB - dateA;
      })
      .map(order => ({
        ...order,
        order_date: formatDateTime(order.order_date),
      }));
  }, [
    data,
    dateFilter,
    fromDate,
    toDate,
    deliveryDateFilter,
    deliveryFromDate,
    deliveryToDate,
  ]);

  useEffect(() => {
    if (filteredOrders.length) {
      setPageData('orders', filteredOrders);
    }
  }, [filteredOrders, setPageData]);

  const filterConfigs = useMemo(() => [
    {
      key: 'delivery_status',
      label: 'Delivery Status',
      type: 'select',
      options: [...new Set(allData.map(d => d.delivery_status).filter(Boolean))],
    },
    {
      key: 'print_status',
      label: 'Print Status',
      type: 'select',
      options: [...new Set(allData.map(d => d.print_status).filter(Boolean))],
    },
    {
      key: 'florist',
      label: 'Florist',
      type: 'select',
      options: [...new Set(allData.map(d => d.florist).filter(v => v && v !== '—'))],
    },
    {
      key: 'payment',
      label: 'Channel',
      type: 'select',
      options: [...new Set(allData.map(d => d.payment).filter(Boolean))],
    },
  ], [allData]);

  const kpis = useMemo(() => computeAggregations(filteredOrders, [
    { name: 'count', field: 'order_id', operation: 'count' },
    { name: 'totalQty', field: 'quantity', operation: 'sum' },
  ]), [filteredOrders]);

  const deliveredCount = useMemo(
    () =>
      filteredOrders.filter(
        o => o.delivery_status === 'Delivered' || o.status === 'Delivered'
      ).length,
    [filteredOrders]
  );

  const printedCount = useMemo(
    () =>
      filteredOrders.filter(
        o => o.printed === true || o.print_status === 'PRINTED'
      ).length,
    [filteredOrders]
  );

  const statusChart = useMemo(() => {
    const counts = {};

    filteredOrders.forEach(o => {
      const s = o.delivery_status || o.status || 'Pending';
      counts[s] = (counts[s] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  const floristChart = useMemo(() => {
    const counts = {};

    filteredOrders.forEach(o => {
      const f = o.florist && o.florist !== '—' ? o.florist : null;
      if (f) counts[f] = (counts[f] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredOrders]);

  if (isLoading) return <LoadingState />;

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="font-medium text-red-500">Failed to load orders</p>
        <p className="text-sm mt-1 text-muted-foreground">{String(error)}</p>

        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="rounded-3xl border bg-gradient-to-br from-white via-pink-50/50 to-white p-4 shadow-sm sm:p-6">
        <PageHeader
          title="Active Orders"
          subtitle={`Showing ${filteredOrders.length} orders by order date`}
          onRefresh={refetch}
          isLoading={isLoading}
        />

        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
          <KPICard title="Total Orders" value={kpis.count} icon={ShoppingBag} color="pink" />
          <KPICard title="Total Qty" value={kpis.totalQty} icon={TrendingUp} color="purple" />
          <KPICard title="Delivered" value={deliveredCount} icon={Truck} color="green" />
          <KPICard title="Printed" value={printedCount} icon={Users} color="amber" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <CalendarDays className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Order Date Filter
              </p>

              <p className="text-xs text-slate-500">
                Filter orders by created/order date
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {dateButtons.map(item => (
              <button
                key={item.key}
                onClick={() => setDateFilter(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  dateFilter === item.key
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-rose-300"
              />

              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-rose-300"
              />
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <CalendarDays className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Delivery Date Filter
              </p>

              <p className="text-xs text-slate-500">
                Filter orders by delivery date
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {dateButtons.map(item => (
              <button
                key={item.key}
                onClick={() => setDeliveryDateFilter(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  deliveryDateFilter === item.key
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {deliveryDateFilter === 'custom' && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={deliveryFromDate}
                onChange={e => setDeliveryFromDate(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-300"
              />

              <input
                type="date"
                value={deliveryToDate}
                onChange={e => setDeliveryToDate(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-300"
              />
            </div>
          )}
        </div>
      </div>

      <FilterBar
        filterConfigs={filterConfigs}
        filters={filters}
        onFilterChange={setFilters}
      />

      <div className="rounded-3xl border bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-950">
              Orders List
            </h3>
            <p className="text-sm text-slate-500">
              Show, hide, drag columns, or save custom views
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applyFullView}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeViewId === 'default'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Full View
            </button>

            {savedViews.map(view => (
              <div key={view.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyView(view)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeViewId === view.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {view.view_name}
                </button>

                <button
                  type="button"
                  onClick={() => deleteView(view.id)}
                  className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-100"
                >
                  ×
                </button>
              </div>
            ))}

            {activeViewId === 'custom' && (
              <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                Unsaved View
              </span>
            )}

            <button
              type="button"
              onClick={() => setViewModalOpen(true)}
              className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              + Save View
            </button>

            <div className="relative">
              {columnMenuOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setColumnMenuOpen(false)}
                />
              )}

              <button
                type="button"
                onClick={() => setColumnMenuOpen(prev => !prev)}
                className="relative z-50 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" />
                Columns
              </button>

              {columnMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-72 rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-2 px-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Show / Hide / Drag Columns
                    </p>
                  </div>

                  <div className="space-y-1">
                    {popupColumns.map(col => {
                      const isVisible = visibleColumns.includes(col.key);

                      return (
                        <div
                          key={col.key}
                          draggable={isVisible}
                          onDragStart={() => setDragColumnKey(col.key)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => moveColumn(col.key)}
                          onDragEnd={() => setDragColumnKey(null)}
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${
                            isVisible
                              ? 'cursor-grab hover:bg-slate-50 active:cursor-grabbing'
                              : 'cursor-default opacity-70 hover:bg-slate-50'
                          } ${
                            dragColumnKey === col.key ? 'bg-rose-50' : ''
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <GripVertical
                              className={`h-4 w-4 shrink-0 ${
                                isVisible ? 'text-slate-300' : 'text-slate-200'
                              }`}
                            />

                            <span className="truncate font-medium text-slate-700">
                              {col.label}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleColumn(col.key)}
                            className="ml-3 shrink-0 rounded-lg p-1 hover:bg-slate-100"
                          >
                            {isVisible ? (
                              <Eye className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-slate-300" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-3 px-2 text-[11px] text-slate-400">
                    Hide/show columns first, then click + Save View.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {viewModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900">
                Save Current View
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Select the columns you want and save them as a view.
              </p>

              <input
                type="text"
                value={newViewName}
                onChange={e => setNewViewName(e.target.value)}
                placeholder="Example: Logistics"
                className="mt-4 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />

              <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {columns.map(col => {
                    const checked = visibleColumns.includes(col.key);

                    return (
                      <label
                        key={col.key}
                        className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleColumn(col.key)}
                          className="h-4 w-4 rounded border-slate-300"
                        />

                        <span className="font-medium text-slate-700">
                          {col.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewModalOpen(false);
                    setNewViewName('');
                  }}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveCurrentView}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Save View
                </button>
              </div>
            </div>
          </div>
        )}

        <DataTable
          columns={displayedColumns}
          data={filteredOrders}
          pageSize={10}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Orders by delivery status"
          type="pie"
          data={statusChart}
          dataKeys={[{ key: 'value', label: 'Orders' }]}
          xKey="name"
          height={240}
        />

        <ChartCard
          title="Orders by florist"
          type="bar"
          data={floristChart}
          dataKeys={[{ key: 'value', label: 'Orders' }]}
          xKey="name"
          height={240}
        />
      </div>
    </div>
  );
}