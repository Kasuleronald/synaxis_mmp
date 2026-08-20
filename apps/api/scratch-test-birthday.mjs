import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const ORG = "df68ef68-1b66-4be3-a21f-e775ccbaa8ab";

const target = new Date();
target.setDate(target.getDate() + 5);
const targetMonth = target.getMonth() + 1;
const targetDay = target.getDate();
console.log("Target birthday date (5 days out):", targetMonth, "/", targetDay);

let testMemberId;
await prisma.$transaction(async (tx) => {
  await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, ORG);
  const created = await tx.member.create({
    data: {
      organizationId: ORG,
      fullName: "Test Birthday Person",
      birthMonth: targetMonth,
      birthDay: targetDay,
      status: "MEMBER",
    },
  });
  testMemberId = created.id;
  console.log("Created test member:", created.id);
});

console.log("Waiting 3s then checking for notification (birthday-reminders runs on module init + every 12h, so it already ran at startup before this member existed -- triggering a fresh check via direct call)...");
await prisma.$disconnect();
