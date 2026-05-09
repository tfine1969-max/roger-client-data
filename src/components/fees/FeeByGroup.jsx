import { fmtNum } from '@/lib/valuation-utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FeeByGroup({ title, data, labelKey, valueKey = 'totalFeeZar' }) {
  const sorted = [...data].sort((a, b) => b[valueKey] - a[valueKey]).slice(0, 12);

  return (
    <div className="bg-white border rounded-lg p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={sorted} layout="vertical" barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,18%,92%)" horizontal={false} />
          <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}K`} />
          <YAxis type="category" dataKey={labelKey} fontSize={10} tickLine={false} axisLine={false} width={130} tick={{ fill: 'hsl(215,16%,40%)' }} />
          <Tooltip
            formatter={v => [`ZAR ${fmtNum(v)}`, 'Monthly Fee']}
            contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid hsl(214,18%,88%)' }}
          />
          <Bar dataKey={valueKey} fill="hsl(220,45%,18%)" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}