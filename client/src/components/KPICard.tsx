/**
 * KPICard — Corporate Analytics Style
 * Swiss design: large monospace numbers, thin dividers, functional color badges
 */
import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accentColor?: string;
  delay?: number;
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  accentColor = "bg-petrol-bg text-petrol",
  delay = 0,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden"
    >
      {/* Top row: icon + title */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="kpi-value text-xl lg:text-2xl text-foreground leading-none">
        {value}
      </div>

      {/* Bottom row: subtitle + trend */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
        {subtitle && (
          <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
        )}
        {trend && trendValue && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              trend === "up"
                ? "bg-green-ok-light text-green-ok"
                : trend === "down"
                ? "bg-orange-alert-light text-orange-alert"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"} {trendValue}
          </span>
        )}
      </div>
    </motion.div>
  );
}
