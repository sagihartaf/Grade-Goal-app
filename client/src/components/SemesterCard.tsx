import { useState, useMemo } from "react";
import { ChevronDown, Plus, Trash2, History, Download, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CourseRow } from "./CourseRow";
import { calculateSemesterGpa, calculateHybridSemesterGpa, formatGpa, getTermName, calculateCourseGrade } from "@/lib/gpaCalculations";
import type { SemesterWithCourses, CourseWithComponents } from "@shared/schema";
import { cn } from "@/lib/utils";

interface SemesterCardProps {
  semester: SemesterWithCourses;
  onComponentScoreChange: (componentId: string, score: number) => void;
  onComponentScoreCommit?: (componentId: string, score: number) => void;
  onTargetGradeChange?: (courseId: string, targetGrade: number | null) => void;
  onAddCourse?: () => void;
  onDeleteSemester?: (semesterId: string) => void;
  onDeleteCourse?: (courseId: string) => void;
  onEditCourse?: (course: CourseWithComponents) => void;
  onClearCourseGrades?: (courseId: string) => void;
  onImportRecommended?: (semesterId: string) => void;
  isImporting?: boolean;
}

export function SemesterCard({
  semester,
  onComponentScoreChange,
  onComponentScoreCommit,
  onTargetGradeChange,
  onAddCourse,
  onDeleteSemester,
  onDeleteCourse,
  onEditCourse,
  onClearCourseGrades,
  onImportRecommended,
  isImporting = false,
}: SemesterCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  const legacyCredits = semester.legacyCredits || 0;
  const legacyGpa = semester.legacyGpa || 0;
  const isHybridSemester = semester.isLegacyVisible || legacyCredits > 0;

  const semesterGpa = useMemo(
    () => isHybridSemester 
      ? calculateHybridSemesterGpa(semester.courses, legacyCredits, legacyGpa)
      : calculateSemesterGpa(semester.courses),
    [semester.courses, isHybridSemester, legacyCredits, legacyGpa]
  );

  const actualCredits = useMemo(
    () => semester.courses.reduce((sum, c) => sum + c.credits, 0),
    [semester.courses]
  );

  const totalCredits = useMemo(
    () => legacyCredits + actualCredits,
    [legacyCredits, actualCredits]
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

  const handleImportRecommended = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImportRecommended?.(semester.id);
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
                {isHybridSemester && (
                  <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-400">
                    <History className="w-3 h-3 me-1" />
                    שנה שהסתיימה
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {totalCredits} נ״ז
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {legacyCredits > 0 && (
                  <span>{legacyCredits} נ״ז מקוצרות + </span>
                )}
                {semester.courses.length} קורסים מפורטים
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
              <div className="py-8 text-center space-y-3">
                <p className="text-muted-foreground mb-4">אין קורסים בסמסטר זה</p>
                <div className="flex flex-col gap-2 items-center">
                  {onImportRecommended && (
                    <Button 
                      onClick={handleImportRecommended} 
                      variant="default" 
                      disabled={isImporting}
                      data-testid="button-import-recommended"
                      className="min-w-[200px]"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                          מייבא...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 ms-2" />
                          ייבא קורסים מומלצים
                        </>
                      )}
                    </Button>
                  )}
                  {onAddCourse && (
                    <Button 
                      onClick={handleAddCourseClick} 
                      variant="outline" 
                      data-testid="button-add-first-course"
                      className="min-w-[200px]"
                    >
                      <Plus className="w-4 h-4 ms-2" />
                      הוסף קורס ידנית
                    </Button>
                  )}
                </div>
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
                    onComponentScoreCommit={onComponentScoreCommit}
                    onTargetGradeChange={onTargetGradeChange}
                    onDeleteCourse={onDeleteCourse}
                    onEditCourse={onEditCourse}
                    onClearCourseGrades={onClearCourseGrades}
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
