export interface TrendSparklinePoint {
  label: string;
  value: number;
}

interface TrendSparklineProps {
  points: TrendSparklinePoint[];
  unit: "lb" | "kg";
}

export function TrendSparkline({ points, unit }: TrendSparklineProps) {
  if (points.length === 0) {
    return (
      <svg viewBox="0 0 100 40" className="h-14 w-full" role="img" aria-label="Trend unavailable">
        <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      </svg>
    );
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.01);

  const coordinates = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 36 - ((point.value - min) / range) * 32;
      return { x, y };
    })
    .map(({ x, y }) => `${x},${y}`);

  const polyline = coordinates.join(" ");
  const latest = points[points.length - 1];

  if (points.length === 1) {
    return (
      <svg
        viewBox="0 0 100 40"
        className="h-12 w-full"
        role="img"
        aria-label={`Single weigh-in at ${latest.value.toFixed(1)} ${unit}`}
      >
        <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx="50" cy="20" r="2.8" fill="rgba(135,163,255,0.95)" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 100 40"
      className="h-12 w-full"
      role="img"
      aria-label={`Weight trend from ${points[0].label} to ${latest.label}. Latest ${latest.value.toFixed(1)} ${unit}`}
    >
      <line x1="0" y1="36" x2="100" y2="36" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <polyline points={polyline} fill="none" stroke="rgba(135,163,255,0.95)" strokeWidth="2" />
    </svg>
  );
}
