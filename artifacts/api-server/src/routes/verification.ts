import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, verificationRequestsTable } from "@workspace/db";

const router: IRouter = Router();

// Verification is admin-only — users cannot self-request
router.post("/verification-requests", (_req, res): void => {
  res.status(403).json({ error: "Verification is granted by admins only." });
});

// Get the current user's own verification request status
router.get("/verification-requests/my", async (req, res): Promise<void> => {
  const userId = Number(req.query.userId);
  if (!userId || isNaN(userId)) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const [vr] = await db
    .select()
    .from(verificationRequestsTable)
    .where(eq(verificationRequestsTable.userId, userId))
    .orderBy(verificationRequestsTable.createdAt)
    .limit(1);
  if (!vr) {
    res.json({ status: "none" });
    return;
  }
  res.json({ id: vr.id, status: vr.status, createdAt: vr.createdAt.toISOString() });
});

export default router;
