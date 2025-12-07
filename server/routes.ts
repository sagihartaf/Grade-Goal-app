import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { handleLemonSqueezyWebhook } from "./lemonSqueezyWebhook";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const schema = z.object({
        academicInstitution: z.string().optional(),
        targetGpa: z.number().min(0).max(100).optional().nullable(),
      });

      const data = schema.parse(req.body);
      const user = await storage.updateUserProfile(userId, data);
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get all semesters for the authenticated user
  app.get("/api/semesters", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const semesters = await storage.getSemestersByUserId(userId);
      res.json(semesters);
    } catch (error) {
      console.error("Error fetching semesters:", error);
      res.status(500).json({ message: "Failed to fetch semesters" });
    }
  });

  // Create a new semester
  app.post("/api/semesters", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const schema = z.object({
        academicYear: z.number().min(1).max(7),
        term: z.enum(["A", "B", "Summer"]),
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
  app.delete("/api/semesters/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post("/api/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const schema = z.object({
        semesterId: z.string(),
        name: z.string().min(1),
        credits: z.number().min(0.1).max(20),
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
        { semesterId: data.semesterId, name: data.name, credits: data.credits },
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

  // Update course target grade
  app.patch("/api/courses/:id/target", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.delete("/api/courses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get("/api/stats/institution", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.patch("/api/grade-components/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Lemon Squeezy webhook
  app.post("/api/webhooks/lemon-squeezy", handleLemonSqueezyWebhook);

  return httpServer;
}
