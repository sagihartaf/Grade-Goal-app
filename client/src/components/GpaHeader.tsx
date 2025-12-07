import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatGpa } from "@/lib/gpaCalculations";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

type FilterScope = "degree" | "year" | "semester";

interface GpaHeaderProps {
  degreeGpa: number | null;
  yearGpa?: number | null;
  semesterGpa?: number | null;
  selectedYear?: number;
  selectedSemester?: string;
  onFilterChange?: (filter: FilterScope) => void;
  currentFilter?: FilterScope;
}

export function GpaHeader({
  degreeGpa,
  yearGpa,
  semesterGpa,
  selectedYear,
  selectedSemester,
  onFilterChange,
  currentFilter = "degree",
}: GpaHeaderProps) {
  const getDisplayGpa = () => {
    switch (currentFilter) {
      case "year":
        return yearGpa;
      case "semester":
        return semesterGpa;
      default:
        return degreeGpa;
    }
  };

  const getFilterLabel = () => {
    switch (currentFilter) {
      case "year":
        return `שנה ${selectedYear}`;
      case "semester":
        return selectedSemester || "סמסטר";
      default:
        return "כל התואר";
    }
  };

  const displayGpa = getDisplayGpa();

  return (
    <header 
      className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4"
      data-testid="header-gpa"
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">הממוצע שלך</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={displayGpa?.toString() || "null"}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="text-5xl font-bold text-foreground tabular-nums"
                data-testid="text-gpa-value"
              >
                {formatGpa(displayGpa ?? null)}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge
              variant={currentFilter === "degree" ? "default" : "secondary"}
              className={cn(
                "cursor-pointer transition-all",
                currentFilter === "degree" && "ring-2 ring-primary/20"
              )}
              onClick={() => onFilterChange?.("degree")}
              data-testid="filter-degree"
            >
              כל התואר
            </Badge>
            <Badge
              variant={currentFilter === "year" ? "default" : "secondary"}
              className={cn(
                "cursor-pointer transition-all",
                currentFilter === "year" && "ring-2 ring-primary/20"
              )}
              onClick={() => onFilterChange?.("year")}
              data-testid="filter-year"
            >
              לפי שנה
            </Badge>
            <Badge
              variant={currentFilter === "semester" ? "default" : "secondary"}
              className={cn(
                "cursor-pointer transition-all",
                currentFilter === "semester" && "ring-2 ring-primary/20"
              )}
              onClick={() => onFilterChange?.("semester")}
              data-testid="filter-semester"
            >
              לפי סמסטר
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
