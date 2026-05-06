import { Headphones, ShieldCheck, Handshake, HeartPulse, Wallet, UserCog } from "lucide-react";

export type Course = {
  id: string;
  title: string;
  description: string;
  lessons: number;
  icon: any;
  locked?: boolean;
};

export const courses: Course[] = [
  {
    id: "service",
    title: "שירות לקוחות",
    description: "הכשרות שירות, ניהול תלונות ומשובים שוטפים.",
    lessons: 18,
    icon: Headphones,
  },
  {
    id: "elementary",
    title: "אלמנטרי",
    description: "ביטוח רכב, דירה ורכוש — הכשרות וערכוני מוצר.",
    lessons: 22,
    icon: ShieldCheck,
  },
  {
    id: "sales",
    title: "מכירות",
    description: "כלים, תסריטים וקורסים לשיפור ביצועי המכירה.",
    lessons: 16,
    icon: Handshake,
  },
  {
    id: "private",
    title: "מוצרי פרט",
    description: "ביטוחי משכנתא, ביטוח ריסק וביטוחי בריאות.",
    lessons: 14,
    icon: HeartPulse,
    locked: true,
  },
  {
    id: "finance",
    title: "פיננסים",
    description: "השקעות, ביטוח חיים ומוצרי חיסכון.",
    lessons: 20,
    icon: Wallet,
  },
  {
    id: "pension",
    title: "פנסיה וגמל",
    description: "קורסים בקרנות פנסיה, גמל והשתלמות.",
    lessons: 15,
    icon: UserCog,
    locked: true,
  },
];