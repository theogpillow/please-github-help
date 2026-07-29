import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, verificationRequestsTable } from "@workspace/db";

const router: IRouter = Router();

// Submit a verification request (authenticated user)
router.post("/verification-requests", async (req, res): Promise<void> => {
  const { userId } = req.body as { userId?: number };
  if (!userId || isNaN(Number(userId))) {
    res.status(400).json({ error: "userId required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(userId))).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.isVerified) {
    res.status(409).json({ error: "Already verified" });
    return;
  }

  // Check for existing pending request
  const [existing] = await db
    .select()
    .from(verificationRequestsTable)
    .where(and(eq(verificationRequestsTable.userId, Number(userId)), eq(verificationRequestsTable.status, "pending")))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "Verification request already pending" });
    return;
  }

  const [vr] = await db.insert(verificationRequestsTable).values({ userId: Number(userId) }).returning();
  res.status(201).json({ id: vr.id, status: vr.status, createdAt: vr.createdAt.toISOString() });
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
