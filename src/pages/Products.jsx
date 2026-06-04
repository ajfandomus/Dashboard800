import React, { useState, useMemo, useEffect } from 'react';
import { useSheetData } from '@/lib/sheetsEngine';
import DataTable from '@/components/dashboard/DataTable';
import LoadingState from '@/components/dashboard/LoadingState';
import { useDashboardStore } from '@/lib/dashboardStore';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  Package, TrendingUp, Star, AlertTriangle, RefreshCcw,
  Eye, EyeOff, GripVertical, Search, ChevronDown,
  Flame, Minus, Save, X, Flower,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── columns ──────────────────────────────────────────────────────────────────
const columns = [
  { key: 'name',            label: 'Product Name' },
  { key: 'category',        label: 'Category' },
  { key: 'occasion',        label: 'Occasion' },
  { key: 'sales_count',     label: 'Units Sold',  format: 'number' },
  { key: 'order_count',     label: 'Orders',      format: 'number' },
  { key: 'trend',           label: 'Trend',       format: 'status' },
  { key: 'last_order_date', label: 'Last Sold' },
];

const COLORS = ['#c2185b','#f06292','#f59e0b','#0d9488','#8b5cf6','#3b82f6','#ef4444','#10b981'];

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
    const [d, m, y] = parts;
    const p = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(p.getTime()) ? null : p;
  }
  return null;
}

const sob = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const eob = d => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

function getRange(type, from, to) {
  const now = new Date();
  if (type === 'today')     return { from: sob(now), to: eob(now) };
  if (type === 'yesterday') { const y=new Date(); y.setDate(y.getDate()-1); return {from:sob(y),to:eob(y)}; }
  if (type === 'week')      { const w=new Date(); w.setDate(w.getDate()-7); return {from:sob(w),to:eob(now)}; }
  if (type === 'month')     return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: eob(now) };
  if (type === 'custom')    return { from: from ? sob(new Date(from)) : null, to: to ? eob(new Date(to)) : null };
  return { from: null, to: null };
}

const DATE_BTNS = [
  { key:'all',       label:'All' },
  { key:'today',     label:'Today' },
  { key:'yesterday', label:'Yesterday' },
  { key:'week',      label:'7 Days' },
  { key:'month',     label:'Month' },
  { key:'custom',    label:'Custom' },
];

function isAddon(name) {
  const v = String(name||'').toLowerCase();
  return ['card','balloon','message','foil','cake topper','chocolate','teddy','addon','gift card']
    .some(w => v.includes(w));
}

// ─── small UI pieces ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-rose-100 bg-white px-4 py-3 shadow-xl text-xs">
      {label && <p className="mb-1 font-semibold text-slate-500">{label}</p>}
      {payload.map((e,i) => (
        <p key={i} style={{color:e.color}} className="font-bold">{e.name}: {e.value?.toLocaleString()}</p>
      ))}
    </div>
  );
};

function HeroStat({ title, value, icon: Icon, bg, sub }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-2xl p-4 ${bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{title}</p>
        <Icon className="h-4 w-4 text-white/50" />
      </div>
      <p className="text-2xl font-bold text-white leading-none truncate">{value}</p>
      {sub && <p className="text-[11px] text-white/60">{sub}</p>}
    </div>
  );
}

function DateFilter({ label, color, value, onChange, from, to, onFrom, onTo }) {
  const accent = color === 'blue' ? {
    active: 'bg-blue-500 text-white shadow-sm shadow-blue-200',
    ring: 'focus:ring-blue-100 focus:border-blue-300',
  } : {
    active: 'bg-rose-500 text-white shadow-sm shadow-rose-200',
    ring: 'focus:ring-rose-100 focus:border-rose-300',
  };
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-800">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {DATE_BTNS.map(b => (
          <button key={b.key} onClick={() => onChange(b.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${value === b.key ? accent.active : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {b.label}
          </button>
        ))}
      </div>
      {value === 'custom' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input type="date" value={from} onChange={e => onFrom(e.target.value)}
            className={`h-10 rounded-2xl border border-slate-200 px-3 text-xs outline-none focus:ring-2 ${accent.ring}`} />
          <input type="date" value={to} onChange={e => onTo(e.target.value)}
            className={`h-10 rounded-2xl border border-slate-200 px-3 text-xs outline-none focus:ring-2 ${accent.ring}`} />
        </div>
      )}
    </div>
  );
}

function TrendBadge({ trend }) {
  const map = {
    'Best Selling': 'bg-emerald-50 text-emerald-700',
    'Trending':     'bg-blue-50 text-blue-700',
    'Least Selling':'bg-red-50 text-red-500',
    'Normal':       'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[trend] || map.Normal}`}>
      {trend === 'Best Selling' && <Flame className="h-3 w-3" />}
      {trend === 'Trending'     && <TrendingUp className="h-3 w-3" />}
      {trend}
    </span>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function Products() {
  const { user } = useAuth();

  const [orderDateFilter,    setOrderDateFilter]    = useState('today');
  const [orderFromDate,      setOrderFromDate]      = useState('');
  const [orderToDate,        setOrderToDate]        = useState('');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('today');
  const [deliveryFromDate,   setDeliveryFromDate]   = useState('');
  const [deliveryToDate,     setDeliveryToDate]     = useState('');

  const [search,      setSearch]      = useState('');
  const [trendFilter, setTrendFilter] = useState('all');

  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [dragColumnKey,  setDragColumnKey]  = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(columns.map(c => c.key));

  const [savedViews,   setSavedViews]   = useState([]);
  const [activeViewId, setActiveViewId] = useState('default');
  const [viewModalOpen,setViewModalOpen]= useState(false);
  const [newViewName,  setNewViewName]  = useState('');

  const setPageData = useDashboardStore(s => s.setPageData);
  const orders      = useSheetData('orders');
  const isLoading   = orders.isLoading;

  useEffect(() => { if (user?.email) loadViews(); }, [user?.email]);

  async function loadViews() {
    const { data } = await supabase.from('dashboard_views').select('*')
      .eq('page_name','products').eq('user_email',user?.email).order('created_at');
    if (data) setSavedViews(data);
  }

  const displayedColumns = useMemo(() =>
    visibleColumns.map(k => columns.find(c => c.key === k)).filter(Boolean),
  [visibleColumns]);

  const popupColumns = useMemo(() =>
    [...columns].sort((a,b) => {
      const ai=visibleColumns.indexOf(a.key), bi=visibleColumns.indexOf(b.key);
      if(ai===-1&&bi===-1) return 0; if(ai===-1) return 1; if(bi===-1) return -1;
      return ai-bi;
    }),
  [visibleColumns]);

  const toggleColumn = key => {
    setActiveViewId('custom');
    setVisibleColumns(p => p.includes(key) ? p.filter(k=>k!==key) : [...p,key]);
  };

  const moveColumn = targetKey => {
    if (!dragColumnKey || dragColumnKey === targetKey) return;
    setActiveViewId('custom');
    setVisibleColumns(p => {
      const c=[...p], fi=c.indexOf(dragColumnKey), ti=c.indexOf(targetKey);
      if(fi===-1||ti===-1) return c;
      c.splice(fi,1); c.splice(ti,0,dragColumnKey); return c;
    });
  };

  const applyView     = v => { setActiveViewId(v.id); setVisibleColumns(v.visible_columns||[]); };
  const applyFullView = () => { setActiveViewId('default'); setVisibleColumns(columns.map(c=>c.key)); };

  const saveCurrentView = async () => {
    if (!newViewName.trim() || !user?.email) return;
    const { data } = await supabase.from('dashboard_views')
      .insert({ page_name:'products', view_name:newViewName.trim(), visible_columns:visibleColumns, active_view:false, user_email:user.email })
      .select();
    if (data?.length) { setSavedViews(p=>[...p,data[0]]); setActiveViewId(data[0].id); setNewViewName(''); setViewModalOpen(false); }
  };

  const deleteView = async id => {
    await supabase.from('dashboard_views').delete().eq('id',id).eq('user_email',user?.email);
    setSavedViews(p=>p.filter(v=>v.id!==id));
    if (activeViewId===id) applyFullView();
  };

  const filteredOrders = useMemo(() => {
    const oRange = getRange(orderDateFilter, orderFromDate, orderToDate);
    const dRange = getRange(deliveryDateFilter, deliveryFromDate, deliveryToDate);

    return orders.allData.filter(order => {
      if (orderDateFilter !== 'all') {
        const od = parseOrderDate(order.order_date);
        if (!od) return false;
        if (oRange.from && od < oRange.from) return false;
        if (oRange.to   && od > oRange.to)   return false;
      }
      if (deliveryDateFilter !== 'all') {
        const dd = parseDeliveryDate(order.delivery_date);
        if (!dd) return false;
        if (dRange.from && dd < dRange.from) return false;
        if (dRange.to   && dd > dRange.to)   return false;
      }
      return true;
    });
  }, [orders.allData, orderDateFilter, orderFromDate, orderToDate, deliveryDateFilter, deliveryFromDate, deliveryToDate]);

  const productSummary = useMemo(() => {
    const map = {};
    filteredOrders.forEach(order => {
      const raw = String(order.product || '').trim();
      if (!raw || raw === 'N/A') return;

      const names = raw.includes(',') ? raw.split(',').map(s=>s.trim()) : [raw];

      names.forEach(name => {
        if (!name) return;
        if (!map[name]) {
          map[name] = {
            name,
            category: guessCategory(name),
            occasion: guessOccasion(name),
            sales_count: 0,
            order_count: 0,
            last_order_date: order.delivery_date || order.order_date || '',
          };
        }
        map[name].sales_count += Number(order.quantity) || 1;
        map[name].order_count += 1;
      });
    });

    const all = Object.values(map);
    const maxSales = Math.max(...all.map(p=>p.sales_count), 0);

    return all
      .map(p => ({
        ...p,
        trend: p.sales_count === maxSales ? 'Best Selling'
          : p.sales_count >= 5 ? 'Trending'
          : p.sales_count <= 1 ? 'Least Selling'
          : 'Normal',
      }))
      .sort((a,b) => b.sales_count - a.sales_count);
  }, [filteredOrders]);

  const filteredProducts = useMemo(() => {
    let rows = productSummary;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(p => [p.name,p.category,p.occasion,p.trend].join(' ').toLowerCase().includes(q));
    }
    if (trendFilter !== 'all') rows = rows.filter(p => p.trend === trendFilter);
    return rows;
  }, [productSummary, search, trendFilter]);

  useEffect(() => { if (filteredProducts.length) setPageData('products', filteredProducts); }, [filteredProducts]);

  const kpis = useMemo(() => ({
    count:      filteredProducts.length,
    totalSold:  filteredProducts.reduce((s,p)=>s+p.sales_count,0),
    bestSeller: filteredProducts.find(p=>!isAddon(p.name))?.name || '—',
    lowCount:   filteredProducts.filter(p=>p.trend==='Least Selling').length,
  }), [filteredProducts]);

  const top8 = filteredProducts.slice(0, 8);

  const byCategory = useMemo(() => {
    const m = {};
    filteredProducts.forEach(p => { m[p.category]=(m[p.category]||0)+p.sales_count; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));
  }, [filteredProducts]);

  const byTrend = useMemo(() => {
    const m = {};
    filteredProducts.forEach(p => { m[p.trend]=(m[p.trend]||0)+1; });
    return Object.entries(m).map(([name,value])=>({name,value}));
  }, [filteredProducts]);

  if (isLoading) return <LoadingState message="Loading product data..." />;

  return (
    <div className="w-full min-w-0 space-y-4 pb-10">

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-600 to-pink-600 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-16 h-32 w-32 rounded-full bg-pink-400/20 blur-xl" />

        <div className="relative mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
              <Flower className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Product Intelligence</h1>
              <p className="text-xs text-purple-200">Live summary from orders · {filteredProducts.length} products</p>
            </div>
          </div>
          <button onClick={() => orders.refetch()}
            className="flex items-center gap-1.5 rounded-2xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/25">
            <RefreshCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <HeroStat title="Products"   value={kpis.count}      icon={Package}       bg="bg-white/15" />
          <HeroStat title="Units Sold" value={kpis.totalSold}  icon={TrendingUp}    bg="bg-white/15" />
          <HeroStat title="Best Seller"value={kpis.bestSeller} icon={Star}          bg="bg-amber-500/25" sub="Top product" />
          <HeroStat title="Low Sellers"value={kpis.lowCount}   icon={AlertTriangle} bg="bg-red-500/25" sub="Need attention" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DateFilter label="Order Date" color="rose"
          value={orderDateFilter} onChange={setOrderDateFilter}
          from={orderFromDate} to={orderToDate} onFrom={setOrderFromDate} onTo={setOrderToDate} />
        <DateFilter label="Delivery Date" color="blue"
          value={deliveryDateFilter} onChange={setDeliveryDateFilter}
          from={deliveryFromDate} to={deliveryToDate} onFrom={setDeliveryFromDate} onTo={setDeliveryToDate} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="sm:col-span-2 rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="font-semibold text-slate-900">Top Products</p>
            <p className="text-xs text-slate-400">Best sellers by units · top 8</p>
          </div>
          <div className="px-4 pb-5 pt-2">
            {top8.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No products in range</p>
            ) : (
              <div className="space-y-3">
                {top8.map((p, i) => {
                  const pct = Math.round((p.sales_count / (top8[0]?.sales_count || 1)) * 100);
                  return (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-300">{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                          <div className="ml-2 flex shrink-0 items-center gap-1.5">
                            <TrendBadge trend={p.trend} />
                            <span className="text-xs font-bold text-slate-500">{p.sales_count}</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width:`${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="font-semibold text-slate-900">By Category</p>
            <p className="text-xs text-slate-400">Units sold per category</p>
          </div>
          <div className="px-2 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="50%" innerRadius={48} outerRadius={75}
                  dataKey="value" nameKey="name" paddingAngle={3} stroke="none">
                  {byCategory.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="font-semibold text-slate-900">Trend Breakdown</p>
          <p className="text-xs text-slate-400">How many products in each trend tier</p>
        </div>
        <div className="px-4 pb-5 pt-2">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={byTrend} margin={{ top:5, right:10, left:-20, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }} stroke="#e2e8f0" />
              <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} stroke="#e2e8f0" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Products" radius={[6,6,0,0]}>
                {byTrend.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">Product Table</p>
            <p className="text-xs text-slate-400">{filteredProducts.length} products · search, filter &amp; manage columns</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="h-9 rounded-2xl border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 w-44" />
            </div>

            <div className="relative">
              <select value={trendFilter} onChange={e => setTrendFilter(e.target.value)}
                className="h-9 appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-7 text-xs font-medium text-slate-700 shadow-sm outline-none focus:border-violet-300 cursor-pointer">
                <option value="all">All Trends</option>
                <option value="Best Selling">Best Selling</option>
                <option value="Trending">Trending</option>
                <option value="Normal">Normal</option>
                <option value="Least Selling">Least Selling</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            </div>

            <button onClick={applyFullView}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${activeViewId==='default' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              Full
            </button>

            {savedViews.map(v => (
              <div key={v.id} className="flex items-center gap-1">
                <button onClick={() => applyView(v)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${activeViewId===v.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {v.view_name}
                </button>
                <button onClick={() => deleteView(v.id)} className="rounded-full bg-red-50 px-1.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-100">×</button>
              </div>
            ))}

            {activeViewId === 'custom' && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-600">Unsaved</span>
            )}

            <button onClick={() => setViewModalOpen(true)}
              className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition">
              <Save className="h-3 w-3" /> Save view
            </button>

            <div className="relative">
              {columnMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setColumnMenuOpen(false)} />}
              <button onClick={() => setColumnMenuOpen(v=>!v)}
                className="relative z-50 flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
                <Eye className="h-3.5 w-3.5" /> Columns
              </button>
              {columnMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-60 rounded-3xl border border-slate-100 bg-white p-3 shadow-2xl">
                  <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Show / Hide / Drag</p>
                  <div className="space-y-0.5 max-h-64 overflow-y-auto">
                    {popupColumns.map(col => {
                      const visible = visibleColumns.includes(col.key);
                      return (
                        <div key={col.key}
                          draggable={visible}
                          onDragStart={() => setDragColumnKey(col.key)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => moveColumn(col.key)}
                          onDragEnd={() => setDragColumnKey(null)}
                          className={`flex items-center justify-between rounded-2xl px-3 py-2 text-xs transition ${visible ? 'cursor-grab hover:bg-slate-50' : 'cursor-default opacity-50 hover:bg-slate-50'} ${dragColumnKey===col.key ? 'bg-violet-50' : ''}`}>
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                            <span className="font-medium text-slate-700">{col.label}</span>
                          </div>
                          <button onClick={() => toggleColumn(col.key)} className="rounded-lg p-1 hover:bg-slate-100">
                            {visible ? <Eye className="h-3.5 w-3.5 text-emerald-500" /> : <EyeOff className="h-3.5 w-3.5 text-slate-300" />}
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

        <DataTable columns={displayedColumns} data={filteredProducts} pageSize={12} />
      </div>

      {viewModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Save View</h3>
            <p className="mt-0.5 text-xs text-slate-400">Choose columns then give this view a name.</p>
            <input type="text" value={newViewName} onChange={e => setNewViewName(e.target.value)}
              placeholder="e.g. Sales Summary..."
              className="mt-4 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400" />
            <div className="mt-3 max-h-48 overflow-y-auto rounded-2xl border border-slate-100 p-3">
              <div className="grid grid-cols-2 gap-1">
                {columns.map(col => (
                  <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs hover:bg-slate-50">
                    <input type="checkbox" checked={visibleColumns.includes(col.key)} onChange={() => toggleColumn(col.key)}
                      className="h-3.5 w-3.5 rounded accent-violet-500" />
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
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function guessCategory(name) {
  const n = String(name).toLowerCase();
  if (n.includes('rose'))      return 'Roses';
  if (n.includes('tulip'))     return 'Tulips';
  if (n.includes('orchid'))    return 'Orchids';
  if (n.includes('hydrangea')) return 'Hydrangea';
  if (n.includes('peony'))     return 'Peonies';
  if (n.includes('balloon'))   return 'Add-ons';
  if (n.includes('chocolate') || n.includes('card') || n.includes('teddy')) return 'Gifts';
  return 'Bouquets';
}

function guessOccasion(name) {
  const n = String(name).toLowerCase();
  if (n.includes('birthday'))          return 'Birthday';
  if (n.includes('love') || n.includes('valentine')) return 'Love';
  if (n.includes('get well'))          return 'Get Well';
  if (n.includes('newborn') || n.includes('baby'))   return 'New Baby';
  if (n.includes('premium'))           return 'Premium';
  return 'General';
}