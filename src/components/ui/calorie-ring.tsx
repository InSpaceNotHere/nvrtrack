interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
}

export function CalorieRing({ consumed, goal, size = 132 }: CalorieRingProps) {
  const safeGoal = goal > 0 ? goal : 1;
  const ratio = Math.min(consumed / safeGoal, 1);
  const stroke = 8;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`Calorie progress ${consumed} of ${goal}`}
      >
        <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="rgba(135,163,255,0.95)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold leading-none text-white">{Math.round((consumed / safeGoal) * 100)}%</span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.1em] text-zinc-500">Goal</span>
      </div>
    </div>
  );
}
