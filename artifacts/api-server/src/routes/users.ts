import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable, prototypesTable } from "@workspace/db";
import {
  ListUsersQueryParams,
  CreateUserBody,
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  ListUserPrototypesParams,
  GetUserStatsParams,
  LoginUserBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List / search users
router.get("/users", async (req, res): Promise<void> => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { q } = parsed.data;
  const users = q
    ? await db
        .select()
        .from(usersTable)
        .where(or(ilike(usersTable.username, `%${q}%`), ilike(usersTable.companyName, `%${q}%`)))
        .limit(50)
    : await db.select().from(usersTable).limit(50);
  res.json(users.map(mapUser));
});

// Login
router.post("/users/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, parsed.data.username))
    .limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  // If the user was created before passwords were added, allow any password
  // and set their password on this login.
  if (!user.passwordHash) {
    const hash = await bcrypt.hash(parsed.data.password, 10);
    const [updated] = await db
      .update(usersTable)
      .set({ passwordHash: hash })
      .where(eq(usersTable.id, user.id))
      .returning();
    if (updated.isBanned) {
      res.status(403).json({ error: "Your account has been suspended. Please contact support." });
      return;
    }
    res.json(mapUser(updated));
    return;
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Wrong password" });
    return;
  }
  if (user.isBanned) {
    res.status(403).json({ error: "Your account has been suspended. Please contact support." });
    return;
  }
  res.json(mapUser(user));
});

// Create user (onboarding / registration)
router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }
  const { password, ...rest } = parsed.data;
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  const [user] = await db.insert(usersTable).values({ ...rest, passwordHash }).returning();
  res.status(201).json(mapUser(user));
});

// Get user profile
router.get("/users/:username", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, params.data.username));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(mapUser(user));
});

// Update user
router.patch("/users/:username", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.username, params.data.username))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(mapUser(user));
});

// List user prototypes
router.get("/users/:username/prototypes", async (req, res): Promise<void> => {
  const params = ListUserPrototypesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, params.data.username)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const protos = await db
    .select()
    .from(prototypesTable)
    .where(eq(prototypesTable.userId, user.id))
    .orderBy(prototypesTable.createdAt);
  res.json(protos.map((p) => mapPrototype(p, params.data.username)));
});

// User stats
router.get("/users/:username/stats", async (req, res): Promise<void> => {
  const params = GetUserStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, params.data.username)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const protos = await db.select().from(prototypesTable).where(eq(prototypesTable.userId, user.id));
  const prototypeCount = protos.length;
  const publishedCount = protos.filter((p) => p.published).length;
  res.json({ prototypeCount, publishedCount });
});

function mapUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    bio: u.bio,
    companyName: u.companyName,
    companyBio: u.companyBio,
    avatarUrl: u.avatarUrl,
    isAdmin: u.isAdmin,
    isVerified: u.isVerified,
    isBanned: u.isBanned,
    createdAt: u.createdAt.toISOString(),
  };
}

function mapPrototype(p: typeof prototypesTable.$inferSelect, username?: string | null) {
  return {
    id: p.id,
    userId: p.userId,
    username: username ?? null,
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
  };
}

export default router;
export { mapUser, mapPrototype };
