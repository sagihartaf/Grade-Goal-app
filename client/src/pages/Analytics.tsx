import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { calculateSemesterGpa, calculateDegreeGpa, calculateCourseGrade } from "@/lib/gpaCalculations";
import type { SemesterWithCourses } from "@shared/schema";
import { TrendingUp, BarChart3, PieChartIcon, Target } from "lucide-react";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Analytics() {
  const { data: semesters = [], isLoading } = useQuery<SemesterWithCourses[]>({
    queryKey: ["/api/semesters"],
  });

  const sortedSemesters = useMemo(() => {
    return [...semesters].sort((a, b) => {
      if (a.academicYear !== b.academicYear) {
        return a.academicYear - b.academicYear;
      }
      const termOrder = { A: 1, B: 2, Summer: 3 };
      return termOrder[a.term] - termOrder[b.term];
    });
  }, [semesters]);

  const gpaTrendData = useMemo(() => {
    let cumulativeCredits = 0;
    let cumulativeWeightedSum = 0;
    
    return sortedSemesters.map((semester) => {
      const semesterGpa = calculateSemesterGpa(semester.courses);
      const semesterCredits = semester.courses.reduce((sum, c) => sum + c.credits, 0);
      
      if (semesterGpa !== null) {
        cumulativeWeightedSum += semesterGpa * semesterCredits;
        cumulativeCredits += semesterCredits;
      }
      
      const cumulativeGpa = cumulativeCredits > 0 ? cumulativeWeightedSum / cumulativeCredits : null;
      
      return {
        name: semester.name.replace("סמסטר ", ""),
        semesterGpa: semesterGpa !== null ? Math.round(semesterGpa * 10) / 10 : null,
        cumulativeGpa: cumulativeGpa !== null ? Math.round(cumulativeGpa * 10) / 10 : null,
        credits: semesterCredits,
      };
    });
  }, [sortedSemesters]);

  const semesterComparisonData = useMemo(() => {
    return sortedSemesters.map((semester) => {
      const gpa = calculateSemesterGpa(semester.courses);
      const totalCredits = semester.courses.reduce((sum, c) => sum + c.credits, 0);
      return {
        name: semester.name.replace("סמסטר ", "").replace("שנה ", "ש"),
        gpa: gpa !== null ? Math.round(gpa * 10) / 10 : 0,
        credits: totalCredits,
        courses: semester.courses.length,
      };
    });
  }, [sortedSemesters]);

  const gradeDistributionData = useMemo(() => {
    const distribution = {
      "90-100": 0,
      "80-89": 0,
      "70-79": 0,
      "60-69": 0,
      "56-59": 0,
      "0-55": 0,
    };

    semesters.forEach((semester) => {
      semester.courses.forEach((course) => {
        const grade = calculateCourseGrade(course.gradeComponents);
        if (grade !== null) {
          if (grade >= 90) distribution["90-100"]++;
          else if (grade >= 80) distribution["80-89"]++;
          else if (grade >= 70) distribution["70-79"]++;
          else if (grade >= 60) distribution["60-69"]++;
          else if (grade >= 56) distribution["56-59"]++;
          else distribution["0-55"]++;
        }
      });
    });

    return Object.entries(distribution)
      .filter(([, count]) => count > 0)
      .map(([range, count]) => ({
        name: range,
        value: count,
      }));
  }, [semesters]);

  const targetProgressData = useMemo(() => {
    const coursesWithTargets: { name: string; current: number; target: number }[] = [];
    
    semesters.forEach((semester) => {
      semester.courses.forEach((course) => {
        if (course.targetGrade !== null) {
          const current = calculateCourseGrade(course.gradeComponents);
          coursesWithTargets.push({
            name: course.name.length > 15 ? course.name.substring(0, 15) + "..." : course.name,
            current: current !== null ? Math.round(current * 10) / 10 : 0,
            target: course.targetGrade,
          });
        }
      });
    });
    
    return coursesWithTargets.slice(0, 6);
  }, [semesters]);

  const overallStats = useMemo(() => {
    const degreeGpa = calculateDegreeGpa(semesters);
    const totalCourses = semesters.reduce((sum, s) => sum + s.courses.length, 0);
    const totalCredits = semesters.reduce((sum, s) => 
      sum + s.courses.reduce((cSum, c) => cSum + c.credits, 0), 0);
    const coursesWithTargets = semesters.reduce((sum, s) => 
      sum + s.courses.filter(c => c.targetGrade !== null).length, 0);
    
    return {
      degreeGpa: degreeGpa !== null ? Math.round(degreeGpa * 10) / 10 : null,
      totalCourses,
      totalCredits,
      coursesWithTargets,
      semesters: semesters.length,
    };
  }, [semesters]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const hasData = semesters.length > 0 && semesters.some(s => s.courses.length > 0);

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <div className="fixed top-4 start-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6" data-testid="heading-analytics">אנליטיקה</h1>

        {!hasData ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">אין נתונים עדיין</h2>
            <p className="text-muted-foreground">
              הוסף קורסים עם ציונים כדי לראות את האנליטיקה שלך
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card data-testid="stat-gpa">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">ממוצע תואר</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {overallStats.degreeGpa ?? "—"}
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="stat-semesters">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">סמסטרים</p>
                  <p className="text-2xl font-bold tabular-nums">{overallStats.semesters}</p>
                </CardContent>
              </Card>
              <Card data-testid="stat-courses">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">קורסים</p>
                  <p className="text-2xl font-bold tabular-nums">{overallStats.totalCourses}</p>
                </CardContent>
              </Card>
              <Card data-testid="stat-credits">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">נקודות זכות</p>
                  <p className="text-2xl font-bold tabular-nums">{overallStats.totalCredits}</p>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="chart-gpa-trend">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">מגמת ממוצע לאורך זמן</CardTitle>
              </CardHeader>
              <CardContent>
                {gpaTrendData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={gpaTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        className="fill-muted-foreground"
                      />
                      <YAxis 
                        domain={[50, 100]} 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        className="fill-muted-foreground"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="semesterGpa" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        name="ממוצע סמסטריאלי"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeGpa" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: 'hsl(var(--chart-2))' }}
                        name="ממוצע מצטבר"
                      />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    נדרשים לפחות 2 סמסטרים עם ציונים לתצוגת מגמה
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card data-testid="chart-semester-comparison">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">השוואת סמסטרים</CardTitle>
                </CardHeader>
                <CardContent>
                  {semesterComparisonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={semesterComparisonData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          className="fill-muted-foreground"
                        />
                        <YAxis 
                          domain={[50, 100]} 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          className="fill-muted-foreground"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="gpa" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="ממוצע" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">אין נתונים</p>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="chart-grade-distribution">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">התפלגות ציונים</CardTitle>
                </CardHeader>
                <CardContent>
                  {gradeDistributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={gradeDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {gradeDistributionData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">אין נתונים</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {targetProgressData.length > 0 && (
              <Card data-testid="chart-target-progress">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <Target className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">התקדמות ליעדים</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={targetProgressData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        type="number" 
                        domain={[0, 100]} 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        className="fill-muted-foreground"
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                        className="fill-muted-foreground"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="current" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="ציון נוכחי" />
                      <Bar dataKey="target" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="יעד" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
