import { Router, type IRouter } from "express";
import { eq, desc, ilike, and, sql, or } from "drizzle-orm";
import { db, prototypesTable, usersTable } from "@workspace/db";
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

// Get feed
router.get("/feed", async (req, res): Promise<void> => {
  const parsed = GetFeedQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { q, limit = 20, offset = 0 } = parsed.data;

  const baseWhere = q
    ? and(
        eq(prototypesTable.published, true),
        or(ilike(prototypesTable.title, `%${q}%`), ilike(prototypesTable.description, `%${q}%`), ilike(prototypesTable.category, `%${q}%`)),
      )
    : eq(prototypesTable.published, true);

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(prototypesTable)
    .where(baseWhere);

  const protos = await db
    .select()
    .from(prototypesTable)
    .where(baseWhere)
    .orderBy(desc(prototypesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const userIds = [...new Set(protos.map((p) => p.userId))];
  const users =
    userIds.length > 0
      ? await db.select({ id: usersTable.id, username: usersTable.username }).from(usersTable)
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

  res.json({
    total: count,
    items: protos.map((p) => mapPrototype(p, userMap[p.userId] ?? null)),
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

function mapPrototype(p: typeof prototypesTable.$inferSelect, username: string | null) {
  return {
    id: p.id,
    userId: p.userId,
    username,
    title: p.title,
    description: p.description,
    prompt: p.prompt,
    generatedContent: p.generatedContent,
    imageUrl: p.imageUrl,
    mediaUrls: p.mediaUrls,
    published: p.published,
    category: p.category,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
