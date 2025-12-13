import {
  users,
  semesters,
  courses,
  gradeComponents,
  type User,
  type UpsertUser,
  type Semester,
  type InsertSemester,
  type Course,
  type InsertCourse,
  type GradeComponent,
  type InsertGradeComponent,
  type SemesterWithCourses,
  type CourseWithComponents,
} from "./schemas.js";
import { db } from "./db.js";
import { eq } from "drizzle-orm";

export interface InstitutionStats {
  totalUsers: number;
  userRank: number;
  percentile: number;
  averageGpa: number;
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, data: Partial<User>): Promise<User | undefined>;
  updateUserStripeInfo(id: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionTier?: string }): Promise<User | undefined>;
  getInstitutionStats(userId: string, userGpa: number): Promise<InstitutionStats | null>;
  
  // Semester operations
  getSemestersByUserId(userId: string): Promise<SemesterWithCourses[]>;
  getSemester(id: string): Promise<Semester | undefined>;
  createSemester(userId: string, data: { academicYear: number; term: "A" | "B" | "Summer" }): Promise<Semester>;
  deleteSemester(id: string): Promise<void>;
  
  // Course operations
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(semesterId: string, data: InsertCourse, components: InsertGradeComponent[]): Promise<Course>;
  updateCourse(id: string, data: { name: string; credits: number; difficulty?: "easy" | "medium" | "hard" }, components: InsertGradeComponent[]): Promise<Course | undefined>;
  updateCourseTargetGrade(id: string, targetGrade: number | null): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<void>;
  
  // Grade component operations
  getGradeComponent(id: string): Promise<GradeComponent | undefined>;
  updateGradeComponentScore(id: string, score: number): Promise<GradeComponent | undefined>;
}

// Helper function for semester display name (duplicated here to avoid client import issues)
function getSemesterName(academicYear: number, term: "A" | "B" | "Summer"): string {
  const termNames: Record<string, string> = {
    A: "א׳",
    B: "ב׳",
    Summer: "קיץ",
  };
  return `שנה ${academicYear} - סמסטר ${termNames[term] || term}`;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeInfo(id: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionTier?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getInstitutionStats(userId: string, userGpa: number): Promise<InstitutionStats | null> {
    const currentUser = await this.getUser(userId);
    if (!currentUser?.academicInstitution) {
      return null;
    }

    const allUsers = await db.select().from(users);
    const institutionUsers = allUsers.filter(
      (u) => u.academicInstitution === currentUser.academicInstitution
    );

    if (institutionUsers.length < 2) {
      return null;
    }

    const userGpas: { id: string; gpa: number }[] = [];

    for (const user of institutionUsers) {
      const userSemesters = await this.getSemestersByUserId(user.id);
      
      let totalWeightedGpa = 0;
      let totalCredits = 0;

      for (const semester of userSemesters) {
        for (const course of semester.courses) {
          const components = course.gradeComponents;
          if (components.length === 0) continue;

          const allHaveScores = components.every((c) => c.score !== null);
          if (!allHaveScores) continue;

          let regularSum = 0;
          let regularWeight = 0;
          let nonMagenSum = 0;
          let nonMagenWeight = 0;

          for (const comp of components) {
            regularSum += (comp.score || 0) * comp.weight;
            regularWeight += comp.weight;
            if (!comp.isMagen) {
              nonMagenSum += (comp.score || 0) * comp.weight;
              nonMagenWeight += comp.weight;
            }
          }

          const regularGrade = regularWeight > 0 ? regularSum / regularWeight : 0;
          const nonMagenGrade = nonMagenWeight > 0 ? nonMagenSum / nonMagenWeight : regularGrade;
          const courseGrade = Math.max(regularGrade, nonMagenGrade);

          totalWeightedGpa += courseGrade * course.credits;
          totalCredits += course.credits;
        }
      }

      if (totalCredits > 0) {
        userGpas.push({ id: user.id, gpa: totalWeightedGpa / totalCredits });
      }
    }

    if (userGpas.length < 2) {
      return null;
    }

    userGpas.sort((a, b) => b.gpa - a.gpa);
    const userRank = userGpas.findIndex((u) => u.id === userId) + 1;
    const percentile = userRank > 0 
      ? Math.round(((userGpas.length - userRank) / (userGpas.length - 1)) * 100)
      : 0;
    const averageGpa = userGpas.reduce((sum, u) => sum + u.gpa, 0) / userGpas.length;

    return {
      totalUsers: userGpas.length,
      userRank: userRank > 0 ? userRank : userGpas.length,
      percentile,
      averageGpa: Math.round(averageGpa * 10) / 10,
    };
  }

  // Semester operations
  async getSemestersByUserId(userId: string): Promise<SemesterWithCourses[]> {
    const userSemesters = await db
      .select()
      .from(semesters)
      .where(eq(semesters.userId, userId));

    const result: SemesterWithCourses[] = [];

    for (const semester of userSemesters) {
      const semesterCourses = await db
        .select()
        .from(courses)
        .where(eq(courses.semesterId, semester.id));

      const coursesWithComponents: CourseWithComponents[] = [];

      for (const course of semesterCourses) {
        const components = await db
          .select()
          .from(gradeComponents)
          .where(eq(gradeComponents.courseId, course.id));

        coursesWithComponents.push({
          ...course,
          gradeComponents: components,
        });
      }

      result.push({
        ...semester,
        courses: coursesWithComponents,
      });
    }

    return result;
  }

  async getSemester(id: string): Promise<Semester | undefined> {
    const [semester] = await db.select().from(semesters).where(eq(semesters.id, id));
    return semester;
  }

  async createSemester(userId: string, data: { academicYear: number; term: "A" | "B" | "Summer" }): Promise<Semester> {
    const name = getSemesterName(data.academicYear, data.term);
    const [semester] = await db
      .insert(semesters)
      .values({
        academicYear: data.academicYear,
        term: data.term,
        userId,
        name,
      })
      .returning();
    return semester;
  }

  async deleteSemester(id: string): Promise<void> {
    await db.delete(semesters).where(eq(semesters.id, id));
  }

  // Course operations
  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async createCourse(
    semesterId: string,
    data: InsertCourse,
    components: InsertGradeComponent[]
  ): Promise<Course> {
    const [course] = await db
      .insert(courses)
      .values({
        ...data,
        semesterId,
      })
      .returning();

    // Create grade components
    for (const component of components) {
      await db.insert(gradeComponents).values({
        ...component,
        courseId: course.id,
      });
    }

    return course;
  }

  async updateCourse(
    id: string,
    data: { name: string; credits: number; difficulty?: "easy" | "medium" | "hard" },
    components: InsertGradeComponent[]
  ): Promise<Course | undefined> {
    // Update course info
    const updateData: any = { name: data.name, credits: data.credits };
    if (data.difficulty !== undefined) {
      updateData.difficulty = data.difficulty;
    }
    
    const [course] = await db
      .update(courses)
      .set(updateData)
      .where(eq(courses.id, id))
      .returning();
    
    if (!course) return undefined;

    // Delete existing components and create new ones
    await db.delete(gradeComponents).where(eq(gradeComponents.courseId, id));
    
    for (const component of components) {
      await db.insert(gradeComponents).values({
        ...component,
        courseId: id,
      });
    }

    return course;
  }

  async updateCourseTargetGrade(id: string, targetGrade: number | null): Promise<Course | undefined> {
    const [course] = await db
      .update(courses)
      .set({ targetGrade })
      .where(eq(courses.id, id))
      .returning();
    return course;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  // Grade component operations
  async getGradeComponent(id: string): Promise<GradeComponent | undefined> {
    const [component] = await db
      .select()
      .from(gradeComponents)
      .where(eq(gradeComponents.id, id));
    return component;
  }

  async updateGradeComponentScore(id: string, score: number): Promise<GradeComponent | undefined> {
    const [component] = await db
      .update(gradeComponents)
      .set({ score })
      .where(eq(gradeComponents.id, id))
      .returning();
    return component;
  }
}

export const storage = new DatabaseStorage();
