import { useState, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface GradeSliderProps {
  value: number | null;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
  isMagen?: boolean;
  componentName: string;
  weight: number;
}

export function GradeSlider({
  value,
  onChange,
  onCommit,
  disabled = false,
  isMagen = false,
  componentName,
  weight,
}: GradeSliderProps) {
  const [isInteracting, setIsInteracting] = useState(false);
  const displayValue = value ?? 0;

  const handleValueChange = useCallback((values: number[]) => {
    onChange(values[0]);
  }, [onChange]);

  const getGradeColor = (grade: number) => {
    if (grade >= 85) return "text-green-600 dark:text-green-400";
    if (grade >= 70) return "text-blue-600 dark:text-blue-400";
    if (grade >= 56) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-4 py-3 px-4 rounded-lg transition-colors",
        isInteracting && "bg-muted/50"
      )}
      data-testid={`slider-component-${componentName}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium truncate">{componentName}</span>
          {isMagen && (
            <span 
              className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
              data-testid="badge-magen"
            >
              מגן
            </span>
          )}
          <span className="text-xs text-muted-foreground me-auto">
            {weight}%
          </span>
        </div>
        
        <div className="relative">
          <Slider
            value={[displayValue]}
            onValueChange={handleValueChange}
            onValueCommit={(values) => onCommit?.(values[0])}
            onPointerDown={() => setIsInteracting(true)}
            onPointerUp={() => setIsInteracting(false)}
            onPointerLeave={() => setIsInteracting(false)}
            min={0}
            max={100}
            step={1}
            disabled={disabled}
            className="w-full"
            dir="ltr"
          />
          
          <AnimatePresence>
            {isInteracting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg"
              >
                {displayValue}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div 
        className={cn(
          "w-12 text-center font-bold text-lg tabular-nums transition-colors",
          getGradeColor(displayValue)
        )}
        data-testid={`text-grade-${componentName}`}
      >
        {value !== null ? displayValue : "—"}
      </div>
    </div>
  );
}
