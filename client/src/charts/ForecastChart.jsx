import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatClock, formatDateTime, formatNumber } from '../utils/format.js';

export const FORECAST_METRICS = {
  us_aqi: { label: 'US AQI', unit: 'index', color: '#ca8a04', precision: 0 },
  pm2_5: { label: 'PM2.5', unit: 'µg/m³', color: '#0f766e', precision: 1 },
  pm10: { label: 'PM10', unit: 'µg/m³', color: '#2563eb', precision: 1 },
  nitrogen_dioxide: { label: 'NO₂', unit: 'µg/m³', color: '#7c3aed', precision: 1 },
  ozone: { label: 'O₃', unit: 'µg/m³', color: '#ea580c', precision: 1 },
  sulphur_dioxide: { label: 'SO₂', unit: 'µg/m³', color: '#db2777', precision: 1 },
  carbon_monoxide: { label: 'CO', unit: 'µg/m³', color: '#64748b', precision: 0 },
};

function ForecastTooltip({ active, payload, metric, timezone }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const meta = FORECAST_METRICS[metric];

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-time">{formatDateTime(point.time, timezone)}</p>
      <p className="chart-tooltip-value">
        {meta.label}: <strong>{formatNumber(point.value, meta.precision)}</strong> {meta.unit}
      </p>
      <p className="chart-tooltip-note">
        Modelled forecast · US AQI {Number.isFinite(point.usAqi) ? Math.round(point.usAqi) : '—'} · PM2.5{' '}
        {formatNumber(point.pm25, 1)} µg/m³
      </p>
    </div>
  );
}

export default function ForecastChart({ hourly, metric = 'us_aqi', timezone, height = 300 }) {
  const meta = FORECAST_METRICS[metric] || FORECAST_METRICS.pm2_5;
  const data = (hourly || []).map((hour) => ({
    time: hour.time,
    label: formatClock(hour.time, timezone),
    value: hour[metric],
    usAqi: hour.us_aqi,
    pm25: hour.pm2_5,
  }));

  if (!data.length) {
    return <p className="chart-empty">The forecast is unavailable for this location.</p>;
  }

  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <defs>
            <linearGradient id={`forecast-fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity={0.34} />
              <stop offset="100%" stopColor={meta.color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(15,92,84,0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#5a736f', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(15,92,84,0.2)' }}
            minTickGap={28}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#5a736f', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={52}
            unit={meta.unit === 'index' ? '' : ''}
          />
          <Tooltip content={<ForecastTooltip metric={metric} timezone={timezone} />} />
          <ReferenceLine
            x={data[0].label}
            stroke="rgba(15,118,110,0.55)"
            strokeDasharray="4 4"
            label={{ value: 'Now', position: 'insideTopLeft', fill: '#0b5f58', fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={meta.label}
            stroke={meta.color}
            strokeWidth={2.2}
            fill={`url(#forecast-fill-${metric})`}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
