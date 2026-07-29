import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, reportsTable, prototypesTable } from "@workspace/db";

const router: IRouter = Router();

const VALID_REASONS = ["Spam", "Inappropriate", "Misleading", "Other"];

// Submit a report
router.post("/reports", async (req, res): Promise<void> => {
  const { reporterId, prototypeId, reason } = req.body as {
    reporterId?: number;
    prototypeId?: number;
    reason?: string;
  };

  if (!reporterId || !prototypeId || !reason) {
    res.status(400).json({ error: "reporterId, prototypeId, and reason are required" });
    return;
  }
  if (!VALID_REASONS.includes(reason)) {
    res.status(400).json({ error: `reason must be one of: ${VALID_REASONS.join(", ")}` });
    return;
  }

  const [proto] = await db.select({ id: prototypesTable.id }).from(prototypesTable).where(eq(prototypesTable.id, prototypeId)).limit(1);
  if (!proto) {
    res.status(404).json({ error: "Prototype not found" });
    return;
  }

  // Prevent duplicate open reports from same user for same post
  const [existing] = await db
    .select()
    .from(reportsTable)
    .where(and(eq(reportsTable.reporterId, reporterId), eq(reportsTable.prototypeId, prototypeId), eq(reportsTable.status, "open")))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "Already reported" });
    return;
  }

  const [report] = await db.insert(reportsTable).values({ reporterId, prototypeId, reason }).returning();
  res.status(201).json({ id: report.id, status: report.status });
});

export default router;
