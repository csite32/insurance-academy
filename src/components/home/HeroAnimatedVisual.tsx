import { motion } from "framer-motion";
import { Headphones, ShieldCheck, Handshake, WalletCards, Pill } from "lucide-react";

type IconItem = {
  Icon: any;
  className: string;
  delay: number;
  axis?: "y" | "x";
};

const icons: IconItem[] = [
  { Icon: ShieldCheck, className: "right-[6%] top-[28%]", delay: 0, axis: "y" },
  { Icon: Headphones, className: "left-[44%] top-[4%]", delay: 0.4, axis: "x" },
  { Icon: Handshake, className: "left-[6%] top-[38%]", delay: 0.8, axis: "y" },
  { Icon: WalletCards, className: "left-[16%] bottom-[12%]", delay: 1.2, axis: "x" },
  { Icon: Pill, className: "right-[26%] bottom-[10%]", delay: 1.6, axis: "y" },
];

export default function HeroAnimatedVisual() {
  return (
    <div className="relative h-full w-full" dir="ltr">
      <style>{`
        @keyframes heroDrawDash {
          0% { stroke-dashoffset: 320; }
          100% { stroke-dashoffset: 0; }
        }
        .hero-dashed-path {
          stroke-dasharray: 6 10;
          animation: heroDrawDash 9s linear infinite;
        }
      `}</style>

      {/* amorphic blobs */}
      <motion.div
        className="absolute top-[10%] right-[12%] h-48 w-48 rounded-[42%_58%_60%_40%/45%_40%_60%_55%] bg-[hsl(var(--accent))] opacity-60 blur-[2px]"
        animate={{ scale: [1, 1.06, 1], rotate: [0, 6, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[34%] left-[10%] h-56 w-56 rounded-[55%_45%_40%_60%/50%_55%_45%_50%] bg-[hsl(var(--primary))] opacity-70 blur-[2px]"
        animate={{ scale: [1, 1.08, 1], rotate: [0, -5, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      <motion.div
        className="absolute bottom-[8%] right-[18%] h-52 w-52 rounded-[60%_40%_55%_45%/40%_60%_50%_50%] bg-[hsl(var(--accent-light))] opacity-65 blur-[2px]"
        animate={{ scale: [1, 1.05, 1], rotate: [0, 4, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[28%] h-32 w-32 rounded-[45%_55%_50%_50%/55%_45%_55%_45%] bg-[hsl(var(--primary-dark))] opacity-50 blur-[2px]"
        animate={{ scale: [1, 1.07, 1], rotate: [0, -7, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />

      {/* animated dashed line */}
      <motion.svg
        viewBox="0 0 500 500"
        className="absolute inset-0 h-full w-full"
        aria-hidden
        animate={{ rotate: [0, 4, 0, -4, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          className="hero-dashed-path"
          d="M 70 130 Q 200 60 280 110 T 440 180 Q 470 280 380 360 T 120 400 Q 50 320 90 220 Z"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1.2"
          fill="none"
          opacity="0.55"
        />
        <path
          className="hero-dashed-path"
          style={{ animationDuration: "12s", animationDirection: "reverse" }}
          d="M 130 200 Q 250 140 340 200 T 410 340 Q 300 400 200 360 T 130 200 Z"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1"
          fill="none"
          opacity="0.4"
        />
      </motion.svg>

      {/* icon cards */}
      {icons.map(({ Icon, className, delay, axis }, index) => (
        <motion.div
          key={index}
          className={`absolute flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-card ${className}`}
          animate={
            axis === "x"
              ? { x: [0, 10, 0, -10, 0], y: [0, -6, 0, 6, 0] }
              : { y: [0, -12, 0, 8, 0], x: [0, 4, 0, -4, 0] }
          }
          transition={{
            duration: 6 + index,
            repeat: Infinity,
            ease: "easeInOut",
            delay,
          }}
        >
          <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
        </motion.div>
      ))}
    </div>
  );
}