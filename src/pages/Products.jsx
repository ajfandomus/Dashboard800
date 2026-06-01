import React, { useState, useMemo, useEffect } from 'react';
import { useSheetData, computeAggregations } from '@/lib/sheetsEngine';
import KPICard from '@/components/dashboard/KPICard';
import DataTable from '@/components/dashboard/DataTable';
import FilterBar from '@/components/dashboard/FilterBar';
import ChartCard from '@/components/dashboard/ChartCard';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import { useDashboardStore } from '@/lib/dashboardStore';
import {
  Package,
  TrendingUp,
  Star,
  AlertTriangle,
  CalendarDays,
  Eye,
  EyeOff,
  GripVertical,
  Search,
} from 'lucide-react';

const columns = [
  { key: 'name', label: 'Product Name' },
  { key: 'category', label: 'Category' },
  { key: 'occasion', label: 'Occasion' },
  { key: 'sales_count', label: 'Units Sold', format: 'number' },
  { key: 'order_count', label: 'Orders', format: 'number' },
  { key: 'trend', label: 'Trend', format: 'status' },
  { key: 'last_order_date', label: 'Last Sold' },
];

const dateButtons = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Last 7 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

function parseDate(value) {
  if (!value) return null;

  const text = String(value).trim();

  const parts = text.split(/[\/\-]/);

  if (parts.length === 3) {
    const [day, month, year] = parts;

    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text);

  return isNaN(parsed.getTime()) ? null : parsed;
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

function isAddon(name) {
  const blockedWords = [
    'card',
    'balloon',
    'message',
    'foil',
    'cake topper',
    'chocolate',
    'teddy',
    'addon',
    'gift card',
  ];

  const value = String(name || '').toLowerCase();

  return blockedWords.some(word => value.includes(word));
}

export default function Products() {
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');

  const [orderDateFilter, setOrderDateFilter] = useState('today');
  const [orderFromDate, setOrderFromDate] = useState('');
  const [orderToDate, setOrderToDate] = useState('');

  const [deliveryDateFilter, setDeliveryDateFilter] = useState('today');
  const [deliveryFromDate, setDeliveryFromDate] = useState('');
  const [deliveryToDate, setDeliveryToDate] = useState('');

  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [dragColumnKey, setDragColumnKey] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('products_visible_columns');

    return saved
      ? JSON.parse(saved)
      : columns.map(col => col.key);
  });

  const [savedViews, setSavedViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState('default');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const products = useSheetData('products', { filters });
  const orders = useSheetData('orders');

  const isLoading = products.isLoading || orders.isLoading;
const setPageData = useDashboardStore(s => s.setPageData);
  useEffect(() => {
    const storedViews = localStorage.getItem('products_column_views');

    if (storedViews) {
      setSavedViews(JSON.parse(storedViews));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'products_column_views',
      JSON.stringify(savedViews)
    );
  }, [savedViews]);

  useEffect(() => {
    localStorage.setItem(
      'products_visible_columns',
      JSON.stringify(visibleColumns)
    );
  }, [visibleColumns]);

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

      const fromIndex = current.indexOf(dragColumnKey);
      const toIndex = current.indexOf(targetKey);

      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, dragColumnKey);

      return current;
    });
  };

  const applyFullView = () => {
    setActiveViewId('default');
    setVisibleColumns(columns.map(col => col.key));
  };

  const applyView = view => {
    setActiveViewId(view.id);
    setVisibleColumns(view.columns);
  };

  const saveCurrentView = () => {
    if (!newViewName.trim()) return;

    const newView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      columns: visibleColumns,
    };

    setSavedViews(prev => [...prev, newView]);

    setActiveViewId(newView.id);

    setViewModalOpen(false);

    setNewViewName('');
  };

  const deleteView = viewId => {
    setSavedViews(prev =>
      prev.filter(view => view.id !== viewId)
    );

    if (activeViewId === viewId) {
      applyFullView();
    }
  };

  const filteredOrders = useMemo(() => {
    const orderRange = getDateRange(
      orderDateFilter,
      orderFromDate,
      orderToDate
    );

    const deliveryRange = getDateRange(
      deliveryDateFilter,
      deliveryFromDate,
      deliveryToDate
    );

    return orders.allData.filter(order => {
      const orderDate = parseDate(order.order_date);
      const deliveryDate = parseDate(order.delivery_date);

      if (orderDateFilter !== 'all') {
        if (!orderDate) return false;

        if (orderRange.from && orderDate < orderRange.from)
          return false;

        if (orderRange.to && orderDate > orderRange.to)
          return false;
      }

      if (deliveryDateFilter !== 'all') {
        if (!deliveryDate) return false;

        if (
          deliveryRange.from &&
          deliveryDate < deliveryRange.from
        )
          return false;

        if (
          deliveryRange.to &&
          deliveryDate > deliveryRange.to
        )
          return false;
      }

      return true;
    });
  }, [
    orders.allData,
    orderDateFilter,
    orderFromDate,
    orderToDate,
    deliveryDateFilter,
    deliveryFromDate,
    deliveryToDate,
  ]);

  const productSummary = useMemo(() => {
    const map = {};

    filteredOrders.forEach(order => {
      const name = String(order.product || '').trim();

      if (!name || name === 'N/A') return;

      if (!map[name]) {
        map[name] = {
          name,
          category: order.category || 'Flowers',
          occasion: order.occasion || '—',
          sales_count: 0,
          order_count: 0,
          last_order_date:
            order.order_date || order.delivery_date,
        };
      }

      map[name].sales_count += Number(order.quantity) || 1;

      map[name].order_count += 1;
    });

    return Object.values(map)
      .map(product => ({
        ...product,
        trend:
          product.sales_count >= 10
            ? 'Best Selling'
            : product.sales_count >= 5
            ? 'Trending'
            : product.sales_count <= 1
            ? 'Least Selling'
            : 'Normal',
      }))
      .sort((a, b) => b.sales_count - a.sales_count);
  }, [filteredOrders]);

  const searchedProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return productSummary;

    return productSummary.filter(product =>
      [
        product.name,
        product.category,
        product.occasion,
        product.trend,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [productSummary, search]);

  const filterConfigs = useMemo(() => [
    {
      key: 'trend',
      label: 'Trend',
      type: 'select',
      options: [
        'Best Selling',
        'Trending',
        'Least Selling',
        'Normal',
      ],
    },
  ], []);

  const filteredProducts = useMemo(() => {
    let rows = [...searchedProducts];

    Object.entries(filters).forEach(([key, value]) => {
      if (!value || value === 'all') return;

      rows = rows.filter(row =>
        String(row[key] || '')
          .toLowerCase()
          .includes(String(value).toLowerCase())
      );
    });

    return rows;
  }, [searchedProducts, filters]);
useEffect(() => {
  if (filteredProducts.length) {
    setPageData('products', filteredProducts);
  }
}, [filteredProducts]);
  const kpis = useMemo(
    () =>
      computeAggregations(filteredProducts, [
        {
          name: 'count',
          field: 'name',
          operation: 'count',
        },
        {
          name: 'totalSold',
          field: 'sales_count',
          operation: 'sum',
        },
      ]),
    [filteredProducts]
  );

  const bestSelling = useMemo(() => {
    const product = filteredProducts.find(
      p => !isAddon(p.name)
    );

    return product?.name || '—';
  }, [filteredProducts]);

  const leastSellingCount = filteredProducts.filter(
    p => p.trend === 'Least Selling'
  ).length;

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-gradient-to-br from-white via-pink-50/50 to-white p-6 shadow-sm">
        <PageHeader
          title="Product Intelligence"
          subtitle="Live product summary from orders"
          onRefresh={() => {
            products.refetch();
            orders.refetch();
          }}
          isLoading={isLoading}
        />

        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KPICard
            title="Products"
            value={kpis.count}
            icon={Package}
            color="rose"
          />

          <KPICard
            title="Units Sold"
            value={kpis.totalSold}
            icon={TrendingUp}
            color="purple"
          />

          <KPICard
            title="Best Seller"
            value={bestSelling}
            icon={Star}
            color="amber"
          />

          <KPICard
            title="Low Sellers"
            value={leastSellingCount}
            icon={AlertTriangle}
            color="red"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">
            Order Date Filter
          </h3>

          <div className="flex flex-wrap gap-2">
            {dateButtons.map(item => (
              <button
                key={item.key}
                onClick={() =>
                  setOrderDateFilter(item.key)
                }
                className={`rounded-full px-4 py-2 text-sm ${
                  orderDateFilter === item.key
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">
            Delivery Date Filter
          </h3>

          <div className="flex flex-wrap gap-2">
            {dateButtons.map(item => (
              <button
                key={item.key}
                onClick={() =>
                  setDeliveryDateFilter(item.key)
                }
                className={`rounded-full px-4 py-2 text-sm ${
                  deliveryDateFilter === item.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <FilterBar
        filterConfigs={filterConfigs}
        filters={filters}
        onFilterChange={setFilters}
      />

      <div className="rounded-3xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="font-semibold">
              Product Summary
            </h3>

            <p className="text-sm text-slate-500">
              Same controls as Orders page
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={e =>
                  setSearch(e.target.value)
                }
                placeholder="Search product..."
                className="h-10 rounded-2xl border border-slate-200 pl-10 pr-4 text-sm outline-none"
              />
            </div>

            <button
              type="button"
              onClick={applyFullView}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeViewId === 'default'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Full View
            </button>

            {savedViews.map(view => (
              <div
                key={view.id}
                className="flex items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => applyView(view)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    activeViewId === view.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {view.name}
                </button>

                <button
                  onClick={() =>
                    deleteView(view.id)
                  }
                  className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-500"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              onClick={() =>
                setViewModalOpen(true)
              }
              className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              + Save View
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setColumnMenuOpen(prev => !prev)
                }
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
              >
                <Eye className="h-4 w-4" />
                Columns
              </button>

              {columnMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-72 rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="space-y-1">
                    {popupColumns.map(col => {
                      const isVisible =
                        visibleColumns.includes(
                          col.key
                        );

                      return (
                        <div
                          key={col.key}
                          draggable={isVisible}
                          onDragStart={() =>
                            setDragColumnKey(
                              col.key
                            )
                          }
                          onDragOver={e =>
                            e.preventDefault()
                          }
                          onDrop={() =>
                            moveColumn(col.key)
                          }
                          onDragEnd={() =>
                            setDragColumnKey(null)
                          }
                          className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-slate-300" />

                            <span className="text-sm font-medium">
                              {col.label}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              toggleColumn(
                                col.key
                              )
                            }
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
                </div>
              )}
            </div>
          </div>
        </div>

        <DataTable
          columns={displayedColumns}
          data={filteredProducts}
          pageSize={10}
        />
      </div>
    </div>
  );
}