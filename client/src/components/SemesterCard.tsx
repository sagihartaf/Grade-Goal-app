import { useState, useMemo } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CourseRow } from "./CourseRow";
import { calculateSemesterGpa, formatGpa, getTermName } from "@/lib/gpaCalculations";
import type { SemesterWithCourses, CourseWithComponents } from "@shared/schema";
import { cn } from "@/lib/utils";

interface SemesterCardProps {
  semester: SemesterWithCourses;
  onComponentScoreChange: (componentId: string, score: number) => void;
  onTargetGradeChange?: (courseId: string, targetGrade: number | null) => void;
  onAddCourse?: () => void;
  onDeleteSemester?: (semesterId: string) => void;
  onDeleteCourse?: (courseId: string) => void;
  onEditCourse?: (course: CourseWithComponents) => void;
}

export function SemesterCard({
  semester,
  onComponentScoreChange,
  onTargetGradeChange,
  onAddCourse,
  onDeleteSemester,
  onDeleteCourse,
  onEditCourse,
}: SemesterCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  const semesterGpa = useMemo(
    () => calculateSemesterGpa(semester.courses),
    [semester.courses]
  );

  const totalCredits = useMemo(
    () => semester.courses.reduce((sum, c) => sum + c.credits, 0),
    [semester.courses]
  );

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSemester?.(semester.id);
  };

  const handleAddCourseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddCourse?.();
  };

  return (
    <Card 
      className={cn(
        "overflow-visible transition-shadow",
        isExpanded && "shadow-md"
      )}
      data-testid={`card-semester-${semester.id}`}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-4 cursor-pointer hover-elevate rounded-t-lg group">
            <ChevronDown
              className={cn(
                "w-5 h-5 text-muted-foreground transition-transform duration-300",
                isExpanded && "rotate-180"
              )}
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">{semester.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {totalCredits} נ״ז
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {semester.courses.length} קורסים
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-end">
                <p className="text-xs text-muted-foreground">ממוצע</p>
                <p 
                  className="font-bold text-xl tabular-nums"
                  data-testid={`text-semester-gpa-${semester.id}`}
                >
                  {formatGpa(semesterGpa)}
                </p>
              </div>
              
              {onDeleteSemester && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteClick}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-delete-semester-${semester.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="animate-accordion-down">
          <div className="border-t border-border">
            {semester.courses.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground mb-4">אין קורסים בסמסטר זה</p>
                {onAddCourse && (
                  <Button onClick={handleAddCourseClick} variant="outline" data-testid="button-add-first-course">
                    <Plus className="w-4 h-4 ms-2" />
                    הוסף קורס ראשון
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {semester.courses.map((course) => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    isExpanded={expandedCourses.has(course.id)}
                    onToggle={() => toggleCourse(course.id)}
                    onComponentScoreChange={onComponentScoreChange}
                    onTargetGradeChange={onTargetGradeChange}
                    onDeleteCourse={onDeleteCourse}
                    onEditCourse={onEditCourse}
                  />
                ))}
              </div>
            )}
            
            {semester.courses.length > 0 && onAddCourse && (
              <div className="p-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddCourseClick}
                  className="w-full"
                  data-testid="button-add-course"
                >
                  <Plus className="w-4 h-4 ms-2" />
                  הוסף קורס
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
