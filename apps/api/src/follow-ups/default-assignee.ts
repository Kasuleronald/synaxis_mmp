/** Load-balances an auto-generated follow-up (repeat absenteeism, a
 * walk-in's 3rd visit) across every user holding isDefaultFollowUpUser
 * (Sep 2026) -- whoever currently has the fewest PENDING follow-ups
 * assigned gets this one. Null if nobody holds the flag, so the follow-up
 * still gets created (just unassigned) rather than silently dropped. */
export async function pickDefaultFollowUpAssignee(tx: any, organizationId: string): Promise<string | null> {
  const candidates: { id: string }[] = await tx.user.findMany({
    where: { organizationId, isDefaultFollowUpUser: true, isActive: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].id;

  const counts: { assignedToId: string | null; _count: { _all: number } }[] = await tx.followUp.groupBy({
    by: ["assignedToId"],
    where: {
      organizationId,
      status: "PENDING",
      assignedToId: { in: candidates.map((c) => c.id) },
    },
    _count: { _all: true },
  });
  const countByUser = new Map(counts.map((c) => [c.assignedToId, c._count._all]));

  let best = candidates[0];
  let bestCount = countByUser.get(best.id) ?? 0;
  for (const c of candidates.slice(1)) {
    const n = countByUser.get(c.id) ?? 0;
    if (n < bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best.id;
}
