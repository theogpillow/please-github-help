import { Router, type IRouter } from "express";
import { eq, desc, and, sql, count, ilike } from "drizzle-orm";
import {
  db,
  usersTable,
  prototypesTable,
  verificationRequestsTable,
  reportsTable,
  appSettingsTable,
  notificationsTable,
} from "@workspace/db";
import { requireAdmin } from "../middleware/require-admin";

const router: IRouter = Router();

// All admin routes require admin auth
router.use("/admin", requireAdmin);

// ─── Overview stats ────────────────────────────────────────────────
router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [[users], [prototypes], [pendingVerif], [openReports]] = await Promise.all([
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(prototypesTable),
    db.select({ count: count() }).from(verificationRequestsTable).where(eq(verificationRequestsTable.status, "pending")),
    db.select({ count: count() }).from(reportsTable).where(eq(reportsTable.status, "open")),
  ]);
  const [flaggedPosts] = await db.select({ count: count() }).from(prototypesTable).where(eq(prototypesTable.status, "hidden"));
  res.json({
    totalUsers: Number(users.count),
    totalPrototypes: Number(prototypes.count),
    pendingVerifications: Number(pendingVerif.count),
    openReports: Number(openReports.count),
    flaggedPosts: Number(flaggedPosts.count),
  });
});

// ─── Verification Requests ─────────────────────────────────────────
router.get("/admin/verification-requests", async (req, res): Promise<void> => {
  const statusFilter = (req.query.status as string) || "pending";
  const rows = await db
    .select({
      id: verificationRequestsTable.id,
      userId: verificationRequestsTable.userId,
      status: verificationRequestsTable.status,
      createdAt: verificationRequestsTable.createdAt,
      username: usersTable.username,
      avatarUrl: usersTable.avatarUrl,
      isVerified: usersTable.isVerified,
    })
    .from(verificationRequestsTable)
    .leftJoin(usersTable, eq(verificationRequestsTable.userId, usersTable.id))
    .where(eq(verificationRequestsTable.status, statusFilter))
    .orderBy(desc(verificationRequestsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.patch("/admin/verification-requests/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { action } = req.body as { action: "approve" | "reject" };
  if (!["approve", "reject"].includes(action)) {
    res.status(400).json({ error: "action must be approve or reject" });
    return;
  }
  const newStatus = action === "approve" ? "approved" : "rejected";
  const [vr] = await db
    .update(verificationRequestsTable)
    .set({ status: newStatus })
    .where(eq(verificationRequestsTable.id, id))
    .returning();
  if (!vr) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (action === "approve") {
    await db.update(usersTable).set({ isVerified: true }).where(eq(usersTable.id, vr.userId));
  }
  res.json({ ok: true, status: newStatus });
});

// ─── Post moderation ───────────────────────────────────────────────
router.get("/admin/prototypes", async (req, res): Promise<void> => {
  const statusFilter = req.query.status as string | undefined;
  const rows = await db
    .select({
      id: prototypesTable.id,
      userId: prototypesTable.userId,
      title: prototypesTable.title,
      description: prototypesTable.description,
      imageUrl: prototypesTable.imageUrl,
      mediaUrls: prototypesTable.mediaUrls,
      published: prototypesTable.published,
      status: prototypesTable.status,
      category: prototypesTable.category,
      createdAt: prototypesTable.createdAt,
      username: usersTable.username,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(prototypesTable)
    .leftJoin(usersTable, eq(prototypesTable.userId, usersTable.id))
    .where(statusFilter ? eq(prototypesTable.status, statusFilter) : undefined)
    .orderBy(desc(prototypesTable.createdAt))
    .limit(200);
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.patch("/admin/prototypes/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: string };
  const allowed = ["approved", "hidden", "deleted", "pending"];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of ${allowed.join(", ")}` });
    return;
  }
  // If approving a pending post also set published=true
  const extra = status === "approved" ? { published: true } : {};
  const [proto] = await db
    .update(prototypesTable)
    .set({ status, ...extra })
    .where(eq(prototypesTable.id, id))
    .returning();
  if (!proto) {
    res.status(404).json({ error: "Prototype not found" });
    return;
  }
  res.json({ ok: true, id: proto.id, status: proto.status });
});

// ─── Reports ───────────────────────────────────────────────────────
router.get("/admin/reports", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: reportsTable.id,
      prototypeId: reportsTable.prototypeId,
      reporterId: reportsTable.reporterId,
      reason: reportsTable.reason,
      status: reportsTable.status,
      createdAt: reportsTable.createdAt,
      reporterUsername: usersTable.username,
      prototypeTitle: prototypesTable.title,
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.reporterId, usersTable.id))
    .leftJoin(prototypesTable, eq(reportsTable.prototypeId, prototypesTable.id))
    .where(eq(reportsTable.status, "open"))
    .orderBy(desc(reportsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.patch("/admin/reports/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { action } = req.body as { action: "resolve" | "delete_post" };
  if (!["resolve", "delete_post"].includes(action)) {
    res.status(400).json({ error: "action must be resolve or delete_post" });
    return;
  }
  const [report] = await db
    .update(reportsTable)
    .set({ status: "resolved" })
    .where(eq(reportsTable.id, id))
    .returning();
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  if (action === "delete_post") {
    await db.update(prototypesTable).set({ status: "deleted" }).where(eq(prototypesTable.id, report.prototypeId));
  }
  res.json({ ok: true });
});

// ─── User management ───────────────────────────────────────────────
router.get("/admin/users", async (req, res): Promise<void> => {
  const search = (req.query.search as string | undefined)?.trim();
  const users = await db
    .select()
    .from(usersTable)
    .where(search ? ilike(usersTable.username, `%${search}%`) : undefined)
    .orderBy(desc(usersTable.createdAt))
    .limit(200);
  res.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      isAdmin: u.isAdmin,
      isVerified: u.isVerified,
      isBanned: u.isBanned,
      createdAt: u.createdAt.toISOString(),
    })),
  );
});

router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const body = req.body as { isBanned?: boolean; isVerified?: boolean; isAdmin?: boolean };
  const patch: Record<string, unknown> = {};
  if (typeof body.isBanned === "boolean") patch.isBanned = body.isBanned;
  if (typeof body.isVerified === "boolean") patch.isVerified = body.isVerified;
  if (typeof body.isAdmin === "boolean") patch.isAdmin = body.isAdmin;
  if (!Object.keys(patch).length) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  const [user] = await db.update(usersTable).set(patch).where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  // notify user when they get verified
  if (body.isVerified === true) {
    db.insert(notificationsTable).values({ userId: id, type: "verified" }).catch(() => {});
  }
  res.json({ ok: true, id: user.id, isBanned: user.isBanned, isVerified: user.isVerified, isAdmin: user.isAdmin });
});

// ─── App settings ──────────────────────────────────────────────────
router.get("/admin/settings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(appSettingsTable);
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

router.patch("/admin/settings", async (req, res): Promise<void> => {
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await db
      .insert(appSettingsTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value } });
  }
  res.json({ ok: true });
});

export default router;
