export interface SparklineProps {
  data: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'currentColor',
}: SparklineProps) {
  const validPoints = data
    .map((v, i) => (v !== null ? { index: i, value: v } : null))
    .filter((p): p is { index: number; value: number } => p !== null);

  if (validPoints.length === 0) {
    return <svg role="img" aria-hidden="true" width={width} height={height} />;
  }

  const minVal = Math.min(...validPoints.map((p) => p.value));
  const maxVal = Math.max(...validPoints.map((p) => p.value));
  const range = maxVal - minVal || 1;
  const totalSlots = Math.max(data.length - 1, 1);
  const padding = 2;

  const points = validPoints
    .map((p) => {
      const x = padding + (p.index / totalSlots) * (width - padding * 2);
      const y = padding + (1 - (p.value - minVal) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg role="img" aria-hidden="true" width={width} height={height}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
