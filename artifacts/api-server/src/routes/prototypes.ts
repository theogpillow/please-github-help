import { Router, type IRouter } from "express";
import { eq, desc, ilike, and, sql, or } from "drizzle-orm";
import { db, prototypesTable, usersTable, followsTable } from "@workspace/db";
import {
  CreatePrototypeBody,
  GetPrototypeParams,
  UpdatePrototypeParams,
  UpdatePrototypeBody,
  DeletePrototypeParams,
  PublishPrototypeParams,
  GeneratePrototypeParams,
  GeneratePrototypeBody,
  GetFeedQueryParams,
} from "@workspace/api-zod";
import { generateAIContent, generatePrototypeWithImage } from "../lib/ai";

const router: IRouter = Router();

// Create prototype
router.post("/prototypes", async (req, res): Promise<void> => {
  const parsed = CreatePrototypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [proto] = await db.insert(prototypesTable).values(parsed.data).returning();
  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, proto.userId));
  res.status(201).json(mapPrototype(proto, user?.username ?? null));
});

// Get prototype
router.get("/prototypes/:id", async (req, res): Promise<void> => {
  const params = GetPrototypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [proto] = await db.select().from(prototypesTable).where(eq(prototypesTable.id, params.data.id));
  if (!proto) {
    res.status(404).json({ error: "Prototype not found" });
    return;
  }
  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, proto.userId));
  res.json(mapPrototype(proto, user?.username ?? null));
});

// Update prototype
router.patch("/prototypes/:id", async (req, res): Promise<void> => {
  const params = UpdatePrototypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePrototypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [proto] = await db.update(prototypesTable).set(parsed.data).where(eq(prototypesTable.id, params.data.id)).returning();
  if (!proto) {
    res.status(404).json({ error: "Prototype not found" });
    return;
  }
  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, proto.userId));
  res.json(mapPrototype(proto, user?.username ?? null));
});

// Delete prototype
router.delete("/prototypes/:id", async (req, res): Promise<void> => {
  const params = DeletePrototypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [proto] = await db.delete(prototypesTable).where(eq(prototypesTable.id, params.data.id)).returning();
  if (!proto) {
    res.status(404).json({ error: "Prototype not found" });
    return;
  }
  res.sendStatus(204);
});

// Publish prototype
router.post("/prototypes/:id/publish", async (req, res): Promise<void> => {
  const params = PublishPrototypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [proto] = await db
    .update(prototypesTable)
    .set({ published: true })
    .where(eq(prototypesTable.id, params.data.id))
    .returning();
  if (!proto) {
    res.status(404).json({ error: "Prototype not found" });
    return;
  }
  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, proto.userId));
  res.json(mapPrototype(proto, user?.username ?? null));
});

// Generate AI content
router.post("/prototypes/:id/generate", async (req, res): Promise<void> => {
  const params = GeneratePrototypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = GeneratePrototypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(prototypesTable).where(eq(prototypesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Prototype not found" });
    return;
  }

  const result = await generatePrototypeWithImage({
    companyName: existing.title,
    description: existing.description ?? "",
    prompt: parsed.data.prompt,
  });

  const updatePayload: Record<string, unknown> = {
    generatedContent: result.text,
    prompt: parsed.data.prompt,
  };
  if (result.imageBase64) {
    updatePayload.imageUrl = `data:image/png;base64,${result.imageBase64}`;
  }

  const [proto] = await db
    .update(prototypesTable)
    .set(updatePayload)
    .where(eq(prototypesTable.id, params.data.id))
    .returning();

  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, proto.userId));
  res.json(mapPrototype(proto, user?.username ?? null));
});

// Seeded pseudo-random (mulberry32) — same seed → same order within a session
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function algorithmicScore(
  p: typeof prototypesTable.$inferSelect,
  rand: () => number,
  nowMs: number,
  followedUserIds: Set<number>,
): number {
  const ageHours = (nowMs - new Date(p.createdAt).getTime()) / 3_600_000;
  // Recency: score decays over ~168 hours (1 week), posts < 24h get big boost
  const recencyScore = 1 / (1 + ageHours / 24);
  // Media bonus: posts with an image or uploaded media rank higher
  const hasMedia = p.imageUrl || p.mediaUrls ? 1.4 : 1.0;
  // Description bonus: posts with description rank higher
  const hasDesc = p.description ? 1.1 : 1.0;
  // Follow boost: posts from people you follow appear ~2.5× more often
  const followBoost = followedUserIds.has(p.userId) ? 2.5 : 1.0;
  // Random salt: ±30% so each page load shuffles things up
  const randomSalt = 0.7 + rand() * 0.6;

  return recencyScore * hasMedia * hasDesc * followBoost * randomSalt;
}

// Get feed
router.get("/feed", async (req, res): Promise<void> => {
  const parsed = GetFeedQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { q, limit = 20, offset = 0 } = parsed.data;

  // Optional viewer — used to boost posts from followed users
  const viewerId = req.query.viewerId ? Number(req.query.viewerId) : null;

  // Fetch who the viewer follows (empty set if not logged in)
  const followedUserIds = new Set<number>();
  if (viewerId && !isNaN(viewerId)) {
    const rows = await db
      .select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(eq(followsTable.followerId, viewerId));
    for (const r of rows) followedUserIds.add(r.followingId);
  }

  const baseWhere = q
    ? and(
        eq(prototypesTable.published, true),
        or(ilike(prototypesTable.title, `%${q}%`), ilike(prototypesTable.description, `%${q}%`), ilike(prototypesTable.category, `%${q}%`)),
      )
    : eq(prototypesTable.published, true);

  // Fetch all published posts (or all matching search), then rank in JS
  const allProtos = await db
    .select()
    .from(prototypesTable)
    .where(baseWhere)
    .orderBy(desc(prototypesTable.createdAt));

  const total = allProtos.length;

  // New seed every request so the order varies on each refresh
  const seed = Math.floor(Math.random() * 2 ** 31);
  const rand = mulberry32(seed);
  const nowMs = Date.now();

  const ranked = allProtos
    .map((p) => ({ p, score: algorithmicScore(p, rand, nowMs, followedUserIds) }))
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p)
    .slice(offset, offset + limit);

  const userIds = [...new Set(ranked.map((p) => p.userId))];
  const users =
    userIds.length > 0
      ? await db.select({ id: usersTable.id, username: usersTable.username, avatarUrl: usersTable.avatarUrl }).from(usersTable)
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  res.json({
    total,
    items: ranked.map((p) => {
      const u = userMap[p.userId];
      return mapPrototype(p, u?.username ?? null, u?.avatarUrl ?? null);
    }),
  });
});

// Feed stats
router.get("/feed/stats", async (req, res): Promise<void> => {
  const [{ totalPrototypes }] = await db
    .select({ totalPrototypes: sql<number>`cast(count(*) as integer)` })
    .from(prototypesTable);
  const [{ totalPublished }] = await db
    .select({ totalPublished: sql<number>`cast(count(*) as integer)` })
    .from(prototypesTable)
    .where(eq(prototypesTable.published, true));
  const [{ totalEntrepreneurs }] = await db
    .select({ totalEntrepreneurs: sql<number>`cast(count(*) as integer)` })
    .from(usersTable);

  res.json({ totalPrototypes, totalEntrepreneurs, totalPublished });
});

function mapPrototype(
  p: typeof prototypesTable.$inferSelect,
  username: string | null,
  creatorAvatarUrl: string | null = null,
) {
  return {
    id: p.id,
    userId: p.userId,
    username,
    creatorAvatarUrl,
    title: p.title,
    description: p.description,
    prompt: p.prompt,
    generatedContent: p.generatedContent,
    imageUrl: p.imageUrl,
    mediaUrls: p.mediaUrls,
    audioUrl: p.audioUrl,
    published: p.published,
    category: p.category,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
