import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for semester terms
export const termEnum = pgEnum("term", ["A", "B", "Summer"]);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table - stores user profiles with Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  academicInstitution: text("academic_institution"),
  targetGpa: real("target_gpa"),
  subscriptionTier: varchar("subscription_tier").default("free"),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  semesterId: varchar("semester_id").notNull().references(() => semesters.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  credits: real("credits").notNull(),
  targetGrade: real("target_grade"),
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
