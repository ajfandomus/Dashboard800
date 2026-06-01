import React, { useMemo } from 'react';
import { useSheetData } from '@/lib/sheetsEngine';
import KPICard from '@/components/dashboard/KPICard';
import ChartCard from '@/components/dashboard/ChartCard';
import SummaryBlock from '@/components/dashboard/SummaryBlock';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import { DollarSign, ShoppingBag, Users, Truck, Package, Heart } from 'lucide-react';

export default function Summary() {
  const orders = useSheetData('orders');
  const products = useSheetData('products');
  const customers = useSheetData('customers');
  const finance = useSheetData('finance');
  const delivery = useSheetData('delivery');
  const invoices = useSheetData('invoices');

  const isLoading = orders.isLoading || finance.isLoading;

  const totals = useMemo(() => {
    const orderRev = orders.data.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const finIncome = finance.data.filter(f => f.type === 'income').reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const finExpense = finance.data.filter(f => f.type === 'expense').reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const delCost = delivery.data.reduce((s, d) => s + (Number(d.cost) || 0), 0);
    const invTotal = invoices.data.reduce((s, i) => s + (Number(i.total) || 0), 0);
    return { orderRev, finIncome, finExpense, delCost, invTotal, profit: finIncome - finExpense };
  }, [orders.data, finance.data, delivery.data, invoices.data]);

  const timeline = useMemo(() => {
    const months = {};
    orders.data.forEach(o => {
      const m = o.date?.slice(0, 7);
      if (m) { months[m] = months[m] || { month: m, orders: 0, revenue: 0 }; months[m].orders++; months[m].revenue += Number(o.total) || 0; }
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({ ...m, revenue: Math.round(m.revenue) }));
  }, [orders.data]);

  const topOccasions = useMemo(() => {
    const occ = {};
    orders.data.forEach(o => { occ[o.occasion] = (occ[o.occasion] || 0) + (Number(o.total) || 0); });
    return Object.entries(occ).sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([label, val]) => ({ label, value: `AED ${Math.round(val).toLocaleString()}`, dot: 'bg-primary' }));
  }, [orders.data]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Business Summary" subtitle="Full cross-sheet overview of your flower business" />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard title="Order Revenue" value={`AED ${Math.round(totals.orderRev).toLocaleString()}`} icon={ShoppingBag} color="rose" />
        <KPICard title="Total Income" value={`AED ${Math.round(totals.finIncome).toLocaleString()}`} icon={DollarSign} color="teal" />
        <KPICard title="Total Expenses" value={`AED ${Math.round(totals.finExpense).toLocaleString()}`} icon={DollarSign} color="red" />
        <KPICard title="Net Profit" value={`AED ${Math.round(totals.profit).toLocaleString()}`} icon={Heart} color="pink" />
        <KPICard title="Total Customers" value={customers.data.length} icon={Users} color="purple" />
        <KPICard title="Delivery Cost" value={`AED ${Math.round(totals.delCost).toLocaleString()}`} icon={Truck} color="amber" />
      </div>

      <ChartCard title="Monthly Orders & Revenue Trend" type="line" data={timeline}
        dataKeys={[{ key: 'orders', label: 'Orders' }, { key: 'revenue', label: 'Revenue (AED)' }]}
        xKey="month" height={320} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryBlock title="💐 Top Occasions by Revenue" items={topOccasions} />
        <SummaryBlock title="Order Status" items={[
          { label: 'Delivered', value: orders.data.filter(o => o.status === 'Delivered').length, dot: 'bg-teal-500' },
          { label: 'Processing', value: orders.data.filter(o => o.status === 'Processing').length, dot: 'bg-primary' },
          { label: 'Out for Delivery', value: orders.data.filter(o => o.status === 'Out for Delivery').length, dot: 'bg-amber-500' },
          { label: 'Cancelled', value: orders.data.filter(o => o.status === 'Cancelled').length, dot: 'bg-destructive' },
          { label: 'Refunded', value: orders.data.filter(o => o.status === 'Refunded').length, dot: 'bg-slate-400' },
        ]} />
        <SummaryBlock title="Stock Health" items={[
          { label: 'In Stock', value: products.data.filter(p => p.status === 'In Stock').length, dot: 'bg-teal-500' },
          { label: 'Low Stock', value: products.data.filter(p => p.status === 'Low Stock').length, dot: 'bg-amber-500' },
          { label: 'Out of Stock', value: products.data.filter(p => p.status === 'Out of Stock').length, dot: 'bg-destructive' },
          { label: 'Pending Invoices', value: invoices.data.filter(i => i.status === 'Pending').length, dot: 'bg-primary' },
          { label: 'Overdue Invoices', value: invoices.data.filter(i => i.status === 'Overdue').length, dot: 'bg-destructive' },
        ]} />
      </div>
    </div>
  );
}