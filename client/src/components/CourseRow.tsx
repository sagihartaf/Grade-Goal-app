import { useMemo, useCallback, useState, useEffect } from "react";
import { ChevronDown, Trash2, Target, Pencil, ShieldOff, Eraser } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GradeSlider } from "./GradeSlider";
import { calculateCourseGradeWithMagenInfo, formatGpa } from "@/lib/gpaCalculations";
import type { CourseWithComponents, GradeComponent } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CourseRowProps {
  course: CourseWithComponents;
  isExpanded: boolean;
  onToggle: () => void;
  onComponentScoreChange: (componentId: string, score: number) => void;
  onComponentScoreCommit?: (componentId: string, score: number) => void;
  onTargetGradeChange?: (courseId: string, targetGrade: number | null) => void;
  onDeleteCourse?: (courseId: string) => void;
  onEditCourse?: (course: CourseWithComponents) => void;
  onClearCourseGrades?: (courseId: string) => void;
}

export function CourseRow({
  course,
  isExpanded,
  onToggle,
  onComponentScoreChange,
  onComponentScoreCommit,
  onTargetGradeChange,
  onDeleteCourse,
  onEditCourse,
  onClearCourseGrades,
}: CourseRowProps) {
  const [localTargetGrade, setLocalTargetGrade] = useState<number>(course.targetGrade ?? 80);
  const [isTargetPopoverOpen, setIsTargetPopoverOpen] = useState(false);
  
  useEffect(() => {
    setLocalTargetGrade(course.targetGrade ?? 80);
  }, [course.targetGrade]);
  
  const { grade: courseGrade, magenDropped } = useMemo(
    () => calculateCourseGradeWithMagenInfo(course.gradeComponents),
    [course.gradeComponents]
  );
  
  const progressToTarget = useMemo(() => {
    if (course.targetGrade === null || courseGrade === null) return null;
    return Math.min(100, (courseGrade / course.targetGrade) * 100);
  }, [course.targetGrade, courseGrade]);

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

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEditCourse?.(course);
  }, [course, onEditCourse]);
  
  const handleTargetClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);
  
  const handleTargetSave = useCallback(() => {
    onTargetGradeChange?.(course.id, localTargetGrade);
    setIsTargetPopoverOpen(false);
  }, [course.id, localTargetGrade, onTargetGradeChange]);
  
  const handleClearTarget = useCallback(() => {
    setLocalTargetGrade(80);
    onTargetGradeChange?.(course.id, null);
    setIsTargetPopoverOpen(false);
  }, [course.id, onTargetGradeChange]);

  const handleClearCourseGrades = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClearCourseGrades?.(course.id);
  }, [course.id, onClearCourseGrades]);

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
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <span 
                  className={cn(
                    "font-bold text-lg tabular-nums min-w-10 text-center",
                    getGradeColor(courseGrade)
                  )}
                  data-testid={`text-course-grade-${course.id}`}
                >
                  {formatGpa(courseGrade)}
                </span>
                {magenDropped && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span 
                        className="flex items-center cursor-help"
                        tabIndex={0}
                        role="img"
                        aria-label="מגן בוטל - ציון המגן היה נמוך מהמבחן, ולכן בוטל כדי למקסם את הממוצע שלך"
                        data-testid={`indicator-magen-dropped-${course.id}`}
                      >
                        <ShieldOff className="w-4 h-4 text-amber-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-center">
                      <p className="font-medium text-amber-600 dark:text-amber-400">מגן בוטל</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ציון המגן היה נמוך מהמבחן, ולכן בוטל כדי למקסם את הממוצע שלך.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {courseGrade !== null && onClearCourseGrades && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={handleClearCourseGrades}
                        data-testid={`button-clear-course-grade-${course.id}`}
                      >
                        <Eraser className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      נקה ציון
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {course.targetGrade !== null && (
                <span className="text-[10px] text-muted-foreground">
                  יעד: {course.targetGrade}
                </span>
              )}
            </div>
            
            <Popover open={isTargetPopoverOpen} onOpenChange={setIsTargetPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleTargetClick}
                  className={cn(
                    "transition-opacity",
                    course.targetGrade !== null ? "text-primary" : "text-muted-foreground"
                  )}
                  data-testid={`button-target-${course.id}`}
                >
                  <Target className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-72" 
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ציון יעד</span>
                      <span className="text-lg font-bold tabular-nums">{localTargetGrade}</span>
                    </div>
                    <Slider
                      value={[localTargetGrade]}
                      onValueChange={([value]) => setLocalTargetGrade(value)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                      data-testid={`slider-target-${course.id}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleTargetSave}
                      className="flex-1"
                      data-testid={`button-save-target-${course.id}`}
                    >
                      שמור יעד
                    </Button>
                    {course.targetGrade !== null && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleClearTarget}
                        data-testid={`button-clear-target-${course.id}`}
                      >
                        נקה
                      </Button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {onEditCourse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditClick}
                data-testid={`button-edit-course-${course.id}`}
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
            
            {onDeleteCourse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteClick}
                data-testid={`button-delete-course-${course.id}`}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      
      {course.targetGrade !== null && progressToTarget !== null && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2">
            <Progress 
              value={progressToTarget} 
              className="h-1.5 flex-1"
              data-testid={`progress-target-${course.id}`}
            />
            <span className={cn(
              "text-xs font-medium tabular-nums",
              progressToTarget >= 100 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            )}>
              {Math.round(progressToTarget)}%
            </span>
          </div>
        </div>
      )}

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
                onCommit={onComponentScoreCommit ? (score) => onComponentScoreCommit(component.id, score) : undefined}
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
