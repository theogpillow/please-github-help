/**
 * Promote a user to admin (or demote them).
 * Usage:  pnpm --filter @workspace/db run make-admin <username> [--revoke]
 *
 * Example:
 *   pnpm --filter @workspace/db run make-admin john
 *   pnpm --filter @workspace/db run make-admin john --revoke
 */
import { eq } from "drizzle-orm";
import { db, usersTable } from "../src";

async function main() {
  const username = process.argv[2];
  const revoke = process.argv.includes("--revoke");

  if (!username) {
    console.error("Usage: make-admin <username> [--revoke]");
    process.exit(1);
  }

  const [user] = await db
    .update(usersTable)
    .set({ isAdmin: !revoke })
    .where(eq(usersTable.username, username))
    .returning({ id: usersTable.id, username: usersTable.username, isAdmin: usersTable.isAdmin });

  if (!user) {
    console.error(`User "${username}" not found.`);
    process.exit(1);
  }

  console.log(
    `✓ ${user.username} is now ${user.isAdmin ? "an ADMIN" : "a regular user"} (id=${user.id})`,
  );
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
