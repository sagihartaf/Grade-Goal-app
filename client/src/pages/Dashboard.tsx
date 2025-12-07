import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { GpaHeader } from "@/components/GpaHeader";
import { SemesterCard } from "@/components/SemesterCard";
import { CreateSemesterDialog } from "@/components/CreateSemesterDialog";
import { CreateCourseDialog } from "@/components/CreateCourseDialog";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PaywallModal } from "@/components/PaywallModal";
import { useProStatus, canCreateSemester } from "@/hooks/useProStatus";
import { 
  calculateDegreeGpa, 
  calculateYearGpa, 
  calculateSemesterGpa,
  getSemesterDisplayName 
} from "@/lib/gpaCalculations";
import { generateGradeReport } from "@/lib/pdfExport";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SemesterWithCourses, User, CourseWithComponents } from "@shared/schema";

type FilterScope = "degree" | "year" | "semester";

export default function Dashboard() {
  const { toast } = useToast();
  const { isPro } = useProStatus();
  const [currentFilter, setCurrentFilter] = useState<FilterScope>("degree");
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  
  const [isCreateSemesterOpen, setIsCreateSemesterOpen] = useState(false);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<CourseWithComponents | null>(null);

  const [localScores, setLocalScores] = useState<Record<string, number>>({});

  const { data: semesters = [], isLoading } = useQuery<SemesterWithCourses[]>({
    queryKey: ["/api/semesters"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/profile"],
  });

  const semestersWithLocalScores = useMemo(() => {
    return semesters.map((semester) => ({
      ...semester,
      courses: semester.courses.map((course) => ({
        ...course,
        gradeComponents: course.gradeComponents.map((component) => ({
          ...component,
          score: localScores[component.id] ?? component.score,
        })),
      })),
    }));
  }, [semesters, localScores]);

  const handleExportPdf = useCallback(() => {
    if (semesters.length === 0) {
      toast({
        title: "אין נתונים לייצוא",
        description: "הוסף סמסטרים וקורסים לפני ייצוא הדוח",
        variant: "destructive",
      });
      return;
    }
    generateGradeReport(semestersWithLocalScores, user);
    toast({
      title: "הדוח יורד",
      description: "קובץ PDF נוצר בהצלחה",
    });
  }, [semesters.length, semestersWithLocalScores, user, toast]);

  const sortedSemesters = useMemo(() => {
    return [...semestersWithLocalScores].sort((a, b) => {
      if (a.academicYear !== b.academicYear) {
        return a.academicYear - b.academicYear;
      }
      const termOrder = { A: 1, B: 2, Summer: 3 };
      return termOrder[a.term] - termOrder[b.term];
    });
  }, [semestersWithLocalScores]);

  const degreeGpa = useMemo(
    () => calculateDegreeGpa(semestersWithLocalScores),
    [semestersWithLocalScores]
  );

  const yearGpa = useMemo(
    () => calculateYearGpa(semestersWithLocalScores, selectedYear),
    [semestersWithLocalScores, selectedYear]
  );

  const semesterGpa = useMemo(() => {
    const semester = semestersWithLocalScores.find((s) => s.id === selectedSemesterId);
    return semester ? calculateSemesterGpa(semester.courses) : null;
  }, [semestersWithLocalScores, selectedSemesterId]);

  interface InstitutionStats {
    totalUsers: number;
    userRank: number;
    percentile: number;
    averageGpa: number;
  }

  const { data: institutionStats } = useQuery<InstitutionStats | null>({
    queryKey: ["/api/stats/institution", degreeGpa],
    queryFn: async () => {
      if (degreeGpa === null) return null;
      const response = await fetch(`/api/stats/institution?gpa=${degreeGpa}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: degreeGpa !== null,
  });

  const createSemesterMutation = useMutation({
    mutationFn: async (data: { academicYear: number; term: "A" | "B" | "Summer" }) => {
      const response = await apiRequest("POST", "/api/semesters", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      setIsCreateSemesterOpen(false);
      toast({ title: "הסמסטר נוצר בהצלחה" });
    },
    onError: () => {
      toast({ title: "שגיאה ביצירת הסמסטר", variant: "destructive" });
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: {
      semesterId: string;
      name: string;
      credits: number;
      components: Array<{ name: string; weight: number; isMagen: boolean }>;
    }) => {
      const response = await apiRequest("POST", "/api/courses", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      setIsCreateCourseOpen(false);
      setActiveSemesterId(null);
      toast({ title: "הקורס נוצר בהצלחה" });
    },
    onError: () => {
      toast({ title: "שגיאה ביצירת הקורס", variant: "destructive" });
    },
  });

  const updateScoreMutation = useMutation({
    mutationFn: async ({ componentId, score }: { componentId: string; score: number }) => {
      await apiRequest("PATCH", `/api/grade-components/${componentId}`, { score });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
    },
  });

  const deleteSemesterMutation = useMutation({
    mutationFn: async (semesterId: string) => {
      await apiRequest("DELETE", `/api/semesters/${semesterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      toast({ title: "הסמסטר נמחק" });
    },
    onError: () => {
      toast({ title: "שגיאה במחיקת הסמסטר", variant: "destructive" });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      toast({ title: "הקורס נמחק" });
    },
    onError: () => {
      toast({ title: "שגיאה במחיקת הקורס", variant: "destructive" });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ courseId, data }: { 
      courseId: string; 
      data: { name: string; credits: number; components: Array<{ name: string; weight: number; score?: number | null; isMagen: boolean }> } 
    }) => {
      await apiRequest("PUT", `/api/courses/${courseId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      setIsCreateCourseOpen(false);
      setEditingCourse(null);
      toast({ title: "הקורס עודכן בהצלחה" });
    },
    onError: () => {
      toast({ title: "שגיאה בעדכון הקורס", variant: "destructive" });
    },
  });

  const updateTargetGradeMutation = useMutation({
    mutationFn: async ({ courseId, targetGrade }: { courseId: string; targetGrade: number | null }) => {
      await apiRequest("PATCH", `/api/courses/${courseId}/target`, { targetGrade });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      toast({ title: "ציון היעד עודכן" });
    },
    onError: () => {
      toast({ title: "שגיאה בעדכון ציון היעד", variant: "destructive" });
    },
  });

  const handleComponentScoreChange = useCallback((componentId: string, score: number) => {
    setLocalScores((prev) => ({ ...prev, [componentId]: score }));
    
    const timeoutId = setTimeout(() => {
      updateScoreMutation.mutate({ componentId, score });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [updateScoreMutation]);

  const handleAddCourse = (semesterId: string) => {
    setActiveSemesterId(semesterId);
    setEditingCourse(null);
    setIsCreateCourseOpen(true);
  };

  const handleEditCourse = useCallback((course: CourseWithComponents) => {
    setEditingCourse(course);
    setIsCreateCourseOpen(true);
  }, []);

  const handleDeleteCourse = useCallback((courseId: string) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את הקורס?")) {
      deleteCourseMutation.mutate(courseId);
    }
  }, [deleteCourseMutation]);

  const handleDeleteSemester = useCallback((semesterId: string) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את הסמסטר? כל הקורסים בסמסטר יימחקו.")) {
      deleteSemesterMutation.mutate(semesterId);
    }
  }, [deleteSemesterMutation]);

  const handleAddSemesterClick = useCallback(() => {
    if (canCreateSemester(semesters.length, isPro)) {
      setIsCreateSemesterOpen(true);
    } else {
      setIsPaywallOpen(true);
    }
  }, [semesters.length, isPro]);

  const handleTargetGradeChange = useCallback((courseId: string, targetGrade: number | null) => {
    updateTargetGradeMutation.mutate({ courseId, targetGrade });
  }, [updateTargetGradeMutation]);

  const handleFilterChange = (filter: FilterScope) => {
    setCurrentFilter(filter);
    if (filter === "year" && sortedSemesters.length > 0) {
      setSelectedYear(sortedSemesters[0].academicYear);
    }
    if (filter === "semester" && sortedSemesters.length > 0) {
      setSelectedSemesterId(sortedSemesters[0].id);
    }
  };

  const activeSemester = sortedSemesters.find((s) => s.id === activeSemesterId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-14 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-4 start-4 z-50 flex gap-2">
        <ThemeToggle />
        <Button
          size="icon"
          variant="ghost"
          onClick={handleExportPdf}
          data-testid="button-export-pdf"
          title="ייצוא דוח ציונים"
        >
          <FileDown className="w-5 h-5" />
        </Button>
      </div>

      <GpaHeader
        degreeGpa={degreeGpa}
        yearGpa={yearGpa}
        semesterGpa={semesterGpa}
        selectedYear={selectedYear}
        selectedSemester={activeSemester?.name}
        currentFilter={currentFilter}
        onFilterChange={handleFilterChange}
        institutionStats={institutionStats}
      />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {sortedSemesters.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">אין סמסטרים עדיין</h2>
            <p className="text-muted-foreground mb-6">
              התחל להוסיף את הסמסטרים והקורסים שלך
            </p>
            <Button
              onClick={handleAddSemesterClick}
              data-testid="button-add-first-semester"
            >
              <Plus className="w-4 h-4 ms-2" />
              הוסף סמסטר ראשון
            </Button>
          </div>
        ) : (
          <>
            {sortedSemesters.map((semester) => (
              <SemesterCard
                key={semester.id}
                semester={semester}
                onComponentScoreChange={handleComponentScoreChange}
                onTargetGradeChange={handleTargetGradeChange}
                onAddCourse={() => handleAddCourse(semester.id)}
                onDeleteSemester={handleDeleteSemester}
                onDeleteCourse={handleDeleteCourse}
                onEditCourse={handleEditCourse}
              />
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddSemesterClick}
              data-testid="button-add-semester"
            >
              <Plus className="w-4 h-4 ms-2" />
              הוסף סמסטר
            </Button>
          </>
        )}
      </main>

      <BottomNavigation />

      <CreateSemesterDialog
        open={isCreateSemesterOpen}
        onOpenChange={setIsCreateSemesterOpen}
        onSubmit={(data) => createSemesterMutation.mutate(data)}
        isPending={createSemesterMutation.isPending}
      />

      <CreateCourseDialog
        open={isCreateCourseOpen}
        onOpenChange={(open) => {
          setIsCreateCourseOpen(open);
          if (!open) setEditingCourse(null);
        }}
        onSubmit={(data) => {
          if (editingCourse) {
            updateCourseMutation.mutate({ courseId: editingCourse.id, data });
          } else if (activeSemesterId) {
            createCourseMutation.mutate({ ...data, semesterId: activeSemesterId });
          }
        }}
        isPending={createCourseMutation.isPending || updateCourseMutation.isPending}
        semesterName={activeSemester?.name}
        editCourse={editingCourse}
      />

      <PaywallModal
        open={isPaywallOpen}
        onOpenChange={setIsPaywallOpen}
        trigger="semester_limit"
      />
    </div>
  );
}
