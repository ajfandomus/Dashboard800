import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = [
  '#c2185b',  // deep rose
  '#f06292',  // pink
  '#f59e0b',  // amber
  '#0d9488',  // teal
  '#8b5cf6',  // purple
  '#3b82f6',  // blue
  '#ef4444',  // red
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-sm">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-semibold" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function ChartCard({ title, type = 'bar', data, dataKeys, xKey, height = 300 }) {
  const axisProps = {
    stroke: 'hsl(340 15% 82%)',
    tick: { fill: 'hsl(340 10% 55%)', fontSize: 11 },
  };
  const gridProps = { strokeDasharray: '3 3', stroke: 'hsl(340 15% 92%)' };
  const commonProps = { data, margin: { top: 5, right: 10, left: 5, bottom: 5 } };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {dataKeys.map((dk, i) => (
              <Line key={dk.key} type="monotone" dataKey={dk.key} name={dk.label || dk.key}
                stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            {dataKeys.map((dk, i) => (
              <Area key={dk.key} type="monotone" dataKey={dk.key} name={dk.label || dk.key}
                stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.12} strokeWidth={2.5} />
            ))}
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
              dataKey={dataKeys[0]?.key || 'value'} nameKey={xKey} paddingAngle={3} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} />
          </PieChart>
        );
      default: // bar
        return (
          <BarChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {dataKeys.map((dk, i) => (
              <Bar key={dk.key} dataKey={dk.key} name={dk.label || dk.key}
                fill={COLORS[i % COLORS.length]} radius={[5, 5, 0, 0]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}