import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, conversationsTable, messagesTable, usersTable } from "@workspace/db";
import {
  ListConversationsQueryParams,
  CreateConversationBody,
  ListMessagesParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List conversations for a user
router.get("/conversations", async (req, res): Promise<void> => {
  const parsed = ListConversationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId } = parsed.data;
  const convos = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.initiatorId, userId),
        eq(conversationsTable.recipientId, userId),
      ),
    )
    .orderBy(conversationsTable.createdAt);

  // Enrich with usernames and verification status
  const userIds = Array.from(new Set(convos.flatMap((c) => [c.initiatorId, c.recipientId])));
  const users =
    userIds.length > 0
      ? await db.select({ id: usersTable.id, username: usersTable.username, isVerified: usersTable.isVerified }).from(usersTable)
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  res.json(
    convos.map((c) => ({
      id: c.id,
      initiatorId: c.initiatorId,
      recipientId: c.recipientId,
      initiatorUsername: userMap[c.initiatorId]?.username ?? null,
      recipientUsername: userMap[c.recipientId]?.username ?? null,
      initiatorIsVerified: userMap[c.initiatorId]?.isVerified ?? false,
      recipientIsVerified: userMap[c.recipientId]?.isVerified ?? false,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    })),
  );
});

// Start a conversation
router.post("/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [convo] = await db.insert(conversationsTable).values(parsed.data).returning();
  const users = await db
    .select({ id: usersTable.id, username: usersTable.username, isVerified: usersTable.isVerified })
    .from(usersTable)
    .where(
      or(
        eq(usersTable.id, convo.initiatorId),
        eq(usersTable.id, convo.recipientId),
      ),
    );
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  res.status(201).json({
    id: convo.id,
    initiatorId: convo.initiatorId,
    recipientId: convo.recipientId,
    initiatorUsername: userMap[convo.initiatorId]?.username ?? null,
    recipientUsername: userMap[convo.recipientId]?.username ?? null,
    initiatorIsVerified: userMap[convo.initiatorId]?.isVerified ?? false,
    recipientIsVerified: userMap[convo.recipientId]?.isVerified ?? false,
    lastMessage: null,
    lastMessageAt: null,
    createdAt: convo.createdAt.toISOString(),
  });
});

// List messages in a conversation
router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  const senderIds = Array.from(new Set(msgs.map((m) => m.senderId)));
  const senders =
    senderIds.length > 0
      ? await db.select({ id: usersTable.id, username: usersTable.username, isVerified: usersTable.isVerified }).from(usersTable)
      : [];
  const senderMap = Object.fromEntries(senders.map((u) => [u.id, u]));

  res.json(
    msgs.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderUsername: senderMap[m.senderId]?.username ?? null,
      senderIsVerified: senderMap[m.senderId]?.isVerified ?? false,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

// Send a message
router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [msg] = await db
    .insert(messagesTable)
    .values({ conversationId: params.data.id, senderId: parsed.data.senderId, content: parsed.data.content })
    .returning();
  // Update conversation last message
  await db
    .update(conversationsTable)
    .set({ lastMessage: parsed.data.content, lastMessageAt: new Date() })
    .where(eq(conversationsTable.id, params.data.id));

  const [sender] = await db
    .select({ username: usersTable.username, isVerified: usersTable.isVerified })
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.senderId));
  res.status(201).json({
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    senderUsername: sender?.username ?? null,
    senderIsVerified: sender?.isVerified ?? false,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  });
});

export default router;
