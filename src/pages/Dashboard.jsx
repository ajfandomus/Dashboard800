import React, { useMemo } from 'react';
import { useSheetData } from '@/lib/sheetsEngine';
import KPICard from '@/components/dashboard/KPICard';
import ChartCard from '@/components/dashboard/ChartCard';
import SummaryBlock from '@/components/dashboard/SummaryBlock';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import DataTable from '@/components/dashboard/DataTable';
import {
  ShoppingBag,
  Truck,
  Users,
  Package,
  Printer,
  AlertTriangle,
} from 'lucide-react';

const recentCols = [
  { key: 'order_id', label: 'Order' },
  { key: 'delivery_date', label: 'Delivery Date' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'product', label: 'Product' },
  { key: 'quantity', label: 'Qty', format: 'number' },
  { key: 'florist', label: 'Florist' },
  { key: 'delivery_status', label: 'Delivery Status' },
  { key: 'payment', label: 'Channel' },
];

function normalizeStatus(order) {
  return order.delivery_status || order.status || 'Pending';
}

export default function Dashboard() {
  const orders = useSheetData('orders');
  const products = useSheetData('products');

  const isLoading = orders.isLoading;

  const stats = useMemo(() => {
    const rows = orders.allData || [];

    const totalOrders = rows.length;

    const totalQty = rows.reduce(
      (sum, order) => sum + (Number(order.quantity) || 1),
      0
    );

    const delivered = rows.filter(order =>
      normalizeStatus(order).toLowerCase().includes('delivered')
    ).length;

    const printed = rows.filter(order =>
      order.printed === true ||
      String(order.print_status || '').toUpperCase().includes('PRINTED')
    ).length;

    const noDriver = rows.filter(order =>
      normalizeStatus(order).toLowerCase().includes('driver')
    ).length;

    const pending = rows.filter(order => {
      const status = normalizeStatus(order).toLowerCase();
      return !status || status === 'pending' || status.includes('no driver');
    }).length;

    const shopify = rows.filter(order => order.payment === 'Shopify').length;
    const manual = rows.filter(order => order.payment === 'Manual').length;

    return {
      totalOrders,
      totalQty,
      delivered,
      printed,
      pending,
      noDriver,
      shopify,
      manual,
    };
  }, [orders.allData]);

  const ordersByStatus = useMemo(() => {
    const map = {};

    orders.allData.forEach(order => {
      const status = normalizeStatus(order);
      map[status] = (map[status] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [orders.allData]);

  const ordersByChannel = useMemo(() => {
    const map = {};

    orders.allData.forEach(order => {
      const channel = order.payment || 'Other';
      map[channel] = (map[channel] || 0) + 1;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders.allData]);

  const ordersByFlorist = useMemo(() => {
    const map = {};

    orders.allData.forEach(order => {
      const florist = order.florist && order.florist !== '—'
        ? order.florist
        : 'Unassigned';

      map[florist] = (map[florist] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [orders.allData]);

  const topProducts = useMemo(() => {
    const map = {};

    orders.allData.forEach(order => {
      const product = order.product || 'N/A';
      map[product] = (map[product] || 0) + (Number(order.quantity) || 1);
    });

    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([label, value]) => ({
        label,
        value,
        dot: 'bg-pink-500',
      }));
  }, [orders.allData]);

  const recentOrders = useMemo(() => {
    return [...orders.allData].slice(0, 10);
  }, [orders.allData]);

  if (isLoading) {
    return <LoadingState message="Loading live dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-pink-100 bg-gradient-to-br from-white via-pink-50/70 to-rose-50 p-6 shadow-sm">
        <PageHeader
          title="Operations Dashboard"
          subtitle="Live overview from Google Sheets"
          onRefresh={() => {
            orders.refetch();
            products.refetch();
          }}
          isLoading={isLoading}
        />

        <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-6">
          <KPICard title="Total Orders" value={stats.totalOrders} icon={ShoppingBag} color="pink" />
          <KPICard title="Total Qty" value={stats.totalQty} icon={Package} color="purple" />
          <KPICard title="Delivered" value={stats.delivered} icon={Truck} color="green" />
          <KPICard title="Printed" value={stats.printed} icon={Printer} color="amber" />
          <KPICard title="Pending" value={stats.pending} icon={AlertTriangle} color="red" />
          <KPICard title="Shopify" value={stats.shopify} icon={Users} color="teal" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Orders by Delivery Status"
          type="pie"
          data={ordersByStatus}
          dataKeys={[{ key: 'value', label: 'Orders' }]}
          xKey="name"
          height={260}
        />

        <ChartCard
          title="Orders by Channel"
          type="bar"
          data={ordersByChannel}
          dataKeys={[{ key: 'value', label: 'Orders' }]}
          xKey="name"
          height={260}
        />

        <ChartCard
          title="Orders by Florist"
          type="bar"
          data={ordersByFlorist}
          dataKeys={[{ key: 'value', label: 'Orders' }]}
          xKey="name"
          height={260}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SummaryBlock
          title="Top Products"
          items={topProducts}
        />

        <SummaryBlock
          title="Quick Operations Summary"
          items={[
            { label: 'Shopify Orders', value: stats.shopify, dot: 'bg-green-500' },
            { label: 'Manual Orders', value: stats.manual, dot: 'bg-amber-500' },
            { label: 'No Driver', value: stats.noDriver, dot: 'bg-red-500' },
            { label: 'Unique Products', value: new Set(orders.allData.map(o => o.product)).size, dot: 'bg-pink-500' },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Orders
          </h2>
          <p className="text-sm text-gray-500">
            Latest live orders from your connected sheets
          </p>
        </div>

        <DataTable
          columns={recentCols}
          data={recentOrders}
          pageSize={10}
        />
      </div>
    </div>
  );
}