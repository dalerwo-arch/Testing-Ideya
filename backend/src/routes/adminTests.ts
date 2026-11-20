import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/errors";

export const adminTestsRouter = Router();

const idParam = (v: unknown) => z.string().uuid().parse(v);

const testSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  durationMinutes: z.number().int().min(1).max(600),
  isPublished: z.boolean().optional(),
  groupIds: z.array(z.string().uuid()).optional(),
});

const testInclude = {
  assignments: { include: { group: true } },
  _count: { select: { questions: true, attempts: true } },
} as const;

function shapeTest<T extends { assignments: { group: { id: string; name: string } }[] }>(t: T) {
  const { assignments, ...rest } = t;
  return { ...rest, groups: assignments.map((a) => ({ id: a.group.id, name: a.group.name })) };
}

adminTestsRouter.get(
  "/tests",
  asyncHandler(async (_req, res) => {
    const tests = await prisma.test.findMany({ orderBy: { createdAt: "desc" }, include: testInclude });
    res.json(tests.map(shapeTest));
  })
);

adminTestsRouter.post(
  "/tests",
  asyncHandler(async (req, res) => {
    const d = testSchema.parse(req.body);
    const test = await prisma.test.create({
      data: {
        title: d.title,
        description: d.description || null,
        durationMinutes: d.durationMinutes,
        isPublished: d.isPublished ?? false,
        assignments: { create: (d.groupIds || []).map((groupId) => ({ groupId })) },
      },
      include: testInclude,
    });
    res.status(201).json(shapeTest(test));
  })
);

adminTestsRouter.get(
  "/tests/:id",
  asyncHandler(async (req, res) => {
    const test = await prisma.test.findUnique({
      where: { id: idParam(req.params.id) },
      include: {
        ...testInclude,
        questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } },
      },
    });
    if (!test) throw new HttpError(404, "NOT_FOUND", "Тест ёфт нашуд.");
    res.json(shapeTest(test));
  })
);

adminTestsRouter.patch(
  "/tests/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const d = testSchema.partial().parse(req.body);

    if (d.isPublished) {
      const questions = await prisma.question.findMany({ where: { testId: id }, include: { options: true } });
      const valid = questions.length > 0 && questions.every((q) => q.options.length >= 2 && q.options.some((o) => o.isCorrect));
      if (!valid) {
        throw new HttpError(400, "TEST_INCOMPLETE", "Барои нашр тест бояд камаш як савол дошта бошад ва ҳар савол ҷавоби дуруст дошта бошад.");
      }
    }

    const test = await prisma.$transaction(async (tx) => {
      if (d.groupIds) {
        await tx.testAssignment.deleteMany({ where: { testId: id } });
        await tx.testAssignment.createMany({ data: d.groupIds.map((groupId) => ({ testId: id, groupId })) });
      }
      return tx.test.update({
        where: { id },
        data: {
          title: d.title,
          description: d.description,
          durationMinutes: d.durationMinutes,
          isPublished: d.isPublished,
        },
        include: testInclude,
      });
    });
    res.json(shapeTest(test));
  })
);

adminTestsRouter.delete(
  "/tests/:id",
  asyncHandler(async (req, res) => {
    await prisma.test.delete({ where: { id: idParam(req.params.id) } });
    res.json({ ok: true });
  })
);

// ---- Саволҳо ----
const questionSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  options: z
    .array(z.object({ text: z.string().trim().min(1).max(500), isCorrect: z.boolean() }))
    .min(2)
    .max(10),
});

function assertOneCorrect(options: { isCorrect: boolean }[]) {
  const correct = options.filter((o) => o.isCorrect).length;
  if (correct !== 1) throw new HttpError(400, "ONE_CORRECT_REQUIRED", "Барои ҳар савол айнан як ҷавоби дуруст лозим аст.");
}

async function assertNoAttempts(testId: string) {
  const n = await prisma.attempt.count({ where: { testId } });
  if (n > 0) {
    throw new HttpError(409, "TEST_HAS_ATTEMPTS", "Тест аллакай супорида шудааст; саволҳоро тағйир додан мумкин нест.");
  }
}

adminTestsRouter.post(
  "/tests/:id/questions",
  asyncHandler(async (req, res) => {
    const testId = idParam(req.params.id);
    const d = questionSchema.parse(req.body);
    assertOneCorrect(d.options);
    await assertNoAttempts(testId);
    const last = await prisma.question.findFirst({ where: { testId }, orderBy: { position: "desc" } });
    const q = await prisma.question.create({
      data: {
        testId,
        text: d.text,
        position: (last?.position ?? -1) + 1,
        options: { create: d.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, position: i })) },
      },
      include: { options: { orderBy: { position: "asc" } } },
    });
    res.status(201).json(q);
  })
);

adminTestsRouter.put(
  "/questions/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const d = questionSchema.parse(req.body);
    assertOneCorrect(d.options);
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Савол ёфт нашуд.");
    await assertNoAttempts(existing.testId);
    const q = await prisma.$transaction(async (tx) => {
      await tx.option.deleteMany({ where: { questionId: id } });
      return tx.question.update({
        where: { id },
        data: {
          text: d.text,
          options: { create: d.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, position: i })) },
        },
        include: { options: { orderBy: { position: "asc" } } },
      });
    });
    res.json(q);
  })
);

adminTestsRouter.delete(
  "/questions/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Савол ёфт нашуд.");
    await assertNoAttempts(existing.testId);
    await prisma.question.delete({ where: { id } });
    res.json({ ok: true });
  })
);
