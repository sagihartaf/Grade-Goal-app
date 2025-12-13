import type { CourseWithComponents } from "@shared/schema";

// Minimum passing grade - students must pass every course
const MIN_PASS_GRADE = 60;

interface StrategyInput {
  currentGPA: number | null;
  totalCreditsSoFar: number;
  targetGPA: number;
  futureCourses: CourseWithComponents[];
  completedCourses: CourseWithComponents[]; // For adaptive learning
  maxRealisticGrade: number;
}

interface StrategyResult {
  success: boolean;
  message: string;
  recommendations: Array<{
    courseId: string;
    courseName: string;
    credits: number;
    difficulty: "easy" | "medium" | "hard";
    suggestedGrade: number;
  }>;
}

/**
 * Helper: Calculate the final grade for a course based on its components
 */
function calculateCourseGrade(course: CourseWithComponents): number | null {
  const components = course.gradeComponents;
  
  // Check if all components have scores
  const allScored = components.every(c => c.score !== null);
  if (!allScored) return null;
  
  // Calculate weighted average
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const component of components) {
    if (component.score !== null) {
      totalWeightedScore += component.score * component.weight;
      totalWeight += component.weight;
    }
  }
  
  if (totalWeight === 0) return null;
  return totalWeightedScore / totalWeight;
}

/**
 * Helper: Analyze historical performance by difficulty level
 */
interface DifficultyStats {
  easy: { avg: number; count: number } | null;
  medium: { avg: number; count: number } | null;
  hard: { avg: number; count: number } | null;
  overallAvg: number;
}

function analyzeHistoricalPerformance(completedCourses: CourseWithComponents[]): DifficultyStats {
  const stats: DifficultyStats = {
    easy: null,
    medium: null,
    hard: null,
    overallAvg: 0,
  };
  
  // Calculate grades for each completed course
  const coursesWithGrades = completedCourses
    .map(course => ({
      difficulty: (course.difficulty || "medium") as "easy" | "medium" | "hard",
      grade: calculateCourseGrade(course),
      credits: course.credits,
    }))
    .filter(c => c.grade !== null) as Array<{
      difficulty: "easy" | "medium" | "hard";
      grade: number;
      credits: number;
    }>;
  
  if (coursesWithGrades.length === 0) {
    return stats;
  }
  
  // Calculate overall weighted average
  const totalWeightedGrades = coursesWithGrades.reduce(
    (sum, c) => sum + c.grade * c.credits,
    0
  );
  const totalCredits = coursesWithGrades.reduce((sum, c) => sum + c.credits, 0);
  stats.overallAvg = totalWeightedGrades / totalCredits;
  
  // Calculate averages by difficulty
  for (const difficulty of ["easy", "medium", "hard"] as const) {
    const coursesInDifficulty = coursesWithGrades.filter(c => c.difficulty === difficulty);
    
    if (coursesInDifficulty.length > 0) {
      const weightedSum = coursesInDifficulty.reduce(
        (sum, c) => sum + c.grade * c.credits,
        0
      );
      const credits = coursesInDifficulty.reduce((sum, c) => sum + c.credits, 0);
      
      stats[difficulty] = {
        avg: weightedSum / credits,
        count: coursesInDifficulty.length,
      };
    }
  }
  
  return stats;
}

/**
 * Helper: Calculate personal bias for each difficulty level
 */
function calculatePersonalBias(
  difficulty: "easy" | "medium" | "hard",
  stats: DifficultyStats
): number {
  // Default biases (fallback if no history)
  const defaultBias = {
    easy: 2,
    medium: 0,
    hard: -2,
  };
  
  // If no history for this difficulty, use default
  if (!stats[difficulty]) {
    return defaultBias[difficulty];
  }
  
  // Calculate personal bias: how much better/worse this difficulty is vs overall
  const personalBias = stats[difficulty]!.avg - stats.overallAvg;
  
  // Clamp to reasonable bounds (±10 points max)
  const MAX_BIAS = 10;
  const clampedBias = Math.max(-MAX_BIAS, Math.min(MAX_BIAS, personalBias));
  
  return clampedBias;
}

/**
 * Smart Strategy Algorithm: Adaptive Weighted Spread
 * 
 * This algorithm creates a personalized, balanced study plan by learning
 * from your historical performance in courses of different difficulty levels.
 * 
 * The adaptive approach:
 * 1. Analyze your past grades by difficulty (Easy/Medium/Hard)
 * 2. Calculate the required average across all future courses
 * 3. Apply YOUR personal difficulty bias (not generic)
 * 4. Clamp to realistic bounds [MIN_PASS_GRADE, maxRealisticGrade]
 * 5. Re-balance if some courses hit caps
 * 
 * Example: If you historically score 95 on Easy but 88 on Hard:
 * - Required Avg: 92 → Easy: 97, Medium: 92, Hard: 86
 */
export function calculateSmartStrategy(input: StrategyInput): StrategyResult {
  const { currentGPA, totalCreditsSoFar, targetGPA, futureCourses, completedCourses, maxRealisticGrade } = input;

  // Validation
  if (targetGPA < 0 || targetGPA > 100) {
    return {
      success: false,
      message: "ציון היעד חייב להיות בין 0 ל-100",
      recommendations: [],
    };
  }

  if (maxRealisticGrade < 0 || maxRealisticGrade > 100) {
    return {
      success: false,
      message: "ציון מקסימלי ריאלי חייב להיות בין 0 ל-100",
      recommendations: [],
    };
  }

  if (maxRealisticGrade < MIN_PASS_GRADE) {
    return {
      success: false,
      message: `הציון המקסימלי הריאלי חייב להיות לפחות ${MIN_PASS_GRADE}`,
      recommendations: [],
    };
  }

  if (futureCourses.length === 0) {
    return {
      success: false,
      message: "אין קורסים עתידיים לתכנון",
      recommendations: [],
    };
  }

  // Calculate total future credits
  const futureCredits = futureCourses.reduce((sum, course) => sum + course.credits, 0);
  
  if (futureCredits === 0) {
    return {
      success: false,
      message: "נקודות הזכות של הקורסים העתידיים חייבות להיות גדולות מ-0",
      recommendations: [],
    };
  }

  // Step 1: Calculate Required Future Average
  const totalCredits = totalCreditsSoFar + futureCredits;
  const requiredTotalPoints = targetGPA * totalCredits;
  const currentPoints = (currentGPA || 0) * totalCreditsSoFar;
  const neededFuturePoints = requiredTotalPoints - currentPoints;
  const requiredFutureAverage = neededFuturePoints / futureCredits;

  // Check if target is achievable with max realistic grade
  const maxPossiblePoints = maxRealisticGrade * futureCredits;
  if (neededFuturePoints > maxPossiblePoints) {
    return {
      success: false,
      message: `היעד של ${targetGPA.toFixed(1)} לא ניתן להשגה. צריך ממוצע של ${requiredFutureAverage.toFixed(1)} בקורסים העתידיים, אך הציון המקסימלי הריאלי הוא ${maxRealisticGrade}. נסה להוריד את היעד או להגדיל את הציון המקסימלי.`,
      recommendations: futureCourses.map(course => ({
        courseId: course.id,
        courseName: course.name,
        credits: course.credits,
        difficulty: (course.difficulty || "medium") as "easy" | "medium" | "hard",
        suggestedGrade: maxRealisticGrade,
      })),
    };
  }

  // Check if target requires grades below passing
  if (requiredFutureAverage < MIN_PASS_GRADE) {
    return {
      success: false,
      message: `הממוצע הנוכחי שלך כבר גבוה מהיעד! אתה צריך רק ממוצע של ${requiredFutureAverage.toFixed(1)} בקורסים העתידיים.`,
      recommendations: futureCourses.map(course => ({
        courseId: course.id,
        courseName: course.name,
        credits: course.credits,
        difficulty: (course.difficulty || "medium") as "easy" | "medium" | "hard",
        suggestedGrade: MIN_PASS_GRADE,
      })),
    };
  }

  // Step 2: Analyze Historical Performance & Calculate Personal Bias
  const historicalStats = analyzeHistoricalPerformance(completedCourses);
  
  // Create initial recommendations with PERSONALIZED difficulty bias
  const recommendations = futureCourses.map(course => {
    const difficulty = (course.difficulty || "medium") as "easy" | "medium" | "hard";
    
    // Use personal bias learned from history (or fallback to default)
    const personalBias = calculatePersonalBias(difficulty, historicalStats);
    
    const initialTarget = requiredFutureAverage + personalBias;

    // Clamp to valid range
    const clampedGrade = Math.max(MIN_PASS_GRADE, Math.min(maxRealisticGrade, initialTarget));

    return {
      courseId: course.id,
      courseName: course.name,
      credits: course.credits,
      difficulty,
      suggestedGrade: Math.round(clampedGrade),
    };
  });

  // Step 3: Re-Balancing Loop
  // Calculate current total points with initial spread
  let currentTotalPoints = recommendations.reduce(
    (sum, rec) => sum + rec.suggestedGrade * rec.credits,
    0
  );

  let gap = neededFuturePoints - currentTotalPoints;
  const tolerance = 0.5; // Allow small rounding differences

  // Iteratively adjust grades to meet the target
  let iterations = 0;
  const maxIterations = 100;

  while (Math.abs(gap) > tolerance && iterations < maxIterations) {
    iterations++;

    if (gap > 0) {
      // Need more points - prioritize Easy -> Medium -> Hard
      const sortedRecs = [...recommendations].sort((a, b) => {
        const diffOrder = { easy: 1, medium: 2, hard: 3 };
        return diffOrder[a.difficulty] - diffOrder[b.difficulty];
      });

      let distributed = false;
      for (const rec of sortedRecs) {
        if (rec.suggestedGrade < maxRealisticGrade) {
          const canAdd = (maxRealisticGrade - rec.suggestedGrade) * rec.credits;
          const toAdd = Math.min(1, Math.ceil(gap / rec.credits));
          
          if (rec.suggestedGrade + toAdd <= maxRealisticGrade) {
            rec.suggestedGrade += toAdd;
            gap -= toAdd * rec.credits;
            distributed = true;
            break;
          }
        }
      }

      if (!distributed) break; // Can't add more points
    } else {
      // Have too many points - prioritize removing from Hard -> Medium -> Easy
      const sortedRecs = [...recommendations].sort((a, b) => {
        const diffOrder = { easy: 3, medium: 2, hard: 1 };
        return diffOrder[a.difficulty] - diffOrder[b.difficulty];
      });

      let distributed = false;
      for (const rec of sortedRecs) {
        if (rec.suggestedGrade > MIN_PASS_GRADE) {
          const canRemove = (rec.suggestedGrade - MIN_PASS_GRADE) * rec.credits;
          const toRemove = Math.min(1, Math.ceil(Math.abs(gap) / rec.credits));
          
          if (rec.suggestedGrade - toRemove >= MIN_PASS_GRADE) {
            rec.suggestedGrade -= toRemove;
            gap += toRemove * rec.credits;
            distributed = true;
            break;
          }
        }
      }

      if (!distributed) break; // Can't remove more points
    }

    // Recalculate current total
    currentTotalPoints = recommendations.reduce(
      (sum, rec) => sum + rec.suggestedGrade * rec.credits,
      0
    );
    gap = neededFuturePoints - currentTotalPoints;
  }

  // Calculate final achieved GPA
  const finalTotalPoints = currentPoints + currentTotalPoints;
  const achievedGPA = finalTotalPoints / totalCredits;

  return {
    success: true,
    message: `אסטרטגיה מאוזנת! ממוצע צפוי: ${achievedGPA.toFixed(2)} | נדרש: ${requiredFutureAverage.toFixed(1)} בממוצע בקורסים העתידיים`,
    recommendations,
  };
}

/**
 * Helper: Check if a course has any grades entered
 */
export function hasCourseStarted(course: CourseWithComponents): boolean {
  return course.gradeComponents.some(component => component.score !== null);
}

/**
 * Helper: Check if a course is completed (all components have grades)
 */
export function isCourseCompleted(course: CourseWithComponents): boolean {
  return course.gradeComponents.length > 0 && 
         course.gradeComponents.every(component => component.score !== null);
}

/**
 * Helper: Get future courses (courses without any grades)
 */
export function getFutureCourses(courses: CourseWithComponents[]): CourseWithComponents[] {
  return courses.filter(course => !hasCourseStarted(course));
}

/**
 * Helper: Get completed courses (all components have grades)
 */
export function getCompletedCourses(courses: CourseWithComponents[]): CourseWithComponents[] {
  return courses.filter(course => isCourseCompleted(course));
}

