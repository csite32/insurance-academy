import { motion } from "framer-motion";
import {
  Headphones,
  ShieldCheck,
  Handshake,
  WalletCards,
  Pill,
} from "lucide-react";
import React from "react";

const iconMap: Record<string, React.FC<any>> = {
  shieldHeart: ShieldCheck,
  headset: Headphones,
  hands: Handshake,
  wallet: WalletCards,
  pill: Pill,
};

const iconItems = [
  { type: "shieldHeart", left: "15%", top: "30%", delay: 0 },
  { type: "headset", left: "50%", top: "9%", delay: 0.35 },
  { type: "hands", left: "81%", top: "41%", delay: 0.7 },
  { type: "wallet", left: "75%", top: "75%", delay: 1.05 },
  { type: "pill", left: "27%", top: "76%", delay: 1.4 },
];

function IconBubble({
  type,
  left,
  top,
  delay,
}: {
  type: string;
  left: string;
  top: string;
  delay: number;
}) {
  const Icon = iconMap[type];
  if (!Icon) return null;

  return (
    <motion.div
      className="absolute z-30 flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-lg border border-border"
      style={{ left, top }}
      animate={{
        y: [0, -10, 0, 6, 0],
        x: [0, 5, 0, -5, 0],
      }}
      transition={{
        duration: 6 + delay * 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      <Icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
    </motion.div>
  );
}

export default function HeroAnimatedVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden" dir="ltr">
      <style>{`
        @keyframes dashFlow {
          0% { stroke-dashoffset: 260; }
          100% { stroke-dashoffset: 0; }
        }
        .animated-dash {
          stroke-dasharray: 4 9;
          animation: dashFlow 7s linear infinite;
        }
        .animated-dash-slow {
          stroke-dasharray: 4 9;
          animation: dashFlow 9s linear infinite;
        }
      `}</style>

      {/* SVG dashed paths + node dots */}
      <motion.svg
        className="absolute inset-0 z-20 h-full w-full overflow-visible"
        viewBox="0 0 620 670"
        fill="none"
        animate={{ rotate: [0, 0.8, -0.8, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          className="animated-dash"
          d="M138 204C180 146 247 108 334 108C418 108 468 132 502 176"
          stroke="#B9AA7E"
          strokeWidth="1.45"
          strokeLinecap="round"
          fill="none"
          opacity=".9"
        />
        <path
          className="animated-dash-slow"
          d="M138 204C117 263 135 326 195 365C278 420 412 402 502 328"
          stroke="#B9AA7E"
          strokeWidth="1.45"
          strokeLinecap="round"
          fill="none"
          opacity=".62"
          style={{ animationDelay: "-2.2s" }}
        />
        <path
          className="animated-dash"
          d="M502 328C555 388 515 482 424 516C371 536 323 542 304 540"
          stroke="#B9AA7E"
          strokeWidth="1.45"
          strokeLinecap="round"
          fill="none"
          opacity=".82"
          style={{ animationDelay: "-1.3s" }}
        />
        <path
          className="animated-dash-slow"
          d="M304 540C215 536 145 482 135 392C128 328 152 272 228 326"
          stroke="#B9AA7E"
          strokeWidth="1.45"
          strokeLinecap="round"
          fill="none"
          opacity=".68"
          style={{ animationDelay: "-3.6s" }}
        />
        <path
          className="animated-dash"
          d="M228 326C290 252 397 248 502 328"
          stroke="#B9AA7E"
          strokeWidth="1.45"
          strokeLinecap="round"
          fill="none"
          opacity=".48"
          style={{ animationDelay: "-4.8s" }}
        />

        <circle cx="138" cy="204" r="6" fill="#F49A30" />
        <circle cx="502" cy="176" r="7" fill="#F5B449" />
        <circle cx="502" cy="328" r="5" fill="#79A861" />
        <circle cx="304" cy="540" r="5" fill="#F3D154" opacity=".65" />
      </motion.svg>

      {/* Amorphic blobs */}
      <motion.div
        className="absolute z-10"
        style={{
          left: "4%",
          top: "43%",
          width: "48%",
          height: "31%",
          borderRadius: "60% 40% 42% 58% / 55% 52% 48% 45%",
          background:
            "linear-gradient(135deg, rgba(111,151,82,.86), rgba(99,132,65,.76))",
          boxShadow: "0 24px 52px rgba(90,119,57,.20)",
        }}
        animate={{
          x: [0, -7, 0],
          y: [0, -9, 0],
          rotate: [-19, -14, -19],
          scale: [1, 1.025, 1],
        }}
        transition={{ duration: 8.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute z-10"
        style={{
          left: "31%",
          top: "18%",
          width: "41%",
          height: "28%",
          borderRadius: "62% 38% 57% 43% / 50% 56% 44% 50%",
          background:
            "linear-gradient(135deg, rgba(249,126,38,.95), rgba(250,200,126,.75))",
          boxShadow: "0 22px 52px rgba(239,133,48,.22)",
        }}
        animate={{
          x: [0, 8, 0],
          y: [0, 8, 0],
          rotate: [-21, -15, -21],
          scale: [1, 1.025, 1],
        }}
        transition={{ duration: 7.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute z-10"
        style={{
          left: "43%",
          top: "44%",
          width: "44%",
          height: "28%",
          borderRadius: "58% 42% 48% 52% / 50% 48% 52% 50%",
          background:
            "linear-gradient(135deg, rgba(207,203,91,.72), rgba(169,166,54,.62))",
          boxShadow: "0 22px 52px rgba(150,145,47,.17)",
        }}
        animate={{
          x: [0, 6, 0],
          y: [0, -7, 0],
          rotate: [-5, 1, -5],
          scale: [1, 1.03, 1],
        }}
        transition={{ duration: 8.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute z-10"
        style={{
          left: "26%",
          top: "42%",
          width: "47%",
          height: "27%",
          borderRadius: "58% 42% 50% 50% / 52% 50% 50% 48%",
          background: "rgba(241,232,124,.48)",
          mixBlendMode: "multiply" as const,
        }}
        animate={{
          y: [0, -8, 0],
          x: [0, 4, 0],
          rotate: [-3, 2, -3],
          scale: [1, 1.035, 1],
        }}
        transition={{ duration: 7.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute z-10"
        style={{
          left: "36%",
          top: "50%",
          width: "34%",
          height: "24%",
          borderRadius: "55% 45% 58% 42% / 50% 55% 45% 50%",
          background: "rgba(245,230,31,.54)",
          mixBlendMode: "multiply" as const,
        }}
        animate={{
          y: [0, 7, 0],
          scale: [1, 1.04, 1],
          rotate: [4, 8, 4],
        }}
        transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Icon bubbles */}
      {iconItems.map((item, index) => (
        <IconBubble key={index} {...item} />
      ))}
    </div>
  );
}
