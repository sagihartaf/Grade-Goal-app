import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { Request, RequestHandler } from "express";
import { storage } from "./storage";

declare global {
  namespace Express {
    interface Request {
      authUser?: SupabaseUser;
    }
  }
}

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export interface AuthedRequest extends Request {
  authUser?: SupabaseUser;
}

async function ensureUserProfile(user: SupabaseUser) {
  await storage.upsertUser({
    id: user.id,
    email: user.email,
    firstName:
      (user.user_metadata as Record<string, string | undefined>)?.first_name ||
      (user.user_metadata as Record<string, string | undefined>)?.full_name ||
      null,
    lastName:
      (user.user_metadata as Record<string, string | undefined>)?.last_name ||
      null,
    profileImageUrl:
      (user.user_metadata as Record<string, string | undefined>)?.avatar_url ||
      null,
  });
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.authUser = data.user;
  await ensureUserProfile(data.user);

  next();
};

export function getSupabaseClient() {
  return supabase;
}

