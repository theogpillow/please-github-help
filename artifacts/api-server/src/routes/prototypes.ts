import { Router, type IRouter } from "express";
import { eq, desc, ilike, and, sql, or, notInArray, inArray } from "drizzle-orm";
import { db, prototypesTable, usersTable, followsTable, appSettingsTable, likesTable, savesTable } from "@workspace/db";
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

function parseLikeBody(body: unknown): { userId: number } | null {
  if (typeof body !== "object" || body === null) return null;
  const userId = (body as Record<string, unknown>).userId;
  if (typeof userId !== "number" || !Number.isInteger(userId)) return null;
  return { userId };
}

function parseUserIdQuery(query: unknown): { userId: number } | null {
  if (typeof query !== "object" || query === null) return null;
  const raw = (query as Record<string, unknown>).userId;
  const userId = Number(raw);
  if (isNaN(userId) || !Number.isInteger(userId)) return null;
  return { userId };
}

function parsePrototypeId(params: unknown): { id: number } | null {
  if (typeof params !== "object" || params === null) return null;
  const id = Number((params as Record<string, unknown>).id);
  if (isNaN(id) || !Number.isInteger(id)) return null;
  return { id };
}

// Create prototype
router.post("/prototypes", async (req, res): Promise<void> => {
  const parsed = CreatePrototypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [proto] = await db.insert(prototypesTable).values(parsed.data).returning();
  const [user] = await db.select({ username: usersTable.username, avatarUrl: usersTable.avatarUrl, isVerified: usersTable.isVerified }).from(usersTable).where(eq(usersTable.id, proto.userId));
  res.status(201).json(mapPrototype(proto, user?.username ?? null, user?.avatarUrl ?? null, user?.isVerified ?? false));
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
  const [user] = await db.select({ username: usersTable.username, avatarUrl: usersTable.avatarUrl, isVerified: usersTable.isVerified }).from(usersTable).where(eq(usersTable.id, proto.userId));
  const viewerId = req.query.viewerId ? Number(req.query.viewerId) : null;
  const likeCount = await getLikeCount(proto.id);
  const isLiked = viewerId ? await checkLiked(viewerId, proto.id) : false;
  const isSaved = viewerId ? await checkSaved(viewerId, proto.id) : false;
  res.json(mapPrototype(proto, user?.username ?? null, user?.avatarUrl ?? null, user?.isVerified ?? false, likeCount, isLiked, isSaved));
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
  const [user] = await db.select({ username: usersTable.username, avatarUrl: usersTable.avatarUrl, isVerified: usersTable.isVerified }).from(usersTable).where(eq(usersTable.id, proto.userId));
  res.json(mapPrototype(proto, user?.username ?? null, user?.avatarUrl ?? null, user?.isVerified ?? false));
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

// Publish prototype (respects pre-moderation setting)
router.post("/prototypes/:id/publish", async (req, res): Promise<void> => {
  const params = PublishPrototypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // Check pre-moderation setting
  const [preMod] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, "pre_moderation"))
    .limit(1);
  const preModEnabled = preMod?.value === "true";

  const updatePayload = preModEnabled
    ? { published: false, status: "pending" }   // queued for review
    : { published: true, status: "approved" };   // goes live immediately

  const [proto] = await db
    .update(prototypesTable)
    .set(updatePayload)
    .where(eq(prototypesTable.id, params.data.id))
    .returning();
  if (!proto) {
    res.status(404).json({ error: "Prototype not found" });
    return;
  }
  const [user] = await db.select({ username: usersTable.username, avatarUrl: usersTable.avatarUrl, isVerified: usersTable.isVerified }).from(usersTable).where(eq(usersTable.id, proto.userId));
  res.json(mapPrototype(proto, user?.username ?? null, user?.avatarUrl ?? null, user?.isVerified ?? false));
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

  const [user] = await db.select({ username: usersTable.username, avatarUrl: usersTable.avatarUrl, isVerified: usersTable.isVerified }).from(usersTable).where(eq(usersTable.id, proto.userId));
  res.json(mapPrototype(proto, user?.username ?? null, user?.avatarUrl ?? null, user?.isVerified ?? false));
});

// ── Like / Unlike ──────────────────────────────────────────────────────────

router.post("/prototypes/:id/like", async (req, res): Promise<void> => {
  const params = parsePrototypeId(req.params);
  if (!params) { res.status(400).json({ error: "Invalid prototype id" }); return; }
  const body = parseLikeBody(req.body);
  if (!body) { res.status(400).json({ error: "userId required" }); return; }

  const { id: prototypeId } = params;
  const { userId } = body;

  const existing = await db.select().from(likesTable)
    .where(and(eq(likesTable.userId, userId), eq(likesTable.prototypeId, prototypeId)));
  if (existing.length > 0) {
    res.status(409).json({ error: "Already liked" });
    return;
  }

  await db.insert(likesTable).values({ userId, prototypeId });
  const likeCount = await getLikeCount(prototypeId);
  res.json({ likeCount, isLiked: true });
});

router.delete("/prototypes/:id/like", async (req, res): Promise<void> => {
  const params = parsePrototypeId(req.params);
  if (!params) { res.status(400).json({ error: "Invalid prototype id" }); return; }
  const query = parseUserIdQuery(req.query);
  if (!query) { res.status(400).json({ error: "userId required" }); return; }

  const { id: prototypeId } = params;
  const { userId } = query;

  await db.delete(likesTable)
    .where(and(eq(likesTable.userId, userId), eq(likesTable.prototypeId, prototypeId)));
  const likeCount = await getLikeCount(prototypeId);
  res.json({ likeCount, isLiked: false });
});

// ── Save / Unsave ──────────────────────────────────────────────────────────

router.post("/prototypes/:id/save", async (req, res): Promise<void> => {
  const params = parsePrototypeId(req.params);
  if (!params) { res.status(400).json({ error: "Invalid prototype id" }); return; }
  const body = parseLikeBody(req.body);
  if (!body) { res.status(400).json({ error: "userId required" }); return; }

  const { id: prototypeId } = params;
  const { userId } = body;

  const existing = await db.select().from(savesTable)
    .where(and(eq(savesTable.userId, userId), eq(savesTable.prototypeId, prototypeId)));
  if (existing.length > 0) {
    res.status(409).json({ error: "Already saved" });
    return;
  }

  await db.insert(savesTable).values({ userId, prototypeId });
  res.json({ ok: true });
});

router.delete("/prototypes/:id/save", async (req, res): Promise<void> => {
  const params = parsePrototypeId(req.params);
  if (!params) { res.status(400).json({ error: "Invalid prototype id" }); return; }
  const query = parseUserIdQuery(req.query);
  if (!query) { res.status(400).json({ error: "userId required" }); return; }

  const { id: prototypeId } = params;
  const { userId } = query;

  await db.delete(savesTable)
    .where(and(eq(savesTable.userId, userId), eq(savesTable.prototypeId, prototypeId)));
  res.json({ ok: true });
});

// ── Get Saves ──────────────────────────────────────────────────────────────

router.get("/saves", async (req, res): Promise<void> => {
  const query = parseUserIdQuery(req.query);
  if (!query) { res.status(400).json({ error: "userId required" }); return; }

  const { userId } = query;

  const savedRows = await db.select({ prototypeId: savesTable.prototypeId })
    .from(savesTable)
    .where(eq(savesTable.userId, userId))
    .orderBy(desc(savesTable.createdAt));

  if (savedRows.length === 0) {
    res.json({ total: 0, items: [] });
    return;
  }

  const prototypeIds = savedRows.map(r => r.prototypeId);
  const protos = await db.select().from(prototypesTable)
    .where(inArray(prototypesTable.id, prototypeIds));

  // Preserve save order
  const protoMap = Object.fromEntries(protos.map(p => [p.id, p]));
  const ordered = prototypeIds.map(id => protoMap[id]).filter(Boolean);

  const userIds = [...new Set(ordered.map(p => p.userId))];
  const users = userIds.length > 0
    ? await db.select({ id: usersTable.id, username: usersTable.username, avatarUrl: usersTable.avatarUrl, isVerified: usersTable.isVerified })
        .from(usersTable)
        .where(inArray(usersTable.id, userIds))
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // Get like counts and isLiked for all protos at once
  const likeCounts = await getLikeCounts(prototypeIds);
  const likedSet = await getLikedSet(userId, prototypeIds);

  res.json({
    total: ordered.length,
    items: ordered.map(p => {
      const u = userMap[p.userId];
      return mapPrototype(p, u?.username ?? null, u?.avatarUrl ?? null, u?.isVerified ?? false, likeCounts[p.id] ?? 0, likedSet.has(p.id), true);
    }),
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function getLikeCount(prototypeId: number): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(likesTable)
    .where(eq(likesTable.prototypeId, prototypeId));
  return count ?? 0;
}

async function getLikeCounts(prototypeIds: number[]): Promise<Record<number, number>> {
  if (prototypeIds.length === 0) return {};
  const rows = await db
    .select({ prototypeId: likesTable.prototypeId, count: sql<number>`cast(count(*) as integer)` })
    .from(likesTable)
    .where(inArray(likesTable.prototypeId, prototypeIds))
    .groupBy(likesTable.prototypeId);
  return Object.fromEntries(rows.map(r => [r.prototypeId, r.count]));
}

async function checkLiked(userId: number, prototypeId: number): Promise<boolean> {
  const rows = await db.select().from(likesTable)
    .where(and(eq(likesTable.userId, userId), eq(likesTable.prototypeId, prototypeId)));
  return rows.length > 0;
}

async function getLikedSet(userId: number, prototypeIds: number[]): Promise<Set<number>> {
  if (prototypeIds.length === 0) return new Set();
  const rows = await db.select({ prototypeId: likesTable.prototypeId })
    .from(likesTable)
    .where(and(eq(likesTable.userId, userId), inArray(likesTable.prototypeId, prototypeIds)));
  return new Set(rows.map(r => r.prototypeId));
}

async function getSavedSet(userId: number, prototypeIds: number[]): Promise<Set<number>> {
  if (prototypeIds.length === 0) return new Set();
  const rows = await db.select({ prototypeId: savesTable.prototypeId })
    .from(savesTable)
    .where(and(eq(savesTable.userId, userId), inArray(savesTable.prototypeId, prototypeIds)));
  return new Set(rows.map(r => r.prototypeId));
}

async function checkSaved(userId: number, prototypeId: number): Promise<boolean> {
  const rows = await db.select().from(savesTable)
    .where(and(eq(savesTable.userId, userId), eq(savesTable.prototypeId, prototypeId)));
  return rows.length > 0;
}

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

  // Optional viewer — used to boost posts from followed users and show like/save state
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

  const visibilityFilter = and(
    eq(prototypesTable.published, true),
    notInArray(prototypesTable.status, ["hidden", "deleted", "pending"]),
  );
  const baseWhere = q
    ? and(
        visibilityFilter,
        or(ilike(prototypesTable.title, `%${q}%`), ilike(prototypesTable.description, `%${q}%`), ilike(prototypesTable.category, `%${q}%`)),
      )
    : visibilityFilter;

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
      ? await db.select({ id: usersTable.id, username: usersTable.username, avatarUrl: usersTable.avatarUrl, isVerified: usersTable.isVerified }).from(usersTable)
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const protoIds = ranked.map(p => p.id);
  const likeCounts = await getLikeCounts(protoIds);
  const likedSet = viewerId ? await getLikedSet(viewerId, protoIds) : new Set<number>();
  const savedSet = viewerId ? await getSavedSet(viewerId, protoIds) : new Set<number>();

  res.json({
    total,
    items: ranked.map((p) => {
      const u = userMap[p.userId];
      return mapPrototype(
        p,
        u?.username ?? null,
        u?.avatarUrl ?? null,
        u?.isVerified ?? false,
        likeCounts[p.id] ?? 0,
        likedSet.has(p.id),
        savedSet.has(p.id),
      );
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
  creatorIsVerified: boolean = false,
  likeCount: number = 0,
  isLiked: boolean = false,
  isSaved: boolean = false,
) {
  return {
    id: p.id,
    userId: p.userId,
    username,
    creatorAvatarUrl,
    creatorIsVerified,
    title: p.title,
    description: p.description,
    prompt: p.prompt,
    generatedContent: p.generatedContent,
    imageUrl: p.imageUrl,
    mediaUrls: p.mediaUrls,
    audioUrl: p.audioUrl,
    published: p.published,
    status: p.status,
    category: p.category,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    likeCount,
    isLiked,
    isSaved,
  };
}

export default router;
