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
        isBinary: z.boolean().optional().default(false),
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
        userId,
        { 
          semesterId: data.semesterId, 
          name: data.name, 
          credits: data.credits,
          difficulty: data.difficulty || "medium",
          isBinary: data.isBinary ?? false
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
        isBinary: z.boolean().optional(),
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
          difficulty: data.difficulty,
          isBinary: data.isBinary
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
        // Allow null to support clearing a grade
        score: z.number().min(0).max(100).nullable(),
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
        subscriptionExpiresAt: user?.subscriptionExpiresAt || null,
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

  // Search global courses catalog
  app.get("/api/courses/search", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const query = req.query.q as string;
      const university = req.query.university as string;
      const degree = req.query.degree as string | undefined;

      // Validate query parameter
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ message: "Search query (q) is required" });
      }

      // Get user to validate university is set
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use provided university or fall back to user's academic institution
      const searchUniversity = university || user.academicInstitution;
      if (!searchUniversity) {
        return res.status(400).json({ 
          message: "University not set. Please set your academic institution in your profile." 
        });
      }

      // Use provided degree or fall back to user's degree
      const searchDegree = degree !== undefined ? degree : user.degreeName || null;

      // Search courses
      const courses = await storage.searchGlobalCourses(
        searchUniversity,
        searchDegree,
        query.trim()
      );

      res.json({ courses });
    } catch (error) {
      console.error("Error searching courses:", error);
      res.status(500).json({ message: "Failed to search courses" });
    }
  });

  // Get recommended courses for a semester
  app.get("/api/courses/recommended", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const university = req.query.university as string;
      const degree = req.query.degree as string | undefined;
      const year = req.query.year as string;
      const semester = req.query.semester as string;

      console.log('GET /api/courses/recommended - Request params:', {
        university,
        degree,
        year,
        semester,
        userId,
      });

      // Validate parameters
      if (!year || isNaN(parseInt(year))) {
        console.error('Invalid year parameter:', year);
        return res.status(400).json({ message: "Academic year (year) is required and must be a number" });
      }

      // Map frontend semester values to database values
      const semesterMapping: Record<string, "A" | "B" | "S"> = {
        "A": "A",
        "B": "B",
        "Summer": "S",
        "Yearly": "A", // Default to A for yearly (or handle separately)
      };

      if (!semester || !["A", "B", "Summer", "Yearly"].includes(semester)) {
        console.error('Invalid semester parameter:', semester);
        return res.status(400).json({ message: "Semester must be one of: A, B, Summer, Yearly" });
      }

      const dbSemester = semesterMapping[semester];
      if (!dbSemester) {
        console.error('Could not map semester to database value:', semester);
        return res.status(400).json({ message: "Invalid semester value" });
      }

      // Get user to validate university is set
      const user = await storage.getUser(userId);
      if (!user) {
        console.error('User not found:', userId);
        return res.status(404).json({ message: "User not found" });
      }

      // Use provided university or fall back to user's academic institution
      const searchUniversity = university || user.academicInstitution;
      if (!searchUniversity) {
        console.error('No university set for user:', userId);
        return res.status(400).json({ 
          message: "University not set. Please set your academic institution in your profile." 
        });
      }

      // Use provided degree or fall back to user's degree
      const searchDegree = degree !== undefined ? degree : user.degreeName || null;

      console.log('Calling storage.getRecommendedCourses with:', {
        searchUniversity,
        searchDegree,
        year: parseInt(year),
        dbSemester,
      });

      // Get recommended courses
      const courses = await storage.getRecommendedCourses(
        searchUniversity,
        searchDegree,
        parseInt(year),
        dbSemester
      );

      console.log('GET /api/courses/recommended - Success:', {
        courseCount: courses.length,
      });

      res.json({ courses });
    } catch (error) {
      console.error("Error fetching recommended courses - Full error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Failed to fetch recommended courses",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin routes
  app.get("/api/admin/candidates", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      
      // Get user to check if admin
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Simple admin check - you can expand this later
      const ADMIN_EMAILS = [
        "sagi.hartaf@gmail.com",
      ];

      if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const candidates = await storage.getCourseCandidates();
      res.json({ candidates });
    } catch (error) {
      console.error("Error fetching course candidates:", error);
      res.status(500).json({ message: "Failed to fetch course candidates" });
    }
  });

  app.post("/api/admin/approve", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      
      // Get user to check if admin
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Simple admin check
      const ADMIN_EMAILS = [
        "sagi.hartaf@gmail.com",
      ];

      if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      // Validate request body
      const schema = z.object({
        university: z.string().min(1),
        degree: z.string().nullable(),
        courseName: z.string().min(1),
        credits: z.number().min(0.1).max(20),
        academicYear: z.number().nullable(),
        semester: z.enum(["A", "B", "S"]).nullable(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        components: z.array(z.object({
          name: z.string(),
          weight: z.number(),
          isMagen: z.boolean(),
        })),
      });

      const data = schema.parse(req.body);

      await storage.approveCourseCatalog(data);
      
      res.json({ message: "Course approved and added to catalog" });
    } catch (error) {
      console.error("Error approving course:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to approve course" });
    }
  });

  // Create pro request (Soft Launch campaign)
  app.post("/api/pro-requests", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      
      const schema = z.object({
        content: z.string().min(1, "Content cannot be empty"),
      });

      const data = schema.parse(req.body);

      const proRequest = await storage.createProRequest(userId, data.content);
      
      res.status(201).json(proRequest);
    } catch (error) {
      console.error("Error creating pro request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pro request" });
    }
  });

  // Get user's unseen Pro notification
  app.get("/api/user/pro-notification", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      const request = await storage.getUnseenApprovedProRequest(userId);
      
      if (request) {
        res.json({
          hasNotification: true,
          requestId: request.id,
        });
      } else {
        res.json({
          hasNotification: false,
        });
      }
    } catch (error) {
      console.error("Error fetching pro notification:", error);
      res.status(500).json({ message: "Failed to fetch pro notification" });
    }
  });

  // Mark Pro notification as seen
  app.post("/api/user/pro-notification/mark-seen", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const userId = req.authUser!.id;
      
      const schema = z.object({
        requestId: z.string().min(1, "Request ID is required"),
      });

      const data = schema.parse(req.body);

      // Verify the request belongs to the current user
      const request = await storage.getUnseenApprovedProRequest(userId);
      if (!request || request.id !== data.requestId) {
        return res.status(404).json({ message: "Request not found" });
      }

      const updatedRequest = await storage.markProRequestNotificationSeen(data.requestId);
      
      if (!updatedRequest) {
        return res.status(500).json({ message: "Failed to mark notification as seen" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as seen:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to mark notification as seen" });
    }
  });

  // Admin: Grant Pro subscription to a user
  app.post("/api/admin/grant-pro", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const adminId = req.authUser!.id;
      console.log(`[POST /api/admin/grant-pro] Request from adminId: ${adminId}`);
      console.log(`[POST /api/admin/grant-pro] Request body:`, req.body);
      
      // Get admin user to verify
      const adminUser = await storage.getUser(adminId);
      if (!adminUser) {
        console.error(`[POST /api/admin/grant-pro] Admin user not found: ${adminId}`);
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`[POST /api/admin/grant-pro] Admin user found: ${adminUser.email}`);

      // Simple admin check
      const ADMIN_EMAILS = [
        "sagi.hartaf@gmail.com",
      ];

      if (!adminUser.email || !ADMIN_EMAILS.includes(adminUser.email)) {
        console.error(`[POST /api/admin/grant-pro] Access denied for email: ${adminUser.email}`);
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const schema = z.object({
        userId: z.string().min(1, "User ID is required"),
      });

      const data = schema.parse(req.body);
      console.log(`[POST /api/admin/grant-pro] Validated request data, target userId: ${data.userId}`);

      // Verify target user exists
      const targetUser = await storage.getUser(data.userId);
      if (!targetUser) {
        console.error(`[POST /api/admin/grant-pro] Target user not found: ${data.userId}`);
        return res.status(404).json({ message: "Target user not found" });
      }

      console.log(`[POST /api/admin/grant-pro] Target user found: ${targetUser.email}`);
      console.log(`[POST /api/admin/grant-pro] Current subscription tier: ${targetUser.subscriptionTier}`);

      // Grant Pro subscription
      console.log(`[POST /api/admin/grant-pro] Calling grantProSubscription for userId: ${data.userId}`);
      const updatedUser = await storage.grantProSubscription(data.userId);
      
      if (!updatedUser) {
        console.error(`[POST /api/admin/grant-pro] grantProSubscription returned undefined for userId: ${data.userId}`);
        return res.status(500).json({ 
          message: "Failed to grant Pro subscription",
          error: "No user returned from update operation"
        });
      }

      console.log(`[POST /api/admin/grant-pro] Successfully granted Pro to user ${updatedUser.email}`);
      console.log(`[POST /api/admin/grant-pro] New subscription tier: ${updatedUser.subscriptionTier}, expires: ${updatedUser.subscriptionExpiresAt}`);

      res.json({ 
        message: "Pro subscription granted successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          subscriptionTier: updatedUser.subscriptionTier,
          subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
        }
      });
    } catch (error) {
      console.error("[POST /api/admin/grant-pro] Error granting Pro subscription:", error);
      console.error("[POST /api/admin/grant-pro] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        adminId: req.authUser?.id,
        requestBody: req.body,
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      
      // Provide more detailed error message for debugging
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isDatabaseError = errorMessage.includes("column") || errorMessage.includes("relation") || errorMessage.includes("permission");
      
      res.status(500).json({ 
        message: "Failed to grant Pro subscription",
        error: isDatabaseError ? errorMessage : "Internal server error",
        hint: isDatabaseError ? "Check database schema and RLS policies" : undefined
      });
    }
  });

}
