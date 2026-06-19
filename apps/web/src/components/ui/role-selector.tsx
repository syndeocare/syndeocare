import * as React from "react";
import { LucideIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface RoleOption {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}

interface RoleSelectorProps {
  options: RoleOption[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * Role selection card component
 * UX Principle #8: Visual Hierarchy - clear focus on primary action
 * UX Principle #12: Touch Targets Must Be Human-Sized (44x44 min)
 */
export const RoleSelector = ({
  options,
  selectedId,
  onSelect,
  className,
}: RoleSelectorProps) => {
  return (
    <div className={cn("space-y-4", className)} role="radiogroup">
      {options.map((option, index) => {
        const isSelected = selectedId === option.id;
        const Icon = option.icon;

        return (
          <motion.button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            role="radio"
            aria-checked={isSelected}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              // Base styles
              "w-full p-6 rounded-2xl border-2 text-start transition-all duration-200",
              // Touch target compliance
              "min-h-[80px]",
              // Focus states
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // Unselected state
              !isSelected &&
                "border-border hover:border-primary/40 hover:bg-primary/5",
              // Selected state
              isSelected && "border-primary bg-primary/5 shadow-lg",
            )}
          >
            <div className="flex items-start gap-5">
              {/* Icon container */}
              <div
                className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                  "transition-transform duration-200",
                  !isSelected && "group-hover:scale-110",
                  isSelected && "scale-110 shadow-lg",
                  option.gradient,
                )}
              >
                <Icon className="w-7 h-7 text-white" aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={cn(
                      "font-semibold text-lg transition-colors",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {option.title}
                  </h3>
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </motion.span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  {option.description}
                </p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default RoleSelector;
