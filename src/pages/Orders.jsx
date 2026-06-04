import React, { useState, useMemo, useEffect } from 'react';
import { useSheetData, computeAggregations } from '@/lib/sheetsEngine';
import KPICard from '@/components/dashboard/KPICard';
import DataTable from '@/components/dashboard/DataTable';
import ChartCard from '@/components/dashboard/ChartCard';
import { useDashboardStore } from '@/lib/dashboardStore';
import LoadingState from '@/components/dashboard/LoadingState';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  ShoppingBag, Truck, TrendingUp, Users, CalendarDays,
  Eye, EyeOff, GripVertical, SlidersHorizontal, RefreshCcw,
  ChevronDown, X, Save, Flower,
} from 'lucide-react';

// ─── column definitions ───────────────────────────────────────────────────────
const columns = [
  { key: 'delivery_date',    label: 'Delivery Date' },
  { key: 'order_id',         label: 'Order #' },
  { key: 'customer_name',    label: 'Customer' },
  { key: 'product',          label: 'Product' },
  { key: 'quantity',         label: 'Qty',          format: 'number' },
  { key: 'print_status',     label: 'Print Status' },
  { key: 'florist',          label: 'Florist' },
  { key: 'delivery_status',  label: 'Delivery' },
  { key: 'address',          label: 'Address' },
  { key: 'order_date',       label: 'Order Date' },
  { key: 'florist_time',     label: 'Florist Time' },
  { key: 'storage_time',     label: 'Storage Time' },
  { key: 'time_to_delivery', label: 'Time to Del.' },
  { key: 'dispatch_time',    label: 'Dispatch' },
  { key: 'payment',          label: 'Channel' },
];

// ─── date helpers ─────────────────────────────────────────────────────────────
function parseOrderDate(value) {
  if (!value) return null;
  const text = String(value).replace(/st|nd|rd|th/g, '').replace(' - ', ' ').trim();
  const parsed = new Date(`${text} ${new Date().getFullYear()}`);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseDeliveryDate(value) {
  if (!value) return null;
  const parts = String(value).trim().split(/[\/\-]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const p = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(p.getTime()) ? null : p;
  }
  const p = new Date(String(value).trim());
  return isNaN(p.getTime()) ? null : p;
}

function formatDateTime(value) {
  const d = parseOrderDate(value);
  if (!d) return value;
  return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

const sob = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const eob = d => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

function getDateRange(type, from, to) {
  const today = new Date();
  if (type === 'today')     return { from: sob(today), to: eob(today) };
  if (type === 'yesterday') { const y = new Date(); y.setDate(y.getDate()-1); return { from: sob(y), to: eob(y) }; }
  if (type === 'week')      { const w = new Date(); w.setDate(w.getDate()-7); return { from: sob(w), to: eob(today) }; }
  if (type === 'month')     return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: eob(today) };
  if (type === 'custom')    return { from: from ? sob(new Date(from)) : null, to: to ? eob(new Date(to)) : null };
  return { from: null, to: null };
}

const DATE_BTNS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: 'Month' },
  { key: 'custom', label: 'Custom' },
];

// ─── small reusable pieces ────────────────────────────────────────────────────
function DatePill({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
        active
          ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function FilterChip({ label, value, options, onChange }) {
  return (
    <div className="relative">
      <select
        value={value || 'all'}
        onChange={e => onChange(e.target.value)}
        className="h-9 appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-7 text-xs font-medium text-slate-700 shadow-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 cursor-pointer"
      >
        <option value="all">All {label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

// ─── delivery date badge ──────────────────────────────────────────────────────
function fmtShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short' });
}

function DeliveryDateBadge({ filter, from, to }) {
  const today    = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);

  let icon = '🚚';
  let label = '';
  let dateStr = '';
  let colorClass = 'bg-blue-50 border-blue-200 text-blue-700';

  if (filter === 'today') {
    label = 'Delivering Today';
    dateStr = today.toLocaleDateString('en-AE', { weekday: 'short', day: '2-digit', month: 'short' });
    colorClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
    icon = '🌸';
  } else if (filter === 'yesterday') {
    label = 'Delivered Yesterday';
    dateStr = yesterday.toLocaleDateString('en-AE', { weekday: 'short', day: '2-digit', month: 'short' });
    colorClass = 'bg-slate-50 border-slate-200 text-slate-600';
    icon = '📦';
  } else if (filter === 'week') {
    label = 'Last 7 Days';
    const w = new Date(); w.setDate(today.getDate() - 6);
    dateStr = `${fmtShort(w.toISOString())} → ${fmtShort(today.toISOString())}`;
    colorClass = 'bg-violet-50 border-violet-200 text-violet-700';
  } else if (filter === 'month') {
    label = 'This Month';
    dateStr = today.toLocaleDateString('en-AE', { month: 'long', year: 'numeric' });
    colorClass = 'bg-indigo-50 border-indigo-200 text-indigo-700';
  } else if (filter === 'custom' && from && to) {
    label = 'Custom Range';
    dateStr = `${fmtShort(from)} → ${fmtShort(to)}`;
    colorClass = 'bg-amber-50 border-amber-200 text-amber-700';
    icon = '📅';
  } else if (filter === 'all') {
    label = 'All Delivery Dates';
    dateStr = 'No date filter applied';
    colorClass = 'bg-slate-50 border-slate-200 text-slate-500';
    icon = '🗓️';
  } else {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${colorClass}`}>
      <span className="text-sm leading-none">{icon}</span>
      <span className="text-[11px] font-semibold">{label}</span>
      {dateStr && (
        <>
          <span className="h-3 w-px bg-current opacity-30" />
          <span className="text-[11px] font-medium opacity-80">{dateStr}</span>
        </>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function Orders() {
  const { user } = useAuth();

  // filters
  const [filters, setFilters]                     = useState({});
  const [dateFilter, setDateFilter]               = useState('today');
  const [fromDate, setFromDate]                   = useState('');
  const [toDate, setToDate]                       = useState('');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('today');
  const [deliveryFromDate, setDeliveryFromDate]   = useState('');
  const [deliveryToDate, setDeliveryToDate]       = useState('');
  const [filtersOpen, setFiltersOpen]             = useState(false);

  // column management
  const [columnMenuOpen, setColumnMenuOpen]       = useState(false);
  const [dragColumnKey, setDragColumnKey]         = useState(null);
  const [visibleColumns, setVisibleColumns]       = useState(columns.map(c => c.key));

  // saved views
  const [savedViews, setSavedViews]               = useState([]);
  const [activeViewId, setActiveViewId]           = useState('default');
  const [viewModalOpen, setViewModalOpen]         = useState(false);
  const [newViewName, setNewViewName]             = useState('');

  const setPageData = useDashboardStore(s => s.setPageData);
  const { data, allData, isLoading, error, refetch } = useSheetData('orders', { filters });

  useEffect(() => { if (user?.email) loadViews(); }, [user?.email]);

  async function loadViews() {
    const { data } = await supabase
      .from('dashboard_views').select('*')
      .eq('page_name', 'orders').eq('user_email', user?.email)
      .order('created_at', { ascending: true });
    if (data) setSavedViews(data);
  }

  // ── column helpers ──────────────────────────────────────────────────────────
  const displayedColumns = useMemo(() =>
    visibleColumns.map(k => columns.find(c => c.key === k)).filter(Boolean),
  [visibleColumns]);

  const popupColumns = useMemo(() =>
    [...columns].sort((a, b) => {
      const ai = visibleColumns.indexOf(a.key), bi = visibleColumns.indexOf(b.key);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    }),
  [visibleColumns]);

  const toggleColumn = key => {
    setActiveViewId('custom');
    setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const moveColumn = targetKey => {
    if (!dragColumnKey || dragColumnKey === targetKey) return;
    setActiveViewId('custom');
    setVisibleColumns(prev => {
      const c = [...prev];
      const fi = c.indexOf(dragColumnKey), ti = c.indexOf(targetKey);
      if (fi === -1 || ti === -1) return c;
      c.splice(fi, 1); c.splice(ti, 0, dragColumnKey);
      return c;
    });
  };

  const applyView      = v => { setActiveViewId(v.id); setVisibleColumns(v.visible_columns || []); };
  const applyFullView  = () => { setActiveViewId('default'); setVisibleColumns(columns.map(c => c.key)); };

  const saveCurrentView = async () => {
    if (!newViewName.trim() || !user?.email) return;
    const { data } = await supabase.from('dashboard_views')
      .insert({ page_name: 'orders', view_name: newViewName.trim(), visible_columns: visibleColumns, active_view: false, user_email: user.email })
      .select();
    if (data?.length) { setSavedViews(p => [...p, data[0]]); setActiveViewId(data[0].id); setNewViewName(''); setViewModalOpen(false); }
  };

  const deleteView = async id => {
    await supabase.from('dashboard_views').delete().eq('id', id).eq('user_email', user?.email);
    setSavedViews(p => p.filter(v => v.id !== id));
    if (activeViewId === id) applyFullView();
  };

  // ── filter options ──────────────────────────────────────────────────────────
  const filterConfigs = useMemo(() => [
    { key: 'delivery_status', label: 'Delivery', options: [...new Set(allData.map(d => d.delivery_status).filter(Boolean))] },
    { key: 'print_status',    label: 'Print',    options: [...new Set(allData.map(d => d.print_status).filter(Boolean))] },
    { key: 'florist',         label: 'Florist',  options: [...new Set(allData.map(d => d.florist).filter(v => v && v !== '—'))] },
    { key: 'payment',         label: 'Channel',  options: [...new Set(allData.map(d => d.payment).filter(Boolean))] },
  ], [allData]);

  const hasActiveFilters = Object.values(filters).some(v => v && v !== '' && v !== 'all');

  // ── filtered data ───────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const oRange = getDateRange(dateFilter, fromDate, toDate);
    const dRange = getDateRange(deliveryDateFilter, deliveryFromDate, deliveryToDate);

    return data
      .filter(o => {
        if ((o.delivery_status || o.status || '') === 'Delivered') return false;
        const od = parseOrderDate(o.order_date);
        const dd = parseDeliveryDate(o.delivery_date);
        if (!od) return false;
        if (oRange.from && od < oRange.from) return false;
        if (oRange.to   && od > oRange.to)   return false;
        if (deliveryDateFilter !== 'all') {
          if (!dd) return false;
          if (dRange.from && dd < dRange.from) return false;
          if (dRange.to   && dd > dRange.to)   return false;
        }
        return true;
      })
      .sort((a, b) => (parseOrderDate(b.order_date) || 0) - (parseOrderDate(a.order_date) || 0))
      .map(o => ({ ...o, order_date: formatDateTime(o.order_date) }));
  }, [data, dateFilter, fromDate, toDate, deliveryDateFilter, deliveryFromDate, deliveryToDate]);

  useEffect(() => { if (filteredOrders.length) setPageData('orders', filteredOrders); }, [filteredOrders]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => computeAggregations(filteredOrders, [
    { name: 'count', field: 'order_id', operation: 'count' },
    { name: 'totalQty', field: 'quantity', operation: 'sum' },
  ]), [filteredOrders]);

  const deliveredCount = useMemo(() => filteredOrders.filter(o => o.delivery_status === 'Delivered' || o.status === 'Delivered').length, [filteredOrders]);
  const printedCount   = useMemo(() => filteredOrders.filter(o => o.printed === true || o.print_status === 'PRINTED').length, [filteredOrders]);

  // ── charts ──────────────────────────────────────────────────────────────────
  const statusChart = useMemo(() => {
    const m = {};
    filteredOrders.forEach(o => { const s = o.delivery_status || o.status || 'Pending'; m[s] = (m[s]||0)+1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);
  }, [filteredOrders]);

  const floristChart = useMemo(() => {
    const m = {};
    filteredOrders.forEach(o => { const f = o.florist && o.florist !== '—' ? o.florist : null; if (f) m[f] = (m[f]||0)+1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value).slice(0,8);
  }, [filteredOrders]);

  // ── loading / error ─────────────────────────────────────────────────────────
  if (isLoading) return <LoadingState />;
  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="font-semibold text-red-500">Failed to load orders</p>
      <p className="mt-1 text-sm text-slate-400">{String(error)}</p>
      <button onClick={refetch} className="mt-4 rounded-2xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white">Retry</button>
    </div>
  );

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-w-0 space-y-4 pb-10">

      {/* ── HERO HEADER ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-rose-500 to-pink-500 p-5 shadow-lg sm:p-6">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 left-20 h-28 w-28 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20">
                <Flower className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Active Orders</h1>
            </div>
            <p className="mt-1.5 text-sm text-rose-100">
              {filteredOrders.length} orders · live from Google Sheets
            </p>
          </div>

          <button
            onClick={refetch}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30 sm:w-auto"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* KPI strip */}
        <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: 'Orders',    value: kpis.count,     icon: ShoppingBag },
            { label: 'Qty',       value: kpis.totalQty,  icon: TrendingUp },
            { label: 'Delivered', value: deliveredCount, icon: Truck },
            { label: 'Printed',   value: printedCount,   icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <Icon className="h-5 w-5 shrink-0 text-white/80" />
              <div>
                <p className="text-xs font-medium text-rose-100">{label}</p>
                <p className="text-lg font-bold leading-tight text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DATE FILTERS ───────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Order date */}
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50">
              <CalendarDays className="h-4 w-4 text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Order Date</p>
              <p className="text-[11px] text-slate-400">Filter by order created date</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DATE_BTNS.map(b => (
              <DatePill key={b.key} label={b.label} active={dateFilter === b.key} onClick={() => setDateFilter(b.key)} />
            ))}
          </div>
          {dateFilter === 'custom' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="h-10 rounded-2xl border border-slate-200 px-3 text-xs outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100" />
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="h-10 rounded-2xl border border-slate-200 px-3 text-xs outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100" />
            </div>
          )}
        </div>

        {/* Delivery date */}
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <Truck className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Delivery Date</p>
              <p className="text-[11px] text-slate-400">Filter by scheduled delivery</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DATE_BTNS.map(b => (
              <button
                key={b.key}
                onClick={() => setDeliveryDateFilter(b.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  deliveryDateFilter === b.key
                    ? 'bg-blue-500 text-white shadow-sm shadow-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          {deliveryDateFilter === 'custom' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input type="date" value={deliveryFromDate} onChange={e => setDeliveryFromDate(e.target.value)}
                className="h-10 rounded-2xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
              <input type="date" value={deliveryToDate} onChange={e => setDeliveryToDate(e.target.value)}
                className="h-10 rounded-2xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
            </div>
          )}
        </div>
      </div>

      {/* ── FILTERS ROW ────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
        {/* mobile toggle */}
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className="flex w-full items-center justify-between px-4 py-3.5 sm:hidden"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-rose-400" />
            <span className="text-sm font-semibold text-slate-800">Filters</span>
            {hasActiveFilters && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {Object.values(filters).filter(v => v && v !== 'all').length}
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* desktop always visible, mobile collapsible */}
        <div className={`px-4 pb-4 pt-1 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:px-4 sm:py-3 ${filtersOpen ? 'block' : 'hidden sm:flex'}`}>
          <div className="flex items-center gap-1.5 pb-2 sm:pb-0">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden text-xs font-semibold text-slate-400 sm:inline">FILTERS</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterConfigs.map(cfg => (
              <FilterChip
                key={cfg.key}
                label={cfg.label}
                value={filters[cfg.key]}
                options={cfg.options}
                onChange={val => setFilters(p => ({ ...p, [cfg.key]: val }))}
              />
            ))}

            {hasActiveFilters && (
              <button
                onClick={() => setFilters({})}
                className="flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── ORDERS TABLE ───────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
        {/* table toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">Orders List</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {filteredOrders.length} records
              </span>
            </div>
            {/* Delivery date badge */}
            <DeliveryDateBadge
              filter={deliveryDateFilter}
              from={deliveryFromDate}
              to={deliveryToDate}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* view pills */}
            <button
              onClick={applyFullView}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                activeViewId === 'default' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >Full</button>

            {savedViews.map(v => (
              <div key={v.id} className="flex items-center gap-1">
                <button
                  onClick={() => applyView(v)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    activeViewId === v.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >{v.view_name}</button>
                <button onClick={() => deleteView(v.id)} className="rounded-full bg-red-50 px-1.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-100">×</button>
              </div>
            ))}

            {activeViewId === 'custom' && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-600">Unsaved</span>
            )}

            <button
              onClick={() => setViewModalOpen(true)}
              className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
            >
              <Save className="h-3 w-3" /> Save view
            </button>

            {/* columns picker */}
            <div className="relative">
              {columnMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setColumnMenuOpen(false)} />}
              <button
                onClick={() => setColumnMenuOpen(v => !v)}
                className="relative z-50 flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <Eye className="h-3.5 w-3.5" /> Columns
              </button>

              {columnMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-3xl border border-slate-100 bg-white p-3 shadow-2xl">
                  <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Show / Hide / Drag</p>
                  <div className="space-y-0.5 max-h-72 overflow-y-auto">
                    {popupColumns.map(col => {
                      const visible = visibleColumns.includes(col.key);
                      return (
                        <div
                          key={col.key}
                          draggable={visible}
                          onDragStart={() => setDragColumnKey(col.key)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => moveColumn(col.key)}
                          onDragEnd={() => setDragColumnKey(null)}
                          className={`flex items-center justify-between rounded-2xl px-3 py-2 text-xs transition ${
                            visible ? 'cursor-grab hover:bg-slate-50 active:cursor-grabbing' : 'cursor-default opacity-50 hover:bg-slate-50'
                          } ${dragColumnKey === col.key ? 'bg-rose-50' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                            <span className="font-medium text-slate-700">{col.label}</span>
                          </div>
                          <button onClick={() => toggleColumn(col.key)} className="rounded-lg p-1 hover:bg-slate-100">
                            {visible
                              ? <Eye className="h-3.5 w-3.5 text-emerald-500" />
                              : <EyeOff className="h-3.5 w-3.5 text-slate-300" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DataTable columns={displayedColumns} data={filteredOrders} pageSize={10} />
      </div>

      {/* ── CHARTS ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Orders by Delivery Status" type="pie" data={statusChart}
          dataKeys={[{ key: 'value', label: 'Orders' }]} xKey="name" height={240} />
        <ChartCard title="Orders by Florist" type="bar" data={floristChart}
          dataKeys={[{ key: 'value', label: 'Orders' }]} xKey="name" height={240} />
      </div>

      {/* ── SAVE VIEW MODAL ─────────────────────────────────────────────────── */}
      {viewModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Save Current View</h3>
            <p className="mt-0.5 text-xs text-slate-400">Choose columns then give this view a name.</p>

            <input
              type="text" value={newViewName} onChange={e => setNewViewName(e.target.value)}
              placeholder="e.g. Logistics, Florist view..."
              className="mt-4 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
            />

            <div className="mt-3 max-h-52 overflow-y-auto rounded-2xl border border-slate-100 p-3">
              <div className="grid grid-cols-2 gap-1">
                {columns.map(col => (
                  <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs hover:bg-slate-50">
                    <input type="checkbox" checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)} className="h-3.5 w-3.5 rounded accent-rose-500" />
                    <span className="font-medium text-slate-700">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setViewModalOpen(false); setNewViewName(''); }}
                className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition">
                Cancel
              </button>
              <button onClick={saveCurrentView}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition">
                Save View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}