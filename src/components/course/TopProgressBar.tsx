type Props = {
  completed: number;
  total: number;
  percent: number;
};

const TopProgressBar = ({ completed, total, percent }: Props) => (
  <div dir="rtl" className="w-full bg-[hsl(0_0%_11%)] text-white">
    <div className="container py-3">
      <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
        <span className="font-semibold text-[hsl(var(--primary))]">
          הושלם {percent}%
        </span>
        <span className="text-white/80">
          {completed}/{total} שיעורים
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-gradient-to-l from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  </div>
);

export default TopProgressBar;