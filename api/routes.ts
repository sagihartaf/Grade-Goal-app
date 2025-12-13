import type { Express } from "express";
import { storage } from "./storage.js";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "./supabaseAuth.js";

export function registerRoutes(app: Express): void {
  // Auth routes
  app.get("/api/auth/user", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch("/api/profile", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      
      const schema = z.object({
        academicInstitution: z.string().optional(),
        degreeName: z.string().optional(),
        targetGpa: z.number().min(0).max(100).optional().nullable(),
        legacyCredits: z.number().min(0).optional().nullable(),
        legacyGpa: z.number().min(0).max(100).optional().nullable(),
      });

      const data = schema.parse(req.body);
      
      // Build partial update object: only include fields explicitly present in request
      // This ensures undefined/missing fields are ignored, leaving existing DB values untouched
      // This is critical for NOT NULL fields (legacyCredits, legacyGpa) which cannot be set to null
      const updateData: Partial<{
        academicInstitution: string;
        degreeName: string;
        targetGpa: number | null;
        legacyCredits: number;
        legacyGpa: number;
      }> = {};
      
      // Optional string fields: include if present in request (even if empty string)
      if ('academicInstitution' in req.body) {
        updateData.academicInstitution = data.academicInstitution;
      }
      if ('degreeName' in req.body) {
        updateData.degreeName = data.degreeName;
      }
      
      // Nullable field: include if present (allows null to clear the value)
      if ('targetGpa' in req.body) {
        updateData.targetGpa = data.targetGpa ?? null;
      }
      
      // NOT NULL fields: only update if explicitly provided with a valid number value
      // Skip if missing, null, or undefined to avoid violating NOT NULL constraint
      if ('legacyCredits' in req.body && data.legacyCredits !== null && data.legacyCredits !== undefined) {
        updateData.legacyCredits = data.legacyCredits;
      }
      if ('legacyGpa' in req.body && data.legacyGpa !== null && data.legacyGpa !== undefined) {
        updateData.legacyGpa = data.legacyGpa;
      }
      
      const user = await storage.updateUserProfile(userId, updateData);
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get all semesters for the authenticated user
  app.get("/api/semesters", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const semesters = await storage.getSemestersByUserId(userId);
      res.json(semesters);
    } catch (error) {
      console.error("Error fetching semesters:", error);
      res.status(500).json({ message: "Failed to fetch semesters" });
    }
  });

  // Create a new semester
  app.post("/api/semesters", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      
      const schema = z.object({
        academicYear: z.number().min(1).max(7),
        term: z.enum(["A", "B", "Summer", "Yearly"]),
        legacyCredits: z.number().min(0).optional().default(0),
        legacyGpa: z.number().min(0).max(100).optional().default(0),
        isLegacyVisible: z.boolean().optional().default(false),
      });

      const data = schema.parse(req.body);
      const semester = await storage.createSemester(userId, data);
      res.status(201).json(semester);
    } catch (error) {
      console.error("Error creating semester:", error);
      res.status(500).json({ message: "Failed to create semester" });
    }
  });

  // Delete a semester
  app.delete("/api/semesters/:id", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const semesterId = req.params.id;

      // Verify ownership
      const semester = await storage.getSemester(semesterId);
      if (!semester || semester.userId !== userId) {
        return res.status(404).json({ message: "Semester not found" });
      }

      await storage.deleteSemester(semesterId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting semester:", error);
      res.status(500).json({ message: "Failed to delete semester" });
    }
  });

  // Create a new course
  app.post("/api/courses", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      
      const schema = z.object({
        semesterId: z.string(),
        name: z.string().min(1),
        credits: z.number().min(0.1).max(20),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        components: z.array(z.object({
          name: z.string().min(1),
          weight: z.number().min(0).max(100),
          score: z.number().min(0).max(100).optional().nullable(),
          isMagen: z.boolean().default(false),
        })).min(1),
      });

      const data = schema.parse(req.body);
      
      // Verify semester ownership
      const semester = await storage.getSemester(data.semesterId);
      if (!semester || semester.userId !== userId) {
        return res.status(404).json({ message: "Semester not found" });
      }

      const course = await storage.createCourse(
        data.semesterId,
        { 
          semesterId: data.semesterId, 
          name: data.name, 
          credits: data.credits,
          difficulty: data.difficulty || "medium"
        },
        data.components.map((c) => ({
          courseId: "", // Will be set in storage
          name: c.name,
          weight: c.weight,
          score: c.score ?? null,
          isMagen: c.isMagen,
        }))
      );
      
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Update course (name, credits, components)
  app.put("/api/courses/:id", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const courseId = req.params.id;
      
      const schema = z.object({
        name: z.string().min(1),
        credits: z.number().min(0.1).max(20),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        components: z.array(z.object({
          name: z.string().min(1),
          weight: z.number().min(0).max(100),
          score: z.number().min(0).max(100).optional().nullable(),
          isMagen: z.boolean().default(false),
        })).min(1),
      });

      const data = schema.parse(req.body);
      
      // Verify ownership through semester
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const semester = await storage.getSemester(course.semesterId);
      if (!semester || semester.userId !== userId) {
        return res.status(404).json({ message: "Course not found" });
      }

      const updatedCourse = await storage.updateCourse(
        courseId,
        { 
          name: data.name, 
          credits: data.credits,
          difficulty: data.difficulty
        },
        data.components.map((c) => ({
          courseId: courseId,
          name: c.name,
          weight: c.weight,
          score: c.score ?? null,
          isMagen: c.isMagen,
        }))
      );
      
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  // Update course target grade
  app.patch("/api/courses/:id/target", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const courseId = req.params.id;
      
      const schema = z.object({
        targetGrade: z.number().min(0).max(100).nullable(),
      });

      const data = schema.parse(req.body);
      
      // Verify ownership through semester
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const semester = await storage.getSemester(course.semesterId);
      if (!semester || semester.userId !== userId) {
        return res.status(404).json({ message: "Course not found" });
      }

      const updatedCourse = await storage.updateCourseTargetGrade(courseId, data.targetGrade);
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course target grade:", error);
      res.status(500).json({ message: "Failed to update course target grade" });
    }
  });

  // Delete a course
  app.delete("/api/courses/:id", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const courseId = req.params.id;

      // Verify ownership through semester
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const semester = await storage.getSemester(course.semesterId);
      if (!semester || semester.userId !== userId) {
        return res.status(404).json({ message: "Course not found" });
      }

      await storage.deleteCourse(courseId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Get institution statistics for percentile ranking
  app.get("/api/stats/institution", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const userGpa = parseFloat(req.query.gpa as string);
      
      if (isNaN(userGpa)) {
        return res.status(400).json({ message: "Invalid GPA parameter" });
      }

      const stats = await storage.getInstitutionStats(userId, userGpa);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching institution stats:", error);
      res.status(500).json({ message: "Failed to fetch institution stats" });
    }
  });

  // Update grade component score
  app.patch("/api/grade-components/:id", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const componentId = req.params.id;
      
      const schema = z.object({
        score: z.number().min(0).max(100),
      });

      const data = schema.parse(req.body);
      
      // Verify ownership through course and semester
      const component = await storage.getGradeComponent(componentId);
      if (!component) {
        return res.status(404).json({ message: "Component not found" });
      }

      const course = await storage.getCourse(component.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const semester = await storage.getSemester(course.semesterId);
      if (!semester || semester.userId !== userId) {
        return res.status(404).json({ message: "Component not found" });
      }

      const updatedComponent = await storage.updateGradeComponentScore(componentId, data.score);
      res.json(updatedComponent);
    } catch (error) {
      console.error("Error updating grade component:", error);
      res.status(500).json({ message: "Failed to update grade component" });
    }
  });

  // Get user subscription status
  app.get("/api/subscription", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const user = await storage.getUser(userId);
      
      res.json({
        subscriptionTier: user?.subscriptionTier || "free",
        stripeSubscriptionId: user?.stripeSubscriptionId,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Upgrade subscription to Pro
  app.post("/api/subscription/upgrade", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const { subscriptionId, planId } = req.body;

      // Update user to pro tier
      const updatedUser = await storage.updateUserStripeInfo(userId, {
        subscriptionTier: "pro",
        stripeSubscriptionId: subscriptionId || null,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        success: true,
        subscriptionTier: updatedUser.subscriptionTier,
      });
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      res.status(500).json({ message: "Failed to upgrade subscription" });
    }
  });

}
