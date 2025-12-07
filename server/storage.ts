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
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { getSemesterDisplayName } from "../client/src/lib/gpaCalculations";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, data: Partial<User>): Promise<User | undefined>;
  
  // Semester operations
  getSemestersByUserId(userId: string): Promise<SemesterWithCourses[]>;
  getSemester(id: string): Promise<Semester | undefined>;
  createSemester(userId: string, data: { academicYear: number; term: "A" | "B" | "Summer" }): Promise<Semester>;
  deleteSemester(id: string): Promise<void>;
  
  // Course operations
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(semesterId: string, data: InsertCourse, components: InsertGradeComponent[]): Promise<Course>;
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
