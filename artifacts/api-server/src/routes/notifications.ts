import { Router, type IRouter } from "express";
import { eq, desc, and, count } from "drizzle-orm";
import { db, notificationsTable, usersTable, prototypesTable } from "@workspace/db";

const router: IRouter = Router();

// ── GET /api/notifications ──────────────────────────────────────────
router.get("/notifications", async (req, res): Promise<void> => {
  const userId = Number(req.query.userId);
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

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
  const userId = Number(req.query.userId);
  if (!userId) { res.json({ count: 0 }); return; }

  const [row] = await db
    .select({ count: count() })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));

  res.json({ count: Number(row?.count ?? 0) });
});

// ── PATCH /api/notifications/read-all ──────────────────────────────
router.patch("/notifications/read-all", async (req, res): Promise<void> => {
  const userId = Number(req.body.userId);
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));

  res.json({ ok: true });
});

// ── PATCH /api/notifications/:id/read ─────────────────────────────
router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, id));
  res.json({ ok: true });
});

export default router;
