import {
  users,
  semesters,
  courses,
  gradeComponents,
  globalCourses,
  proRequests,
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
  type GlobalCourse,
  type ProRequest,
  type InsertProRequest,
} from "./schemas.js";
import { db, pool } from "./db.js";
import { eq, sql, ilike, or, and, isNull } from "drizzle-orm";

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
  grantProSubscription(userId: string): Promise<User | undefined>;
  getInstitutionStats(userId: string, userGpa: number): Promise<InstitutionStats | null>;
  
  // Semester operations
  getSemestersByUserId(userId: string): Promise<SemesterWithCourses[]>;
  getSemester(id: string): Promise<Semester | undefined>;
  createSemester(userId: string, data: { academicYear: number; term: "A" | "B" | "Summer" | "Yearly"; legacyCredits?: number; legacyGpa?: number; isLegacyVisible?: boolean }): Promise<Semester>;
  deleteSemester(id: string): Promise<void>;
  
  // Course operations
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(semesterId: string, userId: string, data: Omit<InsertCourse, "userId">, components: InsertGradeComponent[]): Promise<Course>;
  updateCourse(id: string, data: { name: string; credits: number; difficulty?: "easy" | "medium" | "hard"; isBinary?: boolean }, components: InsertGradeComponent[]): Promise<Course | undefined>;
  updateCourseTargetGrade(id: string, targetGrade: number | null): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<void>;
  
  // Grade component operations
  getGradeComponent(id: string): Promise<GradeComponent | undefined>;
  updateGradeComponentScore(id: string, score: number | null): Promise<GradeComponent | undefined>;
  
  // Global courses catalog operations
  getRecommendedCourses(university: string, degree: string | null, academicYear: number, semester: "A" | "B" | "S"): Promise<Array<{
    id: string;
    course_name: string;
    credits: number;
    grade_breakdown: Array<{name: string, weight: number, isMagen: boolean}>;
    difficulty: "easy" | "medium" | "hard";
    degree_specific: boolean;
  }>>;
  searchGlobalCourses(university: string, degree: string | null, query: string): Promise<Array<{
    id: string;
    course_name: string;
    credits: number;
    grade_breakdown: Array<{name: string, weight: number, isMagen: boolean}>;
    difficulty: "easy" | "medium" | "hard";
    degree_specific: boolean;
  }>>;
  
  // Admin operations
  getCourseCandidates(): Promise<Array<{
    university: string;
    degree: string | null;
    course_name: string;
    academic_year: number | null;
    semester: "A" | "B" | "Summer" | "Yearly" | null;
    credits: number;
    difficulty: "easy" | "medium" | "hard";
    components: Array<{name: string, weight: number, isMagen: boolean}>;
    user_count: number;
    uploader_user_id: string | null;
    uploader_email: string | null;
    uploader_first_name: string | null;
    uploader_last_name: string | null;
    upload_count: number;
  }>>;
  approveCourseCatalog(data: {
    university: string;
    degree: string | null;
    courseName: string;
    credits: number;
    academicYear: number | null;
    semester: "A" | "B" | "S" | null;
    difficulty: "easy" | "medium" | "hard";
    components: Array<{name: string, weight: number, isMagen: boolean}>;
  }): Promise<void>;
  
  // Pro Request operations
  createProRequest(userId: string, content: string): Promise<ProRequest>;
  getUnseenApprovedProRequest(userId: string): Promise<ProRequest | undefined>;
  markProRequestNotificationSeen(requestId: string): Promise<ProRequest | undefined>;
}

// Helper function for semester display name (duplicated here to avoid client import issues)
function getSemesterName(academicYear: number, term: "A" | "B" | "Summer" | "Yearly"): string {
  const termNames: Record<string, string> = {
    A: "א׳",
    B: "ב׳",
    Summer: "קיץ",
    Yearly: "שנתי",
  };
  
  if (term === "Yearly") {
    return `שנה ${academicYear}`;
  }
  
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

  async grantProSubscription(userId: string): Promise<User | undefined> {
    try {
      // Grant Pro for 1 year from now
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      console.log(`[grantProSubscription] Starting Pro grant for user ${userId}, expires at: ${oneYearFromNow.toISOString()}`);
      
      // Update any pending pro_requests to 'approved'
      try {
        const updateResult = await db
          .update(proRequests)
          .set({ status: "approved" })
          .where(and(
            eq(proRequests.userId, userId),
            eq(proRequests.status, "pending")
          ));
        console.log(`[grantProSubscription] Updated pro_requests for user ${userId}, result:`, updateResult);
      } catch (proRequestError) {
        console.error(`[grantProSubscription] Error updating pro_requests for user ${userId}:`, proRequestError);
        // Continue with user update even if pro_requests update fails
        // This ensures the user still gets Pro access
      }
      
      // Update user subscription
      try {
        const [user] = await db
          .update(users)
          .set({ 
            subscriptionTier: "pro",
            subscriptionExpiresAt: oneYearFromNow,
            updatedAt: new Date() 
          })
          .where(eq(users.id, userId))
          .returning();
        
        if (!user) {
          console.error(`[grantProSubscription] No user returned after update for userId: ${userId}`);
          throw new Error(`Failed to update user ${userId} - no user returned from update`);
        }
        
        console.log(`[grantProSubscription] Successfully granted Pro to user ${userId}, subscription expires: ${user.subscriptionExpiresAt}`);
        return user;
      } catch (userUpdateError) {
        console.error(`[grantProSubscription] Error updating user ${userId}:`, userUpdateError);
        console.error(`[grantProSubscription] Error details:`, {
          message: userUpdateError instanceof Error ? userUpdateError.message : String(userUpdateError),
          stack: userUpdateError instanceof Error ? userUpdateError.stack : undefined,
          userId,
          oneYearFromNow: oneYearFromNow.toISOString(),
        });
        throw userUpdateError;
      }
    } catch (error) {
      console.error(`[grantProSubscription] Fatal error granting Pro subscription to user ${userId}:`, error);
      console.error(`[grantProSubscription] Full error object:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        userId,
      });
      throw error;
    }
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
          // Exclude binary courses from GPA calculation
          if (course.isBinary) continue;
          
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

  async createSemester(userId: string, data: { academicYear: number; term: "A" | "B" | "Summer" | "Yearly"; legacyCredits?: number; legacyGpa?: number; isLegacyVisible?: boolean }): Promise<Semester> {
    const name = getSemesterName(data.academicYear, data.term);
    const [semester] = await db
      .insert(semesters)
      .values({
        academicYear: data.academicYear,
        term: data.term,
        userId,
        name,
        legacyCredits: data.legacyCredits || 0,
        legacyGpa: data.legacyGpa || 0,
        isLegacyVisible: data.isLegacyVisible || false,
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
    userId: string,
    data: Omit<InsertCourse, "userId">,
    components: InsertGradeComponent[]
  ): Promise<Course> {
    const [course] = await db
      .insert(courses)
      .values({
        ...data,
        userId,
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
    data: { name: string; credits: number; difficulty?: "easy" | "medium" | "hard"; isBinary?: boolean },
    components: InsertGradeComponent[]
  ): Promise<Course | undefined> {
    // Update course info
    const updateData: any = { name: data.name, credits: data.credits };
    if (data.difficulty !== undefined) {
      updateData.difficulty = data.difficulty;
    }
    if (data.isBinary !== undefined) {
      updateData.isBinary = data.isBinary;
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

  async updateGradeComponentScore(id: string, score: number | null): Promise<GradeComponent | undefined> {
    const [component] = await db
      .update(gradeComponents)
      .set({ score })
      .where(eq(gradeComponents.id, id))
      .returning();
    return component;
  }

  // Global courses catalog operations
  async getRecommendedCourses(
    university: string,
    degree: string | null,
    academicYear: number,
    semester: "A" | "B" | "S"
  ): Promise<Array<{
    id: string;
    course_name: string;
    credits: number;
    grade_breakdown: Array<{name: string, weight: number, isMagen: boolean}>;
    difficulty: "easy" | "medium" | "hard";
    degree_specific: boolean;
  }>> {
    try {
      console.log('getRecommendedCourses called with:', {
        university,
        degree,
        academicYear,
        semester,
        academicYearType: typeof academicYear,
      });

      // Ensure academicYear is a number
      const yearNum = typeof academicYear === 'string' ? parseInt(academicYear) : academicYear;
      
      if (isNaN(yearNum)) {
        throw new Error(`Invalid academic year: ${academicYear}`);
      }

      // Query for courses matching university, degree, year, and semester
      const result = await pool.query(
        `SELECT 
          id,
          course_name,
          credits,
          grade_breakdown_json,
          difficulty,
          degree_name
        FROM global_courses
        WHERE university_name = $1
          AND (
            ($2::text IS NOT NULL AND degree_name = $2) OR
            degree_name IS NULL
          )
          AND (academic_year = $3::integer OR academic_year IS NULL)
          AND (semester = $4::varchar OR semester IS NULL)
        ORDER BY
          CASE WHEN degree_name = $2 THEN 1 ELSE 2 END,
          CASE WHEN degree_name IS NULL THEN 2 ELSE 3 END,
          course_name ASC`,
        [university, degree, yearNum, semester]
      );

      console.log(`getRecommendedCourses returned ${result.rows.length} courses`);
      
      return result.rows.map((row: any) => {
        const gradeBreakdown = Array.isArray(row.grade_breakdown_json)
          ? row.grade_breakdown_json
          : typeof row.grade_breakdown_json === 'string'
          ? JSON.parse(row.grade_breakdown_json)
          : row.grade_breakdown_json;

        return {
          id: row.id,
          course_name: row.course_name,
          credits: parseFloat(row.credits),
          grade_breakdown: gradeBreakdown.map((comp: any) => ({
            name: comp.name,
            weight: comp.weight,
            isMagen: comp.isMagen || false,
          })),
          difficulty: (row.difficulty || "medium") as "easy" | "medium" | "hard",
          degree_specific: row.degree_name !== null,
        };
      });
    } catch (error) {
      console.error('getRecommendedCourses error:', error);
      throw error;
    }
  }

  async searchGlobalCourses(
    university: string,
    degree: string | null,
    query: string
  ): Promise<Array<{
    id: string;
    course_name: string;
    credits: number;
    grade_breakdown: Array<{name: string, weight: number, isMagen: boolean}>;
    difficulty: "easy" | "medium" | "hard";
    degree_specific: boolean;
  }>> {
    // Use raw SQL for complex ORDER BY with pg_trgm similarity
    // This query prioritizes:
    // 1. Degree-specific matches first (degree_name = user's degree)
    // 2. Shared courses second (degree_name IS NULL)
    // 3. Text similarity using pg_trgm
    // 4. Alphabetical order
    const searchPattern = `%${query}%`;
    const result = await pool.query(
      `SELECT 
        id,
        course_name,
        credits,
        grade_breakdown_json,
        difficulty,
        degree_name
      FROM global_courses
      WHERE university_name = $1
        AND (
          ($2 IS NOT NULL AND degree_name = $2) OR
          degree_name IS NULL
        )
        AND course_name ILIKE $3
      ORDER BY
        CASE WHEN degree_name = $2 THEN 1 ELSE 2 END,
        CASE WHEN degree_name IS NULL THEN 2 ELSE 3 END,
        similarity(course_name, $4) DESC,
        course_name ASC
      LIMIT 20`,
      [university, degree, searchPattern, query]
    );

    // Format results for frontend
    return result.rows.map((row: any) => {
      const gradeBreakdown = Array.isArray(row.grade_breakdown_json)
        ? row.grade_breakdown_json
        : typeof row.grade_breakdown_json === 'string'
        ? JSON.parse(row.grade_breakdown_json)
        : row.grade_breakdown_json;

      return {
        id: row.id,
        course_name: row.course_name,
        credits: parseFloat(row.credits),
        grade_breakdown: gradeBreakdown.map((comp: any) => ({
          name: comp.name,
          weight: comp.weight,
          isMagen: comp.isMagen || false,
        })),
        difficulty: (row.difficulty || "medium") as "easy" | "medium" | "hard",
        degree_specific: row.degree_name !== null,
      };
    });
  }

  // Admin operations
  async getCourseCandidates(): Promise<Array<{
    university: string;
    degree: string | null;
    course_name: string;
    academic_year: number | null;
    semester: "A" | "B" | "Summer" | "Yearly" | null;
    credits: number;
    difficulty: "easy" | "medium" | "hard";
    components: Array<{name: string, weight: number, isMagen: boolean}>;
    user_count: number;
    uploader_user_id: string | null;
    uploader_email: string | null;
    uploader_first_name: string | null;
    uploader_last_name: string | null;
    upload_count: number;
  }>> {
    try {
      const result = await pool.query(`
        WITH course_aggregates AS (
          SELECT 
            u.academic_institution as university,
            u.degree_name as degree,
            c.name as course_name,
            s.academic_year,
            s.term as semester,
            c.credits,
            c.difficulty,
            jsonb_agg(
              jsonb_build_object(
                'name', gc.name,
                'weight', gc.weight,
                'isMagen', COALESCE(gc.is_magen, false)
              ) ORDER BY gc.weight DESC
            ) as components,
            COUNT(DISTINCT c.id) as user_count,
            MAX(c.user_id) as uploader_user_id
          FROM courses c
          JOIN semesters s ON c.semester_id = s.id
          JOIN users u ON s.user_id = u.id
          LEFT JOIN grade_components gc ON c.id = gc.course_id
          WHERE u.academic_institution IS NOT NULL
            AND u.degree_name IS NOT NULL
            AND LENGTH(c.name) >= 3
            AND NOT EXISTS (
              SELECT 1 FROM global_courses gcl
              WHERE gcl.university_name = u.academic_institution
                AND gcl.course_name = c.name
            )
          GROUP BY 
            u.academic_institution,
            u.degree_name,
            c.name,
            s.academic_year,
            s.term,
            c.credits,
            c.difficulty
          HAVING COUNT(DISTINCT s.user_id) >= 1
        ),
        uploader_stats AS (
          SELECT 
            user_id,
            COUNT(*) as total_upload_count
          FROM courses
          WHERE user_id IS NOT NULL
          GROUP BY user_id
        )
        SELECT 
          ca.*,
          u.email as uploader_email,
          u.first_name as uploader_first_name,
          u.last_name as uploader_last_name,
          COALESCE(us.total_upload_count, 0) as upload_count
        FROM course_aggregates ca
        LEFT JOIN users u ON ca.uploader_user_id = u.id
        LEFT JOIN uploader_stats us ON ca.uploader_user_id = us.user_id
        ORDER BY ca.user_count DESC, ca.course_name ASC
        LIMIT 100
      `);

      return result.rows.map((row: any) => ({
        university: row.university,
        degree: row.degree,
        course_name: row.course_name,
        academic_year: row.academic_year,
        semester: row.semester as "A" | "B" | "Summer" | "Yearly" | null,
        credits: parseFloat(row.credits),
        difficulty: (row.difficulty || "medium") as "easy" | "medium" | "hard",
        components: Array.isArray(row.components) ? row.components : [],
        user_count: parseInt(row.user_count),
        uploader_user_id: row.uploader_user_id,
        uploader_email: row.uploader_email,
        uploader_first_name: row.uploader_first_name,
        uploader_last_name: row.uploader_last_name,
        upload_count: parseInt(row.upload_count) || 0,
      }));
    } catch (error) {
      console.error('Error fetching course candidates:', error);
      throw error;
    }
  }

  async approveCourseCatalog(data: {
    university: string;
    degree: string | null;
    courseName: string;
    credits: number;
    academicYear: number | null;
    semester: "A" | "B" | "S" | null;
    difficulty: "easy" | "medium" | "hard";
    components: Array<{name: string, weight: number, isMagen: boolean}>;
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO global_courses (
          university_name,
          degree_name,
          course_name,
          credits,
          grade_breakdown_json,
          difficulty,
          academic_year,
          semester,
          last_verified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (university_name, degree_name, course_name) DO NOTHING`,
        [
          data.university,
          data.degree,
          data.courseName,
          data.credits,
          JSON.stringify(data.components),
          data.difficulty,
          data.academicYear,
          data.semester,
        ]
      );
    } catch (error) {
      console.error('Error approving course:', error);
      throw error;
    }
  }

  // Pro Request operations
  async createProRequest(userId: string, content: string): Promise<ProRequest> {
    const [request] = await db
      .insert(proRequests)
      .values({
        userId,
        content,
        status: "pending",
      })
      .returning();
    return request;
  }

  async getUnseenApprovedProRequest(userId: string): Promise<ProRequest | undefined> {
    const [request] = await db
      .select()
      .from(proRequests)
      .where(
        and(
          eq(proRequests.userId, userId),
          eq(proRequests.status, "approved"),
          eq(proRequests.notificationSeen, false)
        )
      )
      .limit(1);
    return request;
  }

  async markProRequestNotificationSeen(requestId: string): Promise<ProRequest | undefined> {
    const [request] = await db
      .update(proRequests)
      .set({ notificationSeen: true })
      .where(eq(proRequests.id, requestId))
      .returning();
    return request;
  }
}

export const storage = new DatabaseStorage();
