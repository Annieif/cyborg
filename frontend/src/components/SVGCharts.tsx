import { useMemo } from 'react';

interface HealthChartProps {
  health: number;
  maxHealth: number;
  width?: number;
  height?: number;
}

/** SVG 生命值环形图 */
export function HealthChart({ health, maxHealth, width = 80, height = 80 }: HealthChartProps) {
  const percent = maxHealth > 0 ? Math.min(health / maxHealth, 1) : 0;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent);

  return (
    <svg width={width} height={height} viewBox="0 0 80 80">
      {/* 背景圆环 */}
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth="6"
      />
      {/* 进度圆环 */}
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke={percent > 0.5 ? 'var(--accent)' : percent > 0.25 ? 'var(--warning)' : 'var(--danger)'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      {/* 中心文字 */}
      <text
        x="40"
        y="38"
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="14"
        fontWeight="700"
        fontFamily="var(--font-mono)"
      >
        {Math.round(health)}
      </text>
      <text
        x="40"
        y="52"
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize="9"
        fontFamily="var(--font-mono)"
      >
        HP
      </text>
    </svg>
  );
}

interface PositionChartProps {
  x: number;
  y: number;
  z: number;
  width?: number;
  height?: number;
}

/** SVG 坐标位置图 */
export function PositionChart({ x, y, z, width = 200, height = 120 }: PositionChartProps) {
  const maxVal = useMemo(() => Math.max(Math.abs(x), Math.abs(z), 50) * 1.2, [x, z]);
  const scale = 70 / maxVal;

  const sx = 100 + x * scale;
  const sy = 60 - z * scale;

  return (
    <svg
      className="svg-chart"
      width={width}
      height={height}
      viewBox="0 0 200 120"
    >
      {/* 坐标轴 */}
      <line x1="20" y1="60" x2="180" y2="60" stroke="var(--border)" strokeWidth="1" />
      <line x1="100" y1="10" x2="100" y2="110" stroke="var(--border)" strokeWidth="1" />

      {/* 轴标签 */}
      <text x="178" y="55" className="chart-label" textAnchor="end">X</text>
      <text x="105" y="14" className="chart-label">Z</text>
      <text x="20" y="55" className="chart-label">{(-maxVal).toFixed(0)}</text>
      <text x="160" y="55" className="chart-label">{maxVal.toFixed(0)}</text>

      {/* 原点 */}
      <circle cx="100" cy="60" r="2" fill="var(--text-muted)" />

      {/* 当前位置 */}
      <circle
        cx={sx}
        cy={sy}
        r="5"
        fill="var(--accent)"
        opacity="0.3"
        style={{ transition: 'cx 0.5s ease, cy 0.5s ease' }}
      />
      <circle
        cx={sx}
        cy={sy}
        r="2.5"
        fill="var(--accent)"
        style={{ transition: 'cx 0.5s ease, cy 0.5s ease' }}
      />

      {/* 坐标标签 */}
      <text
        x={sx + 8}
        y={sy - 6}
        className="chart-label"
        fill="var(--accent)"
      >
        ({x.toFixed(0)}, {z.toFixed(0)})
      </text>

      {/* Y 轴标注 */}
      <text x="14" y="25" className="chart-label" fill="var(--text-muted)">
        Y: {y.toFixed(1)}
      </text>
    </svg>
  );
}

interface BarChartProps {
  data: { label: string; value: number; max: number; color?: string }[];
  width?: number;
  height?: number;
}

/** SVG 柱状图 */
export function BarChart({ data, width = 200, height = 100 }: BarChartProps) {
  const barWidth = Math.min(30, (width - 40) / data.length - 10);
  const chartH = height - 30;
  const maxVal = Math.max(...data.map((d) => d.max), 1);

  return (
    <svg className="svg-chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* 基线 */}
      <line
        x1="30"
        y1={chartH + 5}
        x2={width - 10}
        y2={chartH + 5}
        stroke="var(--border)"
        strokeWidth="1"
      />

      {data.map((item, i) => {
        const barH = (item.value / maxVal) * chartH;
        const x = 35 + i * (barWidth + 10);

        return (
          <g key={item.label}>
            {/* 背景条 */}
            <rect
              x={x}
              y={chartH + 5 - (item.max / maxVal) * chartH}
              width={barWidth}
              height={(item.max / maxVal) * chartH}
              fill="var(--bg-card)"
              rx="3"
            />
            {/* 数值条 */}
            <rect
              className="chart-bar"
              x={x}
              y={chartH + 5 - barH}
              width={barWidth}
              height={barH}
              fill={item.color || 'var(--accent)'}
              rx="3"
            />
            {/* 标签 */}
            <text
              x={x + barWidth / 2}
              y={height - 6}
              className="chart-label"
              textAnchor="middle"
            >
              {item.label}
            </text>
            {/* 数值 */}
            <text
              x={x + barWidth / 2}
              y={chartH + 5 - barH - 4}
              className="chart-label"
              textAnchor="middle"
              fill={item.color || 'var(--accent)'}
            >
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}