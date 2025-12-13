import type { CourseWithComponents, SemesterWithCourses, GradeComponent } from "@shared/schema";

export interface CourseGradeResult {
  grade: number | null;
  magenDropped: boolean;
}

// Calculate course grade with Magen algorithm and return whether Magen was dropped
export function calculateCourseGradeWithMagenInfo(components: GradeComponent[]): CourseGradeResult {
  if (components.length === 0) return { grade: null, magenDropped: false };
  
  // Check if all components have scores
  const hasAllScores = components.every((c) => c.score !== null && c.score !== undefined);
  if (!hasAllScores) return { grade: null, magenDropped: false };

  // Find magen components and final exam
  const magenComponents = components.filter((c) => c.isMagen);
  const nonMagenComponents = components.filter((c) => !c.isMagen);
  const finalExamComponent = nonMagenComponents.find(
    (c) => c.name.includes("מבחן") || c.name.includes("בחינה") || c.name.toLowerCase().includes("exam") || c.name.toLowerCase().includes("final")
  );

  // Calculation A: Include all components with their weights
  const totalWeightA = components.reduce((sum, c) => sum + c.weight, 0);
  const gradeA = totalWeightA > 0
    ? components.reduce((sum, c) => sum + ((c.score ?? 0) * c.weight), 0) / totalWeightA
    : 0;

  // If no magen components, return regular calculation
  if (magenComponents.length === 0) {
    return { grade: gradeA, magenDropped: false };
  }

  // Calculation B: Exclude magen components, transfer weight to final exam
  const magenTotalWeight = magenComponents.reduce((sum, c) => sum + c.weight, 0);
  
  // If no final exam, just use calculation A
  if (!finalExamComponent) {
    return { grade: gradeA, magenDropped: false };
  }

  // Calculate grade without magen, with increased final exam weight
  const adjustedComponents = nonMagenComponents.map((c) => {
    if (c.id === finalExamComponent.id) {
      return { ...c, weight: c.weight + magenTotalWeight };
    }
    return c;
  });

  const totalWeightB = adjustedComponents.reduce((sum, c) => sum + c.weight, 0);
  const gradeB = totalWeightB > 0
    ? adjustedComponents.reduce((sum, c) => sum + ((c.score ?? 0) * c.weight), 0) / totalWeightB
    : 0;

  // Return the MAX of both calculations (Magen algorithm)
  const magenDropped = gradeB > gradeA;
  return { grade: Math.max(gradeA, gradeB), magenDropped };
}

// Calculate course grade with Magen algorithm (legacy wrapper for backwards compatibility)
export function calculateCourseGrade(components: GradeComponent[]): number | null {
  return calculateCourseGradeWithMagenInfo(components).grade;
}

// Calculate semester GPA (standard - no legacy data)
export function calculateSemesterGpa(courses: CourseWithComponents[]): number | null {
  const gradedCourses = courses.filter((course) => {
    const grade = calculateCourseGrade(course.gradeComponents);
    return grade !== null;
  });

  if (gradedCourses.length === 0) return null;

  const totalCredits = gradedCourses.reduce((sum, c) => sum + c.credits, 0);
  const weightedSum = gradedCourses.reduce((sum, course) => {
    const grade = calculateCourseGrade(course.gradeComponents) ?? 0;
    return sum + grade * course.credits;
  }, 0);

  return totalCredits > 0 ? weightedSum / totalCredits : null;
}

// Calculate hybrid semester GPA (combines legacy bulk data + individual courses)
export function calculateHybridSemesterGpa(
  courses: CourseWithComponents[],
  legacyCredits: number = 0,
  legacyGpa: number = 0
): number | null {
  // Calculate GPA from individual courses
  const gradedCourses = courses.filter((course) => {
    const grade = calculateCourseGrade(course.gradeComponents);
    return grade !== null;
  });

  const actualCredits = gradedCourses.reduce((sum, c) => sum + c.credits, 0);
  const actualWeightedSum = gradedCourses.reduce((sum, course) => {
    const grade = calculateCourseGrade(course.gradeComponents) ?? 0;
    return sum + grade * course.credits;
  }, 0);

  // If no legacy data and no graded courses, return null
  if (legacyCredits === 0 && actualCredits === 0) return null;

  // If only legacy data exists
  if (legacyCredits > 0 && actualCredits === 0) {
    return legacyGpa;
  }

  // If only actual courses exist
  if (legacyCredits === 0 && actualCredits > 0) {
    return actualWeightedSum / actualCredits;
  }

  // Combine legacy data with actual courses (weighted average)
  const totalCredits = legacyCredits + actualCredits;
  const legacyWeightedSum = legacyGpa * legacyCredits;
  const totalWeightedSum = legacyWeightedSum + actualWeightedSum;

  return totalWeightedSum / totalCredits;
}

// Calculate overall degree GPA (with optional global legacy data for backward compatibility)
// New approach: Aggregates from per-semester hybrid GPAs
export function calculateDegreeGpa(
  semesters: SemesterWithCourses[],
  globalLegacyCredits: number = 0,
  globalLegacyGpa: number = 0
): number | null {
  let totalCredits = 0;
  let totalWeightedSum = 0;

  // Calculate contribution from each semester (including per-semester legacy data)
  for (const semester of semesters) {
    const semesterLegacyCredits = semester.legacyCredits || 0;
    const semesterLegacyGpa = semester.legacyGpa || 0;
    
    // Calculate hybrid GPA for this semester
    const hybridGpa = calculateHybridSemesterGpa(
      semester.courses,
      semesterLegacyCredits,
      semesterLegacyGpa
    );

    if (hybridGpa !== null) {
      // Get total credits for this semester (legacy + actual)
      const gradedCourses = semester.courses.filter(c => calculateCourseGrade(c.gradeComponents) !== null);
      const actualCredits = gradedCourses.reduce((sum, c) => sum + c.credits, 0);
      const semesterTotalCredits = semesterLegacyCredits + actualCredits;

      totalCredits += semesterTotalCredits;
      totalWeightedSum += hybridGpa * semesterTotalCredits;
    }
  }

  // Add global legacy data (for backward compatibility with old user data)
  if (globalLegacyCredits > 0) {
    totalCredits += globalLegacyCredits;
    totalWeightedSum += globalLegacyGpa * globalLegacyCredits;
  }

  return totalCredits > 0 ? totalWeightedSum / totalCredits : null;
}

// Calculate GPA for a specific year
export function calculateYearGpa(semesters: SemesterWithCourses[], year: number): number | null {
  const yearSemesters = semesters.filter((s) => s.academicYear === year);
  const allCourses = yearSemesters.flatMap((s) => s.courses);
  return calculateSemesterGpa(allCourses);
}

// Format GPA for display
export function formatGpa(gpa: number | null): string {
  if (gpa === null) return "—";
  return gpa.toFixed(2);
}

// Get Hebrew term name
export function getTermName(term: "A" | "B" | "Summer" | "Yearly"): string {
  const termNames: Record<string, string> = {
    A: "א׳",
    B: "ב׳",
    Summer: "קיץ",
    Yearly: "שנתי",
  };
  return termNames[term] || term;
}

// Generate semester display name
export function getSemesterDisplayName(academicYear: number, term: "A" | "B" | "Summer" | "Yearly"): string {
  if (term === "Yearly") {
    return `שנה ${academicYear}`;
  }
  return `שנה ${academicYear} - סמסטר ${getTermName(term)}`;
}
