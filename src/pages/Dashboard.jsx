import React, { useMemo } from 'react';
import { useSheetData } from '@/lib/sheetsEngine';
import LoadingState from '@/components/dashboard/LoadingState';
import DataTable from '@/components/dashboard/DataTable';
import {
  ShoppingBag, Truck, Package, Printer, AlertTriangle, Users,
  RefreshCcw, Flower, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── palette ──────────────────────────────────────────────────────────────────
const COLORS = ['#c2185b','#f06292','#f59e0b','#0d9488','#8b5cf6','#3b82f6','#ef4444','#10b981'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-rose-100 bg-white px-4 py-3 shadow-xl text-xs">
      {label && <p className="mb-1 font-semibold text-slate-500">{label}</p>}
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color }} className="font-bold">
          {e.name}: {typeof e.value === 'number' ? e.value.toLocaleString() : e.value}
        </p>
      ))}
    </div>
  );
};

// ─── stat card inside the hero ────────────────────────────────────────────────
function HeroStat({ title, value, icon: Icon, bg, sub }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-2xl p-4 ${bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{title}</p>
        <Icon className="h-4 w-4 text-white/50" />
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-[11px] text-white/60">{sub}</p>}
    </div>
  );
}

// ─── section wrapper ──────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-slate-100 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHead({ title, sub }) {
  return (
    <div className="border-b border-slate-100 px-5 py-4">
      <p className="font-semibold text-slate-900">{title}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── top products bar list ────────────────────────────────────────────────────
function TopProductsList({ items }) {
  const max = items[0]?.value || 1;
  return (
    <div className="p-5 space-y-3">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-300">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="truncate text-sm font-medium text-slate-800">{item.label}</p>
              <span className="ml-2 shrink-0 text-xs font-bold text-slate-500">{item.value}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${Math.round((item.value / max) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ops summary list ─────────────────────────────────────────────────────────
function OpsSummary({ items }) {
  return (
    <div className="p-5 space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`h-2 w-2 rounded-full ${item.dot}`} />
            <span className="text-sm text-slate-600">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{item.value}</span>
            {item.trend === 'up'   && <TrendingUp   className="h-3.5 w-3.5 text-emerald-500" />}
            {item.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
            {item.trend === 'flat' && <Minus        className="h-3.5 w-3.5 text-slate-300" />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── recent cols ──────────────────────────────────────────────────────────────
const recentCols = [
  { key: 'order_id',        label: 'Order' },
  { key: 'delivery_date',   label: 'Delivery' },
  { key: 'customer_name',   label: 'Customer' },
  { key: 'product',         label: 'Product' },
  { key: 'quantity',        label: 'Qty',      format: 'number' },
  { key: 'florist',         label: 'Florist' },
  { key: 'delivery_status', label: 'Status' },
  { key: 'payment',         label: 'Channel' },
];

function normalizeStatus(o) { return o.delivery_status || o.status || 'Pending'; }

// ─── page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const orders   = useSheetData('orders');
  const products = useSheetData('products');

  const rows = orders.allData || [];

  // ── stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalOrders = rows.length;
    const totalQty    = rows.reduce((s, o) => s + (Number(o.quantity) || 1), 0);
    const delivered   = rows.filter(o => normalizeStatus(o).toLowerCase().includes('delivered')).length;
    const printed     = rows.filter(o => o.printed === true || String(o.print_status || '').toUpperCase().includes('PRINTED')).length;
    const noDriver    = rows.filter(o => normalizeStatus(o).toLowerCase().includes('driver')).length;
    const pending     = rows.filter(o => { const s = normalizeStatus(o).toLowerCase(); return !s || s === 'pending' || s.includes('no driver'); }).length;
    const shopify     = rows.filter(o => o.payment === 'Shopify').length;
    const manual      = rows.filter(o => o.payment === 'Manual').length;
    return { totalOrders, totalQty, delivered, printed, noDriver, pending, shopify, manual };
  }, [rows]);

  // ── charts ─────────────────────────────────────────────────────────────────
  const ordersByStatus = useMemo(() => {
    const m = {};
    rows.forEach(o => { const s = normalizeStatus(o); m[s] = (m[s]||0)+1; });
    return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  }, [rows]);

  const ordersByChannel = useMemo(() => {
    const m = {};
    rows.forEach(o => { const c = o.payment||'Other'; m[c]=(m[c]||0)+1; });
    return Object.entries(m).map(([name,value])=>({name,value}));
  }, [rows]);

  const ordersByFlorist = useMemo(() => {
    const m = {};
    rows.forEach(o => { const f = (o.florist && o.florist!=='—') ? o.florist : 'Unassigned'; m[f]=(m[f]||0)+1; });
    return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,8);
  }, [rows]);

  const topProducts = useMemo(() => {
    const m = {};
    rows.forEach(o => { const p = o.product||'N/A'; m[p]=(m[p]||0)+(Number(o.quantity)||1); });
    return Object.entries(m).sort(([,a],[,b])=>b-a).slice(0,8).map(([label,value])=>({label,value,dot:'bg-pink-500'}));
  }, [rows]);

  const recentOrders = useMemo(() => [...rows].slice(0,10), [rows]);

  if (orders.isLoading) return <LoadingState message="Loading live dashboard..." />;

  return (
    <div className="space-y-5 pb-10">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 p-5 shadow-xl sm:p-6">
        {/* blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-40 w-40 rounded-full bg-pink-500/10 blur-xl" />

        {/* header row */}
        <div className="relative mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 ring-1 ring-rose-500/30">
              <Flower className="h-5 w-5 text-rose-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Operations Dashboard</h1>
              <p className="text-xs text-slate-400">Live · Google Sheets</p>
            </div>
          </div>
          <button
            onClick={() => { orders.refetch(); products.refetch(); }}
            className="flex items-center gap-1.5 rounded-2xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/20"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* KPI grid */}
        <div className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
          <HeroStat title="Total Orders" value={stats.totalOrders} icon={ShoppingBag} bg="bg-white/10" />
          <HeroStat title="Total Qty"    value={stats.totalQty}    icon={Package}     bg="bg-white/10" />
          <HeroStat title="Delivered"    value={stats.delivered}   icon={Truck}       bg="bg-emerald-500/20" sub={`${stats.totalOrders ? Math.round(stats.delivered/stats.totalOrders*100) : 0}% of orders`} />
          <HeroStat title="Printed"      value={stats.printed}     icon={Printer}     bg="bg-amber-500/20" />
          <HeroStat title="Pending"      value={stats.pending}     icon={AlertTriangle} bg="bg-red-500/20" />
          <HeroStat title="Shopify"      value={stats.shopify}     icon={Users}       bg="bg-blue-500/20" />
        </div>
      </div>

      {/* ── 3 CHARTS ROW ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

        {/* status donut */}
        <Card>
          <CardHead title="Delivery Status" sub="Breakdown of all orders" />
          <div className="px-2 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={52} outerRadius={82}
                  dataKey="value" nameKey="name" paddingAngle={3} stroke="none">
                  {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* channel bar */}
        <Card>
          <CardHead title="Orders by Channel" sub="Shopify vs manual" />
          <div className="px-3 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ordersByChannel} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#e2e8f0" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#e2e8f0" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Orders" radius={[6,6,0,0]}>
                  {ordersByChannel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* florist bar */}
        <Card>
          <CardHead title="Orders by Florist" sub="Top 8 florists" />
          <div className="px-3 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ordersByFlorist} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#e2e8f0" />
                <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} stroke="#e2e8f0" width={72} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Orders" radius={[0,6,6,0]}>
                  {ordersByFlorist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── SUMMARY CARDS ROW ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHead title="Top Products" sub="Best sellers by quantity" />
          <TopProductsList items={topProducts} />
        </Card>

        <Card>
          <CardHead title="Quick Ops Summary" sub="Live snapshot" />
          <OpsSummary items={[
            { label: 'Shopify Orders',   value: stats.shopify,                                          dot: 'bg-blue-500',    trend: 'up' },
            { label: 'Manual Orders',    value: stats.manual,                                           dot: 'bg-amber-500',   trend: 'flat' },
            { label: 'No Driver',        value: stats.noDriver,                                         dot: 'bg-red-500',     trend: stats.noDriver > 5 ? 'down' : 'flat' },
            { label: 'Pending Orders',   value: stats.pending,                                          dot: 'bg-orange-400',  trend: stats.pending > 10 ? 'down' : 'flat' },
            { label: 'Unique Products',  value: new Set(rows.map(o => o.product)).size,                 dot: 'bg-pink-500',    trend: 'flat' },
            { label: 'Fulfillment Rate', value: `${stats.totalOrders ? Math.round(stats.delivered/stats.totalOrders*100) : 0}%`, dot: 'bg-emerald-500', trend: 'up' },
          ]} />
        </Card>
      </div>

      {/* ── RECENT ORDERS TABLE ────────────────────────────────────────────── */}
      <Card>
        <CardHead title="Recent Orders" sub="Latest live orders from connected sheets" />
        <DataTable columns={recentCols} data={recentOrders} pageSize={10} />
      </Card>

    </div>
  );
}