import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertCircle, Crown, Brain } from "lucide-react";
import { calculateSmartStrategy, getFutureCourses, getCompletedCourses } from "@/lib/smartStrategy";
import { calculateDegreeGpa } from "@/lib/gpaCalculations";
import type { SemesterWithCourses, CourseWithComponents, User } from "@shared/schema";
import { cn } from "@/lib/utils";

interface SmartStrategyPlannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesters: SemesterWithCourses[];
  user?: User | null;
}

export function SmartStrategyPlanner({
  open,
  onOpenChange,
  semesters,
  user,
}: SmartStrategyPlannerProps) {
  const [targetGPA, setTargetGPA] = useState<number>(90);
  const [maxRealisticGrade, setMaxRealisticGrade] = useState<number>(97);
  const [strategyResult, setStrategyResult] = useState<any>(null);

  // Extract global legacy data (backward compatibility)
  const globalLegacyCredits = user?.legacyCredits || 0;
  const globalLegacyGpa = user?.legacyGpa || 0;

  // Calculate per-semester legacy data
  const perSemesterLegacyCredits = semesters.reduce((sum, sem) => sum + (sem.legacyCredits || 0), 0);
  
  // Calculate current stats (including ALL legacy data: global + per-semester)
  const currentGPA = calculateDegreeGpa(semesters, globalLegacyCredits, globalLegacyGpa);
  
  const allCourses = semesters.flatMap(semester => semester.courses);
  const futureCourses = getFutureCourses(allCourses);
  const completedCourses = getCompletedCourses(allCourses);
  
  const actualCompletedCredits = allCourses
    .filter(course => course.gradeComponents.some(c => c.score !== null))
    .reduce((sum, course) => sum + course.credits, 0);
  
  const completedCredits = globalLegacyCredits + perSemesterLegacyCredits + actualCompletedCredits;

  const difficultyColors = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700",
    hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700",
  };

  const difficultyEmojis = {
    easy: "🟢",
    medium: "🟡",
    hard: "🔴",
  };

  const handleGenerateStrategy = () => {
    const result = calculateSmartStrategy({
      currentGPA,
      totalCreditsSoFar: completedCredits,
      targetGPA,
      futureCourses,
      completedCourses, // Pass completed courses for adaptive learning
      maxRealisticGrade,
    });

    setStrategyResult(result);
  };

  const handleReset = () => {
    setStrategyResult(null);
    setTargetGPA(90);
    setMaxRealisticGrade(97);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-amber-500" />
              אסטרטגיית לימוד חכמה
              {isPro && <Crown className="w-4 h-4 text-amber-500" />}
            </DialogTitle>
            <DialogDescription>
              תוכנית מותאמת אישית המבוססת על הביצועים ההיסטוריים שלך - האלגוריתם לומד מהציונים הקודמים שלך ומתאים את ההמלצות
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Stats */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">ממוצע נוכחי</p>
                  <p className="text-lg font-bold tabular-nums">
                    {currentGPA !== null ? currentGPA.toFixed(2) : "—"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">נ״ז שהושלמו</p>
                  <p className="text-lg font-bold tabular-nums">{completedCredits}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">קורסים עתידיים</p>
                  <p className="text-lg font-bold tabular-nums">{futureCourses.length}</p>
                </div>
              </div>
              
              {completedCourses.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <Brain className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-900 dark:text-amber-100">
                    האלגוריתם למד מ-{completedCourses.length} קורסים שסיימת ומתאים את ההמלצות לפי הביצועים שלך
                  </p>
                </div>
              )}
            </div>

            {futureCourses.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  אין קורסים עתידיים (ללא ציונים) במערכת
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  הוסף קורסים חדשים ללא ציונים כדי לקבל אסטרטגיה
                </p>
              </div>
            ) : !strategyResult ? (
              <>
                {/* Input Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-gpa">ממוצע יעד</Label>
                    <Input
                      id="target-gpa"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={targetGPA}
                      onChange={(e) => setTargetGPA(parseFloat(e.target.value) || 0)}
                      placeholder="90"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-grade">
                      ציון מקסימלי ריאלי
                      <span className="text-xs text-muted-foreground ms-2">
                        (התקרה שלך - הציון הגבוה ביותר שאתה מסוגל להשיג)
                      </span>
                    </Label>
                    <Input
                      id="max-grade"
                      type="number"
                      min="0"
                      max="100"
                      value={maxRealisticGrade}
                      onChange={(e) => setMaxRealisticGrade(parseInt(e.target.value) || 0)}
                      placeholder="97"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateStrategy}
                  className="w-full"
                  size="lg"
                >
                  <>
                    <Sparkles className="w-4 h-4 ms-2" />
                    צור אסטרטגיה
                  </>
                </Button>
              </>
            ) : (
              <>
                {/* Results Section */}
                <div className="space-y-4">
                  {/* Status Message */}
                  <div
                    className={cn(
                      "p-4 rounded-lg border",
                      strategyResult.success
                        ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                        : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {strategyResult.success ? (
                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p
                          className={cn(
                            "font-medium",
                            strategyResult.success
                              ? "text-green-900 dark:text-green-100"
                              : "text-red-900 dark:text-red-100"
                          )}
                        >
                          {strategyResult.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations List */}
                  {strategyResult.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <Label>תוכנית לימוד מאוזנת - ציונים מומלצים לפי קורס</Label>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {strategyResult.recommendations.map((rec: any, index: number) => (
                          <div
                            key={rec.courseId}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                          >
                            <span className="text-lg">{index + 1}</span>
                            
                            <Badge
                              variant="outline"
                              className={cn("shrink-0", difficultyColors[rec.difficulty])}
                            >
                              {difficultyEmojis[rec.difficulty]} {rec.difficulty === "easy" ? "קל" : rec.difficulty === "medium" ? "בינוני" : "קשה"}
                            </Badge>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{rec.courseName}</p>
                              <p className="text-xs text-muted-foreground">
                                {rec.credits} נ״ז
                              </p>
                            </div>

                            <div className="text-end shrink-0">
                              <p className="text-2xl font-bold tabular-nums">
                                {rec.suggestedGrade}
                              </p>
                              <p className="text-xs text-muted-foreground">ציון מומלץ</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="flex-1"
                    >
                      נסה שוב
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => onOpenChange(false)}
                      className="flex-1"
                    >
                      סגור
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

