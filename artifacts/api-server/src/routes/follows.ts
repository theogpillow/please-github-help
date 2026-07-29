import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { followsTable, usersTable, notificationsTable } from "@workspace/db/schema";

const router = Router();

// GET /users/:username/followers  — list followers
router.get("/users/:username/followers", async (req, res): Promise<void> => {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.username, req.params.username) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const rows = await db
    .select({ id: usersTable.id, username: usersTable.username })
    .from(followsTable)
    .innerJoin(usersTable, eq(usersTable.id, followsTable.followerId))
    .where(eq(followsTable.followingId, user.id));

  res.json(rows);
});

// GET /users/:username/following  — list who they follow
router.get("/users/:username/following", async (req, res): Promise<void> => {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.username, req.params.username) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const rows = await db
    .select({ id: usersTable.id, username: usersTable.username })
    .from(followsTable)
    .innerJoin(usersTable, eq(usersTable.id, followsTable.followingId))
    .where(eq(followsTable.followerId, user.id));

  res.json(rows);
});

// GET /users/:username/follow-counts
router.get("/users/:username/follow-counts", async (req, res): Promise<void> => {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.username, req.params.username) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [{ followers }] = await db
    .select({ followers: sql<number>`cast(count(*) as integer)` })
    .from(followsTable).where(eq(followsTable.followingId, user.id));

  const [{ following }] = await db
    .select({ following: sql<number>`cast(count(*) as integer)` })
    .from(followsTable).where(eq(followsTable.followerId, user.id));

  res.json({ followers, following });
});

// GET /users/:username/is-following/:viewerId
router.get("/users/:username/is-following/:viewerId", async (req, res): Promise<void> => {
  const viewerId = Number(req.params.viewerId);
  if (!viewerId) { res.json({ following: false }); return; }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.username, req.params.username) });
  if (!user) { res.json({ following: false }); return; }

  const row = await db.query.followsTable.findFirst({
    where: and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, user.id)),
  });

  res.json({ following: !!row });
});

// POST /users/:username/follow  { followerId }
router.post("/users/:username/follow", async (req, res): Promise<void> => {
  const { followerId } = req.body;
  if (!followerId) { res.status(400).json({ error: "followerId required" }); return; }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.username, req.params.username) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.id === followerId) { res.status(400).json({ error: "Cannot follow yourself" }); return; }

  await db.insert(followsTable).values({ followerId, followingId: user.id }).onConflictDoNothing();
  // fire-and-forget notification
  db.insert(notificationsTable).values({ userId: user.id, type: "follow", actorId: followerId }).onConflictDoNothing().catch(() => {});
  res.json({ ok: true });
});

// DELETE /users/:username/follow  { followerId }
router.delete("/users/:username/follow", async (req, res): Promise<void> => {
  const { followerId } = req.body;
  if (!followerId) { res.status(400).json({ error: "followerId required" }); return; }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.username, req.params.username) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await db.delete(followsTable).where(
    and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, user.id))
  );
  res.json({ ok: true });
});

export default router;
