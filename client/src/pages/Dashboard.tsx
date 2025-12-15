import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Loader2, FileDown, Brain, History } from "lucide-react";
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
import { AdPlaceholder } from "@/components/AdPlaceholder";
import { SmartStrategyPlanner } from "@/components/SmartStrategyPlanner";
import { useLocation } from "wouter";
import { useProStatus, canCreateSemester } from "@/hooks/useProStatus";
import { 
  calculateDegreeGpa, 
  calculateYearGpa, 
  calculateSemesterGpa,
  getSemesterDisplayName 
} from "@/lib/gpaCalculations";
import { openPrintReport } from "@/components/PrintableReport";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SemesterWithCourses, User, CourseWithComponents } from "@shared/schema";

type FilterScope = "degree" | "year" | "semester";

export default function Dashboard() {
  const { toast } = useToast();
  const { isPro } = useProStatus();
  const [, navigate] = useLocation();
  const [currentFilter, setCurrentFilter] = useState<FilterScope>("degree");
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  
  const [isCreateSemesterOpen, setIsCreateSemesterOpen] = useState(false);
  const [semesterDialogMode, setSemesterDialogMode] = useState<"regular" | "completedYear">("regular");
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<"smart_strategy" | "analytics" | "export" | "feature">("feature");
  const [isSmartStrategyOpen, setIsSmartStrategyOpen] = useState(false);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<CourseWithComponents | null>(null);
  const [localGrades, setLocalGrades] = useState<Record<string, number>>({});
  const pendingGradeUpdates = useRef<Set<string>>(new Set());
  const scoreDebounceTimer = useRef<number | null>(null);

  const { data: semesters = [], isLoading } = useQuery<SemesterWithCourses[]>({
    queryKey: ["/api/semesters"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/profile"],
  });

  // Merge server semesters with local slider edits for instant feedback
  const effectiveSemesters = useMemo(() => {
    return semesters.map((semester) => ({
      ...semester,
      courses: semester.courses.map((course) => ({
        ...course,
        gradeComponents: course.gradeComponents.map((component) => ({
          ...component,
          score: localGrades[component.id] ?? component.score ?? null,
        })),
      })),
    }));
  }, [semesters, localGrades]);

  const handleExportPdf = useCallback(() => {
    if (semesters.length === 0) {
      toast({
        title: "אין נתונים לייצוא",
        description: "הוסף סמסטרים וקורסים לפני ייצוא הדוח",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "מכין את הדוח...",
      description: "חלון הדפסה נפתח - שמור כ-PDF",
    });
    openPrintReport(effectiveSemesters, user);
  }, [semesters.length, effectiveSemesters, user, toast]);

  const sortedSemesters = useMemo(() => {
    return [...effectiveSemesters].sort((a, b) => {
      if (a.academicYear !== b.academicYear) {
        return a.academicYear - b.academicYear;
      }
      const termOrder = { A: 1, B: 2, Summer: 3 };
      return termOrder[a.term] - termOrder[b.term];
    });
  }, [effectiveSemesters]);

  const degreeGpa = useMemo(
    () => calculateDegreeGpa(
      effectiveSemesters,
      user?.legacyCredits || 0,
      user?.legacyGpa || 0
    ),
    [effectiveSemesters, user?.legacyCredits, user?.legacyGpa]
  );

  const yearGpa = useMemo(
    () => calculateYearGpa(effectiveSemesters, selectedYear),
    [effectiveSemesters, selectedYear]
  );

  const semesterGpa = useMemo(() => {
    const semester = effectiveSemesters.find((s) => s.id === selectedSemesterId);
    return semester ? calculateSemesterGpa(semester.courses) : null;
  }, [effectiveSemesters, selectedSemesterId]);

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
    // Instant, synchronous UI update: only touch local state
    setLocalGrades((prev) => ({
      ...prev,
      [componentId]: score,
    }));
    pendingGradeUpdates.current.add(componentId);
  }, []);

  const handleComponentScoreCommit = useCallback((componentId: string, score: number) => {
    // Ensure local state reflects the final drag position
    setLocalGrades((prev) => ({
      ...prev,
      [componentId]: score,
    }));
    // Save immediately on drag end (in addition to the debounce safety net)
    updateScoreMutation.mutate({ componentId, score });
  }, [updateScoreMutation]);

  // Background saver: debounce writes so UI never waits on the network
  useEffect(() => {
    if (pendingGradeUpdates.current.size === 0) return;

    if (scoreDebounceTimer.current) {
      clearTimeout(scoreDebounceTimer.current);
    }

    scoreDebounceTimer.current = window.setTimeout(() => {
      const toSave = Array.from(pendingGradeUpdates.current);
      pendingGradeUpdates.current.clear();
      scoreDebounceTimer.current = null;

      toSave.forEach((componentId) => {
        const score = localGrades[componentId];
        if (score !== undefined) {
          updateScoreMutation.mutate({ componentId, score });
        }
      });
    }, 500);

    return () => {
      if (scoreDebounceTimer.current) {
        clearTimeout(scoreDebounceTimer.current);
        scoreDebounceTimer.current = null;
      }
    };
  }, [localGrades, updateScoreMutation]);

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
      setSemesterDialogMode("regular");
      setIsCreateSemesterOpen(true);
    } else {
      setPaywallTrigger("feature");
      setIsPaywallOpen(true);
    }
  }, [semesters.length, isPro]);

  const handleAddCompletedYearClick = useCallback(() => {
    if (canCreateSemester(semesters.length, isPro)) {
      setSemesterDialogMode("completedYear");
      setIsCreateSemesterOpen(true);
    } else {
      setPaywallTrigger("feature");
      setIsPaywallOpen(true);
    }
  }, [semesters.length, isPro]);

  const handleSmartStrategyClick = useCallback(() => {
    if (!isPro) {
      setPaywallTrigger("smart_strategy");
      setIsPaywallOpen(true);
      return;
    }
    setIsSmartStrategyOpen(true);
  }, [isPro]);

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
      <div className="min-h-screen bg-background pb-32">
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
    <div className="min-h-screen bg-background pb-32">
      <div className="fixed top-4 start-4 z-50 flex gap-2">
        <ThemeToggle />
        <Button
          variant="ghost"
          onClick={() => navigate("/about")}
        >
          אודות
        </Button>
        <Button
          size="icon"
          variant={isPro ? "default" : "ghost"}
          onClick={handleSmartStrategyClick}
          data-testid="button-smart-strategy"
          title="אסטרטגיית לימוד חכמה"
          className={isPro ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" : ""}
        >
          <Brain className="w-5 h-5" />
        </Button>
        {isPro && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleExportPdf}
            data-testid="button-export-pdf"
            title="ייצוא דוח ציונים"
          >
            <FileDown className="w-5 h-5" />
          </Button>
        )}
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
        semesters={effectiveSemesters}
        legacyCredits={user?.legacyCredits || 0}
        legacyGpa={user?.legacyGpa || 0}
      />

      <div className="py-3">
        <AdPlaceholder variant="large-banner" testId="ad-inline-dashboard" />
      </div>

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
            <div className="flex flex-col gap-3 items-center">
              <Button
                onClick={handleAddSemesterClick}
                data-testid="button-add-first-semester"
                className="min-w-[200px]"
              >
                <Plus className="w-4 h-4 ms-2" />
                הוסף סמסטר ראשון
              </Button>
              <Button
                variant="outline"
                onClick={handleAddCompletedYearClick}
                data-testid="button-add-completed-year-empty"
                className="min-w-[200px] border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
              >
                <History className="w-4 h-4 ms-2" />
                הוסף שנה שהסתיימה
              </Button>
            </div>
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
                onComponentScoreCommit={handleComponentScoreCommit}
              />
            ))}

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleAddSemesterClick}
                data-testid="button-add-semester"
              >
                <Plus className="w-4 h-4 ms-2" />
                הוסף סמסטר
              </Button>
              <Button
                variant="outline"
                onClick={handleAddCompletedYearClick}
                data-testid="button-add-completed-year"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
              >
                <History className="w-4 h-4 ms-2" />
                הוסף שנה שהסתיימה
              </Button>
            </div>
          </>
        )}
      </main>

      <BottomNavigation />

      <CreateSemesterDialog
        open={isCreateSemesterOpen}
        onOpenChange={setIsCreateSemesterOpen}
        onSubmit={(data) => createSemesterMutation.mutate(data)}
        isPending={createSemesterMutation.isPending}
        mode={semesterDialogMode}
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
        trigger={paywallTrigger}
      />

      <SmartStrategyPlanner
        open={isSmartStrategyOpen}
        onOpenChange={setIsSmartStrategyOpen}
        semesters={effectiveSemesters}
        user={user}
      />
    </div>
  );
}
