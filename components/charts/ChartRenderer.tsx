
import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, 
  ScatterChart, Scatter, CartesianGrid, XAxis, YAxis, Tooltip, Legend, 
  ResponsiveContainer, Cell
} from 'recharts';
import { ChartType, Widget, AggregationType } from '../../types';

interface ChartRendererProps {
  widget: Widget;
  onDataPointClick?: (data: any) => void;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg min-w-[160px] z-50 relative backdrop-blur-sm bg-opacity-95">
        <p className="text-xs font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label || 'Details'}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="flex items-center text-slate-500">
                <span className="w-2 h-2 rounded-full mr-2 shadow-sm" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono font-semibold text-slate-700 ml-3">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-slate-50 text-[10px] text-center text-brand-500 font-medium flex items-center justify-center">
           <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
           Click to drill down
        </div>
      </div>
    );
  }
  return null;
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ widget, onDataPointClick }) => {
  const { type, data, config } = widget;
  const dataKeys = config.dataKeys || Object.keys(data[0] || {}).filter(k => k !== config.xAxis);

  // Helper to safely extract data and call handler
  const handleInteraction = (props: any) => {
      if (!onDataPointClick) return;
      // Recharts payloads vary by chart type, attempt normalization
      const payload = props?.payload || props;
      if (payload) onDataPointClick(payload);
  };

  const renderChart = () => {
    // Shared props
    const tooltip = <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />;
    const legend = <Legend wrapperStyle={{ paddingTop: '12px' }} iconType="circle" iconSize={8} fontSize={11} formatter={(value) => <span className="text-slate-600 font-medium ml-1">{value}</span>} />;

    switch (type) {
      case ChartType.BAR:
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey={config.xAxis} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            {tooltip}
            {legend}
            {dataKeys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={config.colors?.[index] || COLORS[index % COLORS.length]} 
                radius={[4, 4, 0, 0]}
                onClick={handleInteraction}
                cursor="pointer"
                activeBar={{ fillOpacity: 0.8, strokeWidth: 1, stroke: '#334155' }}
                animationDuration={800}
              />
            ))}
          </BarChart>
        );
      
      case ChartType.LINE:
        return (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey={config.xAxis} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            {tooltip}
            {legend}
            {dataKeys.map((key, index) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={config.colors?.[index] || COLORS[index % COLORS.length]} 
                strokeWidth={3} 
                dot={{ r: 3, strokeWidth: 0, fill: config.colors?.[index] || COLORS[index % COLORS.length] }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', onClick: (e, p) => handleInteraction(p) }}
                cursor="pointer"
                animationDuration={800}
              />
            ))}
          </LineChart>
        );

      case ChartType.AREA:
        return (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey={config.xAxis} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            {tooltip}
            {legend}
            {dataKeys.map((key, index) => (
              <Area 
                key={key} 
                type="monotone" 
                dataKey={key} 
                fill={config.colors?.[index] || COLORS[index % COLORS.length]} 
                stroke={config.colors?.[index] || COLORS[index % COLORS.length]} 
                fillOpacity={0.15}
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', onClick: (e, p) => handleInteraction(p) }}
                cursor="pointer"
                animationDuration={800}
              />
            ))}
          </AreaChart>
        );

      case ChartType.PIE:
        return (
          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
             <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={dataKeys[0]}
              nameKey={config.xAxis}
              cursor="pointer"
              onClick={handleInteraction}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell 
                    key={`cell-${index}`} 
                    fill={config.colors?.[index % (config.colors?.length || 0)] || COLORS[index % COLORS.length]} 
                    strokeWidth={0}
                    className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            {tooltip}
            {legend}
          </PieChart>
        );

      case ChartType.SCATTER:
        return (
          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" dataKey={config.xAxis} name={config.xAxis} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            <YAxis type="number" dataKey={dataKeys[0]} name={dataKeys[0]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
            {legend}
            <Scatter 
                name={dataKeys[0]} 
                data={data} 
                fill={config.colors?.[0] || COLORS[0]} 
                onClick={handleInteraction}
                cursor="pointer"
                animationDuration={800}
            />
          </ScatterChart>
        );

      case ChartType.HEATMAP:
        return (
            <div className="w-full h-full overflow-auto">
                <div className="grid grid-cols-10 gap-1">
                    {data.map((d, i) => {
                        const val = Number(Object.values(d)[0] || 0);
                        const intensity = Math.min(100, Math.max(0, val)) / 100; // Normalize 0-1
                        return (
                            <div 
                                key={i} 
                                className="w-full pt-[100%] relative rounded-sm cursor-pointer hover:ring-2 hover:ring-brand-300 transition-all"
                                style={{ backgroundColor: `rgba(14, 165, 233, ${intensity})` }} // brand-500 with opacity
                                title={`Value: ${val}`}
                                onClick={() => handleInteraction(d)}
                            />
                        )
                    })}
                </div>
            </div>
        );

      case ChartType.INDICATOR:
        const value = data.length > 0 ? Object.values(data[0])[0] : 0;
        const label = config.dataKeys?.[0] || 'Value';
        const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
        
        return (
            <div 
                className="w-full h-full flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-slate-50 transition-colors rounded-lg"
                onClick={() => handleInteraction(data[0])}
            >
                <span className="text-4xl md:text-5xl font-bold text-brand-600 tracking-tight">{displayValue}</span>
                <span className="text-sm text-slate-500 mt-2 font-medium uppercase tracking-wider">{label}</span>
                {config.aggregation && config.aggregation !== AggregationType.NONE && (
                   <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full mt-2">{config.aggregation}</span>
                )}
            </div>
        );

      default:
        return <div className="flex items-center justify-center h-full text-slate-400">Unsupported Chart Type</div>;
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart()}
    </ResponsiveContainer>
  );
};
