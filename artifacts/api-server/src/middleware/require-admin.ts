import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawId = req.headers["x-user-id"] ?? req.query.userId;
  const userId = Number(rawId);
  if (!rawId || isNaN(userId) || userId <= 0) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
