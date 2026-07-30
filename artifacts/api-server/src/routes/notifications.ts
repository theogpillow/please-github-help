import { Router, type IRouter } from "express";
import { eq, desc, and, count } from "drizzle-orm";
import { db, notificationsTable, usersTable, prototypesTable } from "@workspace/db";

const router: IRouter = Router();

/** Extract and validate the caller's identity from the x-user-id header. */
function getCallerId(req: { headers: Record<string, string | string[] | undefined> }): number | null {
  const raw = req.headers["x-user-id"];
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ── GET /api/notifications ──────────────────────────────────────────
router.get("/notifications", async (req, res): Promise<void> => {
  const callerId = getCallerId(req);
  if (!callerId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = Number(req.query.userId);
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  // Only allow a user to read their own notifications
  if (callerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const rows = await db
    .select({
      id: notificationsTable.id,
      type: notificationsTable.type,
      actorId: notificationsTable.actorId,
      prototypeId: notificationsTable.prototypeId,
      read: notificationsTable.read,
      createdAt: notificationsTable.createdAt,
      actorUsername: usersTable.username,
      actorAvatarUrl: usersTable.avatarUrl,
      prototypeTitle: prototypesTable.title,
    })
    .from(notificationsTable)
    .leftJoin(usersTable, eq(usersTable.id, notificationsTable.actorId))
    .leftJoin(prototypesTable, eq(prototypesTable.id, notificationsTable.prototypeId))
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// ── GET /api/notifications/unread-count ────────────────────────────
router.get("/notifications/unread-count", async (req, res): Promise<void> => {
  const callerId = getCallerId(req);
  if (!callerId) { res.json({ count: 0 }); return; }

  const userId = Number(req.query.userId);
  if (!userId || callerId !== userId) { res.json({ count: 0 }); return; }

  const [row] = await db
    .select({ count: count() })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));

  res.json({ count: Number(row?.count ?? 0) });
});

// ── PATCH /api/notifications/read-all ──────────────────────────────
router.patch("/notifications/read-all", async (req, res): Promise<void> => {
  const callerId = getCallerId(req);
  if (!callerId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = Number(req.body.userId);
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  // Only allow a user to mark their own notifications as read
  if (callerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));

  res.json({ ok: true });
});

// ── PATCH /api/notifications/:id/read ─────────────────────────────
router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const callerId = getCallerId(req);
  if (!callerId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid notification id" }); return; }

  // Fetch the notification to verify ownership before mutating
  const [notification] = await db
    .select({ userId: notificationsTable.userId })
    .from(notificationsTable)
    .where(eq(notificationsTable.id, id))
    .limit(1);

  if (!notification) { res.status(404).json({ error: "Not found" }); return; }
  if (notification.userId !== callerId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, id));
  res.json({ ok: true });
});

export default router;
