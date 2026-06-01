import React, { useState, useMemo } from 'react';
import { useSheetData } from '@/lib/sheetsEngine';
import KPICard from '@/components/dashboard/KPICard';
import DataTable from '@/components/dashboard/DataTable';
import FilterBar from '@/components/dashboard/FilterBar';
import ChartCard from '@/components/dashboard/ChartCard';
import PageHeader from '@/components/dashboard/PageHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import { DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react';

const columns = [
  { key: 'month', label: 'Month' },
  { key: 'category', label: 'Category' },
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount (AED)', format: 'currency' },
  { key: 'budget', label: 'Budget (AED)', format: 'currency' },
];

export default function Finance() {
  const [filters, setFilters] = useState({});
  const { data, allData, isLoading, refetch } = useSheetData('finance', { filters });

  const filterConfigs = useMemo(() => [
    { key: 'type', label: 'Type', type: 'select', options: ['income', 'expense'] },
    { key: 'category', label: 'Category', type: 'select', options: [...new Set(allData.map(d => d.category).filter(Boolean))] },
  ], [allData]);

  const kpis = useMemo(() => {
    const income = data.filter(d => d.type === 'income').reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const expenses = data.filter(d => d.type === 'expense').reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const totalBudget = data.filter(d => d.type === 'income').reduce((s, d) => s + (Number(d.budget) || 0), 0);
    return { income, expenses, netProfit: income - expenses, margin: income ? ((income - expenses) / income * 100) : 0, totalBudget };
  }, [data]);

  const monthlyTrend = useMemo(() => {
    const months = {};
    data.forEach(d => {
      const m = d.month?.slice(0, 7);
      if (!m) return;
      months[m] = months[m] || { month: m, income: 0, expenses: 0 };
      if (d.type === 'income') months[m].income += Number(d.amount) || 0;
      else months[m].expenses += Number(d.amount) || 0;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({ ...m, income: Math.round(m.income), expenses: Math.round(m.expenses) }));
  }, [data]);

  const expenseBreakdown = useMemo(() => {
    const cats = {};
    data.filter(d => d.type === 'expense').forEach(d => {
      cats[d.category] = (cats[d.category] || 0) + (Number(d.amount) || 0);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [data]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" subtitle="Revenue, expenses & profitability" onRefresh={refetch} isLoading={isLoading} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Total Income (AED)" value={`AED ${Math.round(kpis.income).toLocaleString()}`} icon={TrendingUp} color="teal" change={15.3} />
        <KPICard title="Total Expenses" value={`AED ${Math.round(kpis.expenses).toLocaleString()}`} icon={TrendingDown} color="red" change={-4.2} />
        <KPICard title="Net Profit" value={`AED ${Math.round(kpis.netProfit).toLocaleString()}`} icon={DollarSign} color="rose" change={22.1} />
        <KPICard title="Profit Margin" value={`${kpis.margin.toFixed(1)}%`} icon={PieChart} color="amber" change={2.8} />
      </div>

      <FilterBar filterConfigs={filterConfigs} filters={filters} onFilterChange={setFilters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Income vs Expenses (AED)" type="bar" data={monthlyTrend} dataKeys={[{ key: 'income', label: 'Income' }, { key: 'expenses', label: 'Expenses' }]} xKey="month" />
        <ChartCard title="Expense Breakdown" type="pie" data={expenseBreakdown} dataKeys={[{ key: 'value', label: 'AED' }]} xKey="name" />
      </div>

      <DataTable columns={columns} data={data} pageSize={15} />
    </div>
  );
}