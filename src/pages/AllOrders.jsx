import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import DataTable from '@/components/dashboard/DataTable';
import { useDashboardStore } from '@/lib/dashboardStore';
import {
  ShoppingBag, DollarSign, Truck, Clock, TrendingUp,
  Search, Calendar, ChevronDown, Package, MapPin, CreditCard,
} from 'lucide-react';
import { loadAllOrders } from '@/modules/all-orders/allOrders.loader';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── helpers ────────────────────────────────────────────────────────────────

function toDateStr(iso) {
  if (!iso) return null;
  return iso.slice(0, 10); // "YYYY-MM-DD"
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function nDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fmtAED(n) {
  return `AED ${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-AE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const CHART_COLORS = ['#c2185b', '#f06292', '#f59e0b', '#0d9488', '#8b5cf6', '#3b82f6', '#ef4444', '#10b981'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-rose-100 bg-white px-4 py-3 shadow-xl text-sm">
      <p className="text-xs text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((e, i) => (
        <p key={i} className="font-semibold" style={{ color: e.color }}>
          {e.name}: {typeof e.value === 'number' ? e.value.toLocaleString() : e.value}
        </p>
      ))}
    </div>
  );
};

// ─── date filter presets ─────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Today',      key: 'today' },
  { label: 'Yesterday',  key: 'yesterday' },
  { label: 'Last 7 days',key: 'last7' },
  { label: 'Last 30 days',key:'last30' },
  { label: 'This month', key: 'thisMonth' },
  { label: 'All time',   key: 'all' },
  { label: 'Custom',     key: 'custom' },
];

function getPresetRange(key) {
  const today = todayStr();
  switch (key) {
    case 'today':     return { from: today, to: today };
    case 'yesterday': return { from: yesterdayStr(), to: yesterdayStr() };
    case 'last7':     return { from: nDaysAgo(6), to: today };
    case 'last30':    return { from: nDaysAgo(29), to: today };
    case 'thisMonth': {
      const d = new Date();
      const from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
      return { from, to: today };
    }
    case 'all':
    default:          return { from: null, to: null };
  }
}

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({ title, value, sub, icon: Icon, grad, iconBg }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl p-5 ${grad}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{title}</p>
          <p className="text-2xl font-bold text-white leading-tight">{value}</p>
          {sub && <p className="text-xs text-white/70">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      {/* decorative blob */}
      <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10" />
    </div>
  );
}

// ─── section card wrapper ────────────────────────────────────────────────────

function SectionCard({ title, sub, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-slate-100 bg-white shadow-sm ${className}`}>
      {(title || sub) && (
        <div className="border-b border-slate-100 px-5 py-4">
          {title && <p className="font-semibold text-slate-900">{title}</p>}
          {sub   && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── columns for table ───────────────────────────────────────────────────────

const columns = [
  { key: 'order_id',          label: 'Order' },
  { key: 'order_date',        label: 'Date' },
  { key: 'customer_name',     label: 'Customer' },
  { key: 'product',           label: 'Products' },
  { key: 'quantity',          label: 'Qty',         format: 'number' },
  { key: 'financial_status',  label: 'Payment' },
  { key: 'fulfillment_status',label: 'Fulfillment' },
  { key: 'city',              label: 'City' },
  { key: 'total',             label: 'Total',        format: 'currency' },
  { key: 'delivery_date',     label: 'Delivery Date' },
  { key: 'delivery_time',     label: 'Delivery Time' },
];

// ─── main page ───────────────────────────────────────────────────────────────

export default function AllOrders() {
  const [rawOrders, setRawOrders]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [preset, setPreset]         = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const setPageData = useDashboardStore(s => s.setPageData);

  // ── fetch ────────────────────────────────────────────────────────────────
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await loadAllOrders();
      setRawOrders(data);
      setPageData('allOrders', data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // ── date range ───────────────────────────────────────────────────────────
  const { from, to } = useMemo(() => {
    if (preset === 'custom') return { from: customFrom || null, to: customTo || null };
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  // ── filtered by date ─────────────────────────────────────────────────────
  const dateFiltered = useMemo(() => {
    if (!from && !to) return rawOrders;
    return rawOrders.filter(o => {
      const d = toDateStr(o.order_date);
      if (!d) return false;
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
  }, [rawOrders, from, to]);

  // ── search filtered ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return dateFiltered;
    return dateFiltered.filter(o =>
      [o.order_id, o.customer_name, o.product, o.city, o.financial_status]
        .join(' ').toLowerCase().includes(q)
    );
  }, [dateFiltered, search]);

  // ── format dates for display ─────────────────────────────────────────────
  const displayOrders = useMemo(() =>
    filtered.map(o => ({
      ...o,
      order_date: o.order_date ? fmtDate(o.order_date) : '—',
    })),
  [filtered]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total     = filtered.length;
    const revenue   = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
    const fulfilled = filtered.filter(o => String(o.fulfillment_status).toLowerCase().includes('fulfilled')).length;
    const pending   = total - fulfilled;
    const avgOrder  = total ? revenue / total : 0;
    return { total, revenue, fulfilled, pending, avgOrder };
  }, [filtered]);

  // ── orders per day (area chart) ──────────────────────────────────────────
  const ordersPerDay = useMemo(() => {
    const map = {};
    filtered.forEach(o => {
      const d = toDateStr(o.order_date);
      if (!d) return;
      const label = new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' });
      if (!map[d]) map[d] = { date: d, label, orders: 0, revenue: 0 };
      map[d].orders++;
      map[d].revenue += Number(o.total || 0);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // ── by city ──────────────────────────────────────────────────────────────
  const byCity = useMemo(() => {
    const map = {};
    filtered.forEach(o => {
      const c = o.city || 'Unknown';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({ name, value }));
  }, [filtered]);

  // ── by fulfillment ───────────────────────────────────────────────────────
  const byFulfillment = useMemo(() => {
    const map = {};
    filtered.forEach(o => {
      const s = o.fulfillment_status || 'Unknown';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ── by payment method ────────────────────────────────────────────────────
  const byPayment = useMemo(() => {
    const map = {};
    filtered.forEach(o => {
      const p = o.payment || 'Other';
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({ name, value }));
  }, [filtered]);

  // ── top products ─────────────────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map = {};
    filtered.forEach(o => {
      const p = o.product || 'N/A';
      if (p === 'N/A') return;
      // products can be comma-separated
      p.split(',').forEach(name => {
        const n = name.trim();
        if (!n) return;
        map[n] = (map[n] || 0) + (Number(o.quantity) || 1);
      });
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({ name, value }));
  }, [filtered]);

  // ── preset label ─────────────────────────────────────────────────────────
  const presetLabel = PRESETS.find(p => p.key === preset)?.label || 'All time';

  if (loading) return <LoadingState message="Loading Shopify orders..." />;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header + date picker ─────────────────────────────────────────── */}
      <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/30 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">All Shopify Orders</h1>
            <p className="mt-0.5 text-sm text-slate-500">Live orders directly from Shopify · {rawOrders.length} total synced</p>
          </div>

          <div className="flex items-center gap-2">
            {/* preset picker */}
            <div className="relative">
              <button
                onClick={() => setShowPresets(v => !v)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
              >
                <Calendar className="h-4 w-4 text-rose-400" />
                {presetLabel}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showPresets && (
                <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-slate-100 bg-white py-2 shadow-xl">
                  {PRESETS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => { setPreset(p.key); setShowPresets(false); }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-rose-50 hover:text-rose-700 ${preset === p.key ? 'font-semibold text-rose-600' : 'text-slate-700'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* custom range */}
            {preset === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
                <span className="text-slate-400 text-sm">→</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
              </div>
            )}

            <button
              onClick={fetchOrders}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:shadow-md transition-all"
            >
              <TrendingUp className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* ── KPI strip ───────────────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <StatCard title="Orders"    value={kpis.total}          sub={`${presetLabel}`}
            icon={ShoppingBag} grad="bg-gradient-to-br from-rose-500 to-rose-700" iconBg="bg-white/20" />
          <StatCard title="Revenue"   value={fmtAED(kpis.revenue)} sub="Total paid"
            icon={DollarSign}  grad="bg-gradient-to-br from-emerald-500 to-teal-600" iconBg="bg-white/20" />
          <StatCard title="Fulfilled" value={kpis.fulfilled}       sub={`${kpis.total ? Math.round(kpis.fulfilled/kpis.total*100) : 0}% of orders`}
            icon={Truck}       grad="bg-gradient-to-br from-violet-500 to-indigo-600" iconBg="bg-white/20" />
          <StatCard title="Pending"   value={kpis.pending}         sub="Awaiting fulfillment"
            icon={Clock}       grad="bg-gradient-to-br from-amber-400 to-orange-500" iconBg="bg-white/20" />
          <StatCard title="Avg Order" value={fmtAED(kpis.avgOrder)} sub="Revenue / order"
            icon={TrendingUp}  grad="bg-gradient-to-br from-blue-500 to-cyan-600" iconBg="bg-white/20" />
        </div>
      </div>

      {/* ── Area chart – orders + revenue over time ─────────────────────── */}
      {ordersPerDay.length > 1 && (
        <SectionCard title="Orders Over Time" sub={`${ordersPerDay.length} days in range`}>
          <div className="px-4 pb-5 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ordersPerDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#c2185b" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#c2185b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#e2e8f0" />
                <YAxis yAxisId="left"  tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#e2e8f0" />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#0d9488', fontSize: 11 }} stroke="#e2e8f0" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
                <Area yAxisId="left"  type="monotone" dataKey="orders"  name="Orders"      stroke="#c2185b" fill="url(#ordersGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (AED)" stroke="#0d9488" fill="url(#revGrad)"   strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* ── 3 col charts ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

        {/* Fulfillment donut */}
        <SectionCard title="Fulfillment Status" sub="Breakdown of order status">
          <div className="px-2 pb-5 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byFulfillment} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={3} stroke="none">
                  {byFulfillment.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Orders by city */}
        <SectionCard title="Orders by City" sub="Top delivery locations">
          <div className="px-2 pb-5 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCity} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#e2e8f0" />
                <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#e2e8f0" width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Orders" fill="#c2185b" radius={[0,6,6,0]}>
                  {byCity.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Payment method */}
        <SectionCard title="Payment Methods" sub="How customers paid">
          <div className="px-2 pb-5 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byPayment} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#e2e8f0" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#e2e8f0" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Orders" radius={[6,6,0,0]}>
                  {byPayment.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ── Top products horizontal bar ──────────────────────────────────── */}
      {topProducts.length > 0 && (
        <SectionCard title="Top Products" sub={`Best sellers in selected period · ${filtered.length} orders`}>
          <div className="p-5 space-y-3">
            {topProducts.map((p, i) => {
              const pct = Math.round((p.value / (topProducts[0]?.value || 1)) * 100);
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-xs font-bold text-slate-400">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                      <span className="ml-2 shrink-0 text-xs font-semibold text-slate-500">{p.value}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ── Search + raw table ───────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">Order Details</p>
            <p className="text-xs text-slate-400">{filtered.length} orders in selected range</p>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search orders, customer, products..."
              className="h-10 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 sm:w-72"
            />
          </div>
        </div>
        <DataTable columns={columns} data={displayOrders} pageSize={15} />
      </div>

    </div>
  );
}