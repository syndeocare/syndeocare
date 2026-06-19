import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
}

interface StatsGridProps {
  stats: Stat[];
  variant?: "primary" | "accent";
  className?: string;
  isLoading?: boolean;
}

const StatsGrid = ({
  stats,
  variant = "primary",
  className,
  isLoading,
}: StatsGridProps) => {
  const colorClass =
    variant === "accent"
      ? "bg-accent/10 text-accent"
      : "bg-primary/10 text-primary";

  if (isLoading) {
    return (
      <div
        className={cn("grid grid-cols-2 md:grid-cols-4 gap-4 mb-8", className)}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-2xl border border-border p-4 shadow-card animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted" />
              <div className="space-y-2">
                <div className="h-6 w-12 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn("grid grid-cols-2 md:grid-cols-4 gap-4 mb-8", className)}
      role="region"
      aria-label="Statistics"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          className="bg-card rounded-2xl border border-border p-4 shadow-card hover:shadow-card-hover transition-shadow group"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                colorClass,
              )}
              aria-hidden="true"
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              {stat.trend && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    stat.trend.positive ? "text-success" : "text-destructive",
                  )}
                  aria-label={`${stat.trend.positive ? "Increased" : "Decreased"} by ${stat.trend.value}`}
                >
                  {stat.trend.positive ? "↑" : "↓"} {stat.trend.value}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StatsGrid;
