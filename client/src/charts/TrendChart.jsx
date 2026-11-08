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

const SERIES_META = {
  pm2_5: { label: 'PM2.5', unit: 'µg/m³', color: '#0d9488', precision: 1 },
  pm10: { label: 'PM10', unit: 'µg/m³', color: '#2563eb', precision: 1 },
  us_aqi: { label: 'US AQI', unit: 'index', color: '#ca8a04', precision: 0 },
};

function HistoryTooltip({ active, payload, meta, timezone, weekly }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-time">{formatDateTime(point.time, timezone)}</p>
      <p className="chart-tooltip-value">
        {meta.label}: <strong>{formatNumber(point.value, meta.precision)}</strong> {meta.unit}
      </p>
      <p className="chart-tooltip-note">
        {weekly ? 'Modelled historical estimate (7-day view)' : 'Modelled historical estimate (last 24 hours)'}
      </p>
    </div>
  );
}

export default function TrendChart({ series, metric = 'pm2_5', timezone, weekly = false, height = 290 }) {
  const meta = SERIES_META[metric] || SERIES_META.pm2_5;
  const data = (series || []).map((entry) => ({
    time: entry.time,
    label: formatClock(entry.time, timezone),
    value: entry[metric],
  }));

  if (!data.length) {
    return <p className="chart-empty">Historical data is unavailable for this location.</p>;
  }

  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <defs>
            <linearGradient id={`trend-fill-${metric}-${weekly ? 'week' : 'day'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={meta.color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(15,92,84,0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#5a736f', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(15,92,84,0.2)' }}
            minTickGap={weekly ? 56 : 28}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: '#5a736f', fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<HistoryTooltip meta={meta} timezone={timezone} weekly={weekly} />} />
          {!weekly ? (
            <ReferenceLine
              x={data[data.length - 1]?.label}
              stroke="rgba(15,92,84,0.35)"
              strokeDasharray="4 4"
              label={{ value: 'Latest hour', position: 'insideTopRight', fill: '#5a736f', fontSize: 10 }}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="value"
            name={meta.label}
            stroke={meta.color}
            strokeWidth={2}
            fill={`url(#trend-fill-${metric}-${weekly ? 'week' : 'day'})`}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="chart-caption">
        Past values are modelled reanalysis/analysis fields from Open-Meteo/CAMS, not verified monitoring-station
        observations. Line gaps mark missing values.
      </p>
    </div>
  );
}
