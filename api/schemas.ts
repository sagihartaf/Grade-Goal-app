import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for semester terms
export const termEnum = pgEnum("term", ["A", "B", "Summer", "Yearly"]);

// Enum for course difficulty (for Smart Strategy algorithm)
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

// Users table - stores user profiles authenticated via Supabase
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  academicInstitution: text("academic_institution"),
  degreeName: text("degree_name"),
  targetGpa: real("target_gpa"),
  legacyCredits: real("legacy_credits").default(0).notNull(),
  legacyGpa: real("legacy_gpa").default(0).notNull(),
  subscriptionTier: varchar("subscription_tier").default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Semesters table
export const semesters = pgTable("semesters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  academicYear: integer("academic_year").notNull(),
  term: termEnum("term").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  legacyCredits: real("legacy_credits").default(0).notNull(),
  legacyGpa: real("legacy_gpa").default(0).notNull(),
  isLegacyVisible: boolean("is_legacy_visible").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  semesterId: varchar("semester_id").notNull().references(() => semesters.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  credits: real("credits").notNull(),
  targetGrade: real("target_grade"),
  difficulty: difficultyEnum("difficulty").default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Grade Components table
export const gradeComponents = pgTable("grade_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  weight: integer("weight").notNull(),
  score: real("score"),
  isMagen: boolean("is_magen").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global Courses Catalog table
export const globalCourses = pgTable("global_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  universityName: text("university_name").notNull(),
  degreeName: text("degree_name"), // NULL = shared across all degrees
  courseName: text("course_name").notNull(),
  credits: real("credits").notNull(),
  gradeBreakdownJson: jsonb("grade_breakdown_json").notNull(),
  difficulty: difficultyEnum("difficulty").default("medium"),
  academicYear: integer("academic_year"),
  semester: varchar("semester", { length: 1 }), // 'A', 'B', 'S' (Summer), or NULL
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pro Requests table - for soft launch campaign
export const proRequests = pgTable("pro_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  status: varchar("status").default("pending"), // pending, approved, rejected
  notificationSeen: boolean("notification_seen").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  semesters: many(semesters),
}));

export const semestersRelations = relations(semesters, ({ one, many }) => ({
  user: one(users, {
    fields: [semesters.userId],
    references: [users.id],
  }),
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  semester: one(semesters, {
    fields: [courses.semesterId],
    references: [semesters.id],
  }),
  uploader: one(users, {
    fields: [courses.userId],
    references: [users.id],
  }),
  gradeComponents: many(gradeComponents),
}));

export const gradeComponentsRelations = relations(gradeComponents, ({ one }) => ({
  course: one(courses, {
    fields: [gradeComponents.courseId],
    references: [courses.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSemesterSchema = createInsertSchema(semesters).omit({
  id: true,
  createdAt: true,
  name: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
});

export const insertGradeComponentSchema = createInsertSchema(gradeComponents).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Semester = typeof semesters.$inferSelect;
export type InsertSemester = z.infer<typeof insertSemesterSchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type GradeComponent = typeof gradeComponents.$inferSelect;
export type InsertGradeComponent = z.infer<typeof insertGradeComponentSchema>;

// Extended types for frontend with nested relations
export type CourseWithComponents = Course & {
  gradeComponents: GradeComponent[];
};

export type SemesterWithCourses = Semester & {
  courses: CourseWithComponents[];
};

// Global Courses types
export type GlobalCourse = typeof globalCourses.$inferSelect;
export type InsertGlobalCourse = typeof globalCourses.$inferInsert;

// Pro Requests types
export type ProRequest = typeof proRequests.$inferSelect;
export type InsertProRequest = typeof proRequests.$inferInsert;



