interface TrendSparklineProps {
  points: number[];
}

export function TrendSparkline({ points }: TrendSparklineProps) {
  if (points.length < 2) {
    return (
      <svg viewBox="0 0 100 40" className="h-14 w-full" role="img" aria-label="Trend unavailable">
        <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      </svg>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 0.01);

  const polyline = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 36 - ((point - min) / range) * 32;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" className="h-14 w-full" role="img" aria-label="Seven-day weight trend">
      <line x1="0" y1="36" x2="100" y2="36" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <polyline points={polyline} fill="none" stroke="rgba(126,160,255,0.95)" strokeWidth="2" />
    </svg>
  );
}
