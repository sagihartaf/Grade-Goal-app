import { cn } from "@/lib/utils";
import { formatGpa } from "@/lib/gpaCalculations";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type FilterScope = "degree" | "year" | "semester";

interface InstitutionStats {
  totalUsers: number;
  userRank: number;
  percentile: number;
  averageGpa: number;
}

interface GpaHeaderProps {
  degreeGpa: number | null;
  yearGpa?: number | null;
  semesterGpa?: number | null;
  selectedYear?: number;
  selectedSemester?: string;
  onFilterChange?: (filter: FilterScope) => void;
  currentFilter?: FilterScope;
  institutionStats?: InstitutionStats | null;
}

export function GpaHeader({
  degreeGpa,
  yearGpa,
  semesterGpa,
  selectedYear,
  selectedSemester,
  onFilterChange,
  currentFilter = "degree",
  institutionStats,
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

  const getPercentileBadgeColor = (percentile: number) => {
    if (percentile >= 90) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (percentile >= 75) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    if (percentile >= 50) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <header 
      className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4"
      data-testid="header-gpa"
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">הממוצע שלך</p>
            <div className="flex items-center justify-center gap-3">
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
              
              {institutionStats && currentFilter === "degree" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium cursor-help",
                        getPercentileBadgeColor(institutionStats.percentile)
                      )}
                      data-testid="badge-percentile"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>אחוזון {institutionStats.percentile}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-center">
                    <div className="flex items-center gap-1 mb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>מקום {institutionStats.userRank} מתוך {institutionStats.totalUsers}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ממוצע המוסד: {institutionStats.averageGpa.toFixed(1)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
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
