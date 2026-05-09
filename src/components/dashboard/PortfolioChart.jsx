import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PortfolioChart({ valueUpdates, investments }) {
  const chartData = useMemo(() => {
    const monthMap = {};

    // Add initial values
    investments.forEach(inv => {
      const created = inv.created_date ? inv.created_date.substring(0, 7) : '2025-01';
      if (!monthMap[created]) monthMap[created] = 0;
      monthMap[created] += inv.initial_value || 0;
    });

    // Aggregate updates by month
    valueUpdates.forEach(update => {
      if (!monthMap[update.month]) monthMap[update.month] = 0;
      monthMap[update.month] += update.value || 0;
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        month,
        value: Math.round(value),
      }));
  }, [valueUpdates, investments]);

  if (chartData.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-lg">Portfolio Value Over Time</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-10">No value updates recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Portfolio Value Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value) => [`$${value.toLocaleString()}`, 'Total Value']}
              contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214, 20%, 90%)', fontSize: '13px' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(160, 84%, 39%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}