import { eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { subscriptions, users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null
) {
  try {
    const existingCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    const isFirstUser = Number(existingCount[0]?.count ?? 0) === 0;
    const isDesignatedAdmin =
      email.trim().toLowerCase() === 'sgtamil099@gmail.com';
    const shouldBeAdmin = isFirstUser || isDesignatedAdmin;

    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        role: shouldBeAdmin ? 'admin' : 'creator',
        plan: shouldBeAdmin ? 'studio' : 'pro',
        credits: shouldBeAdmin ? 10000 : 2500,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(isDesignatedAdmin ? { role: 'admin', plan: 'studio' } : {}),
          ...(displayName ? { displayName } : {}),
        },
      })
      .returning();

    const user = result[0];

    const existingSub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (existingSub.length === 0) {
      const renewDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      await db.insert(subscriptions).values({
        userId: user.id,
        plan: user.plan,
        monthlyPriceUsd: user.plan === 'studio' ? 99 : 29,
        gpuQuotaHours: user.plan === 'studio' ? 120 : 25,
        status: 'active',
        renewDate,
      });
    }

    return user;
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Failed to fetch user profile.', { cause: error });
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed in getAllUsers:', error);
    throw new Error('Failed to retrieve user directory.', { cause: error });
  }
}

export async function updateUserRoleOrPlan(
  targetUserId: number,
  updates: { role?: string; plan?: string; credits?: number }
) {
  try {
    const rows = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, targetUserId))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in updateUserRoleOrPlan:', error);
    throw new Error('Failed to update user account.', { cause: error });
  }
}
