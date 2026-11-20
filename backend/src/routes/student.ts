import { Request, Router } from "express";
import { Attempt, Test, User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/errors";
import { attemptEndsAt, finalizeAttempt } from "../lib/exam";
import { config } from "../lib/config";

export const studentRouter = Router();

const idParam = (v: unknown) => z.string().uuid().parse(v);

/** Донишҷӯ метавонад танҳо тестҳои нашршудаи гурӯҳи худро бинад. */
async function getAccessibleTest(user: User, testId: string): Promise<Test> {
  if (!user.groupId) throw new HttpError(403, "NO_GROUP", "Шумо ба гурӯҳ вобаста нестед.");
  const test = await prisma.test.findFirst({
    where: { id: testId, isPublished: true, assignments: { some: { groupId: user.groupId } } },
  });
  if (!test) throw new HttpError(404, "NOT_FOUND", "Тест ёфт нашуд ё барои шумо дастрас нест.");
  return test;
}

async function getOwnAttempt(user: User, attemptId: string) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId }, include: { test: true } });
  if (!attempt || attempt.userId !== user.id) throw new HttpError(404, "NOT_FOUND", "Кӯшиш ёфт нашуд.");
  return attempt;
}

/** Агар вақт гузашта бошад, имтиҳонро худкор мебандад. */
async function expireIfNeeded(attempt: Attempt & { test: Test }): Promise<boolean> {
  if (attempt.status !== "IN_PROGRESS") return false;
  const ends = attemptEndsAt(attempt.startedAt, attempt.test.durationMinutes);
  if (Date.now() >= ends.getTime()) {
    await finalizeAttempt(attempt.id, "EXPIRED");
    return true;
  }
  return false;
}

studentRouter.get(
  "/tests",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!user.groupId) return res.json([]);

    const tests = await prisma.test.findMany({
      where: { isPublished: true, assignments: { some: { groupId: user.groupId } } },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true } } },
    });
    const attempts = await prisma.attempt.findMany({
      where: { userId: user.id, testId: { in: tests.map((t) => t.id) } },
      orderBy: { attemptNo: "desc" },
    });

    const result = [];
    for (const t of tests) {
      let latest = attempts.find((a) => a.testId === t.id);
      if (latest && (await expireIfNeeded({ ...latest, test: t }))) {
        latest = (await prisma.attempt.findUnique({ where: { id: latest.id } })) ?? latest;
      }
      let state: "AVAILABLE" | "IN_PROGRESS" | "DONE" = "AVAILABLE";
      if (latest) {
        if (latest.retakeGranted) state = "AVAILABLE";
        else if (latest.status === "IN_PROGRESS") state = "IN_PROGRESS";
        else state = "DONE";
      }
      result.push({
        id: t.id,
        title: t.title,
        description: t.description,
        durationMinutes: t.durationMinutes,
        questionCount: t._count.questions,
        state,
        attemptId: latest && !latest.retakeGranted ? latest.id : null,
        retakeGranted: latest?.retakeGranted ?? false,
      });
    }
    res.json(result);
  })
);

function buildExamPayload(
  attempt: Attempt,
  test: Test,
  questions: { id: string; text: string; options: { id: string; text: string }[] }[],
  answers: { questionId: string; optionId: string }[]
) {
  return {
    attemptId: attempt.id,
    testTitle: test.title,
    durationMinutes: test.durationMinutes,
    startedAt: attempt.startedAt,
    endsAt: attemptEndsAt(attempt.startedAt, test.durationMinutes),
    serverNow: new Date(),
    entryCount: attempt.entryCount,
    maxEntries: config.maxExamEntries,
    questions,
    answers: Object.fromEntries(answers.map((a) => [a.questionId, a.optionId])),
  };
}

async function loadQuestions(testId: string) {
  const qs = await prisma.question.findMany({
    where: { testId },
    orderBy: { position: "asc" },
    include: { options: { orderBy: { position: "asc" }, select: { id: true, text: true } } },
  });
  // isCorrect ҳеҷ гоҳ ба донишҷӯ фиристода намешавад
  return qs.map((q) => ({ id: q.id, text: q.text, options: q.options }));
}

studentRouter.post(
  "/tests/:id/start",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const test = await getAccessibleTest(user, idParam(req.params.id));

    const questionCount = await prisma.question.count({ where: { testId: test.id } });
    if (questionCount === 0) throw new HttpError(400, "TEST_EMPTY", "Дар ин тест савол нест.");

    const latest = await prisma.attempt.findFirst({
      where: { userId: user.id, testId: test.id },
      orderBy: { attemptNo: "desc" },
    });

    let attempt: Attempt;

    if (!latest) {
      attempt = await prisma.attempt.create({ data: { userId: user.id, testId: test.id, attemptNo: 1 } });
    } else if (latest.retakeGranted) {
      // Кӯшиши нав танҳо бо иҷозати админ
      attempt = await prisma.$transaction(async (tx) => {
        await tx.attempt.update({ where: { id: latest.id }, data: { retakeGranted: false } });
        return tx.attempt.create({ data: { userId: user.id, testId: test.id, attemptNo: latest.attemptNo + 1 } });
      });
    } else if (latest.status === "IN_PROGRESS") {
      if (await expireIfNeeded({ ...latest, test })) {
        throw new HttpError(409, "EXAM_EXPIRED", "Вақти имтиҳон тамом шуд.");
      }
      const entries = latest.entryCount + 1;
      if (entries >= config.maxExamEntries) {
        // Воридшавии N-ум: имтиҳон қатъ мешавад ва аккаунт то иҷозати нави админ маҳкам мешавад.
        await prisma.attempt.update({ where: { id: latest.id }, data: { entryCount: entries } });
        await finalizeAttempt(latest.id, "TERMINATED");
        await prisma.user.update({
          where: { id: user.id },
          data: { status: "LOCKED", lockReason: `Ба имтиҳон ${entries} маротиба ворид шуд` },
        });
        throw new HttpError(403, "ACCOUNT_LOCKED_EXAM", "Шумо ба имтиҳон бисёр маротиба ворид шудед. Аккаунт маҳкам шуд.");
      }
      attempt = await prisma.attempt.update({ where: { id: latest.id }, data: { entryCount: entries } });
    } else {
      throw new HttpError(409, "EXAM_ALREADY_TAKEN", "Шумо ин имтиҳонро аллакай супоридед.");
    }

    const [questions, answers] = await Promise.all([
      loadQuestions(test.id),
      prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id }, select: { questionId: true, optionId: true } }),
    ]);
    res.json(buildExamPayload(attempt, test, questions, answers));
  })
);

studentRouter.post(
  "/attempts/:id/answer",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const attempt = await getOwnAttempt(user, idParam(req.params.id));
    const { questionId, optionId } = z.object({ questionId: z.string().uuid(), optionId: z.string().uuid() }).parse(req.body);

    if (attempt.status !== "IN_PROGRESS") throw new HttpError(409, "EXAM_FINISHED", "Имтиҳон анҷом ёфтааст.");
    if (await expireIfNeeded(attempt)) throw new HttpError(410, "EXAM_EXPIRED", "Вақти имтиҳон тамом шуд.");

    const option = await prisma.option.findUnique({ where: { id: optionId }, include: { question: true } });
    if (!option || option.questionId !== questionId || option.question.testId !== attempt.testId) {
      throw new HttpError(400, "INVALID_OPTION", "Ҷавоб ба ин савол тааллуқ надорад.");
    }

    // @@unique([attemptId, questionId]) -> такроран ҷавоб додан мумкин нест (P2002 -> 409)
    const existing = await prisma.attemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
    });
    if (existing) throw new HttpError(409, "ANSWER_LOCKED", "Ҷавобро иваз кардан мумкин нест.");

    await prisma.attemptAnswer.create({
      data: { attemptId: attempt.id, questionId, optionId, isCorrect: option.isCorrect },
    });
    res.status(201).json({ ok: true });
  })
);

async function finish(req: Request, status: "SUBMITTED" | "EXITED") {
  const attempt = await getOwnAttempt(req.user!, idParam(req.params.id));
  if (attempt.status === "IN_PROGRESS") {
    const expired = await expireIfNeeded(attempt);
    if (!expired) await finalizeAttempt(attempt.id, status);
  }
  const done = await prisma.attempt.findUnique({ where: { id: attempt.id } });
  return { status: done!.status, score: done!.score, total: done!.total };
}

studentRouter.post(
  "/attempts/:id/finish",
  asyncHandler(async (req, res) => res.json(await finish(req, "SUBMITTED")))
);

// Баромадан аз тест: имтиҳон баста мешавад ва бе иҷозати админ аз нав супоридан мумкин нест.
studentRouter.post(
  "/attempts/:id/exit",
  asyncHandler(async (req, res) => res.json(await finish(req, "EXITED")))
);

studentRouter.get(
  "/results",
  asyncHandler(async (req, res) => {
    const attempts = await prisma.attempt.findMany({
      where: { userId: req.user!.id, status: { not: "IN_PROGRESS" } },
      orderBy: { startedAt: "desc" },
      include: { test: { select: { title: true } } },
    });
    res.json(
      attempts.map((a) => ({
        id: a.id,
        testTitle: a.test.title,
        status: a.status,
        score: a.score,
        total: a.total,
        startedAt: a.startedAt,
        finishedAt: a.finishedAt,
      }))
    );
  })
);
