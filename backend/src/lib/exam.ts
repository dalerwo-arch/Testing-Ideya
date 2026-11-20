import { AttemptStatus } from "@prisma/client";
import { prisma } from "./prisma";

/** Имтиҳонро ба охир мерасонад ва хол ҳисоб мекунад. */
export async function finalizeAttempt(attemptId: string, status: AttemptStatus) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt) return null;
  if (attempt.status !== "IN_PROGRESS") return attempt;

  const [total, score] = await Promise.all([
    prisma.question.count({ where: { testId: attempt.testId } }),
    prisma.attemptAnswer.count({ where: { attemptId, isCorrect: true } }),
  ]);

  return prisma.attempt.update({
    where: { id: attemptId },
    data: { status, finishedAt: new Date(), score, total },
  });
}

export function attemptEndsAt(startedAt: Date, durationMinutes: number): Date {
  return new Date(startedAt.getTime() + durationMinutes * 60_000);
}
