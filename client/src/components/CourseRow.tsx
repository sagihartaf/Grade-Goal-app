import { useMemo, useCallback } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GradeSlider } from "./GradeSlider";
import { calculateCourseGrade, formatGpa } from "@/lib/gpaCalculations";
import type { CourseWithComponents, GradeComponent } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CourseRowProps {
  course: CourseWithComponents;
  isExpanded: boolean;
  onToggle: () => void;
  onComponentScoreChange: (componentId: string, score: number) => void;
  onDeleteCourse?: (courseId: string) => void;
}

export function CourseRow({
  course,
  isExpanded,
  onToggle,
  onComponentScoreChange,
  onDeleteCourse,
}: CourseRowProps) {
  const courseGrade = useMemo(
    () => calculateCourseGrade(course.gradeComponents),
    [course.gradeComponents]
  );

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return "text-muted-foreground";
    if (grade >= 85) return "text-green-600 dark:text-green-400";
    if (grade >= 70) return "text-blue-600 dark:text-blue-400";
    if (grade >= 56) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteCourse?.(course.id);
  }, [course.id, onDeleteCourse]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-3 py-3 px-4 cursor-pointer hover-elevate rounded-lg transition-colors",
            isExpanded && "bg-muted/30"
          )}
          data-testid={`course-row-${course.id}`}
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-base truncate">{course.name}</span>
              <Badge variant="secondary" className="text-xs">
                {course.credits} נ״ז
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {course.gradeComponents.length} מרכיבים
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span 
              className={cn(
                "font-bold text-lg tabular-nums min-w-10 text-center",
                getGradeColor(courseGrade)
              )}
              data-testid={`text-course-grade-${course.id}`}
            >
              {formatGpa(courseGrade)}
            </span>
            
            {onDeleteCourse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-delete-course-${course.id}`}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden">
        <div className="ps-8 pe-4 pb-3 space-y-1">
          {course.gradeComponents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">
              אין מרכיבי ציון
            </p>
          ) : (
            course.gradeComponents.map((component) => (
              <GradeSlider
                key={component.id}
                value={component.score}
                onChange={(score) => onComponentScoreChange(component.id, score)}
                componentName={component.name}
                weight={component.weight}
                isMagen={component.isMagen || false}
              />
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
