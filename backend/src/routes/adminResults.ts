import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/errors";

export const adminResultsRouter = Router();

adminResultsRouter.get(
  "/results",
  asyncHandler(async (req, res) => {
    const q = z
      .object({ testId: z.string().uuid().optional(), groupId: z.string().uuid().optional(), search: z.string().trim().optional() })
      .parse(req.query);

    const where: Prisma.AttemptWhereInput = {};
    if (q.testId) where.testId = q.testId;
    const userWhere: Prisma.UserWhereInput = {};
    if (q.groupId) userWhere.groupId = q.groupId;
    if (q.search) {
      userWhere.OR = [
        { fullName: { contains: q.search, mode: "insensitive" } },
        { email: { contains: q.search, mode: "insensitive" } },
      ];
    }
    if (Object.keys(userWhere).length) where.user = userWhere;

    const attempts = await prisma.attempt.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: 1000,
      include: {
        user: { select: { id: true, fullName: true, email: true, group: { select: { name: true } } } },
        test: { select: { id: true, title: true } },
      },
    });

    // Кӯшиши охирин барои ҳар (корбар, тест) иҷозати аз нав супоридан гирифта метавонад
    const latestKey = new Map<string, number>();
    for (const a of attempts) {
      const key = `${a.userId}:${a.testId}`;
      latestKey.set(key, Math.max(latestKey.get(key) ?? 0, a.attemptNo));
    }
    res.json(
      attempts.map((a) => ({
        id: a.id,
        status: a.status,
        attemptNo: a.attemptNo,
        entryCount: a.entryCount,
        retakeGranted: a.retakeGranted,
        startedAt: a.startedAt,
        finishedAt: a.finishedAt,
        score: a.score,
        total: a.total,
        isLatest: latestKey.get(`${a.userId}:${a.testId}`) === a.attemptNo,
        user: { id: a.user.id, fullName: a.user.fullName, email: a.user.email, group: a.user.group?.name ?? null },
        test: a.test,
      }))
    );
  })
);

adminResultsRouter.get(
  "/attempts/:id",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        user: { select: { fullName: true, email: true } },
        test: {
          include: { questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } } },
        },
        answers: true,
      },
    });
    if (!attempt) throw new HttpError(404, "NOT_FOUND", "Кӯшиш ёфт нашуд.");
    const byQ = new Map(attempt.answers.map((a) => [a.questionId, a.optionId]));
    res.json({
      id: attempt.id,
      status: attempt.status,
      score: attempt.score,
      total: attempt.total,
      entryCount: attempt.entryCount,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      user: attempt.user,
      testTitle: attempt.test.title,
      questions: attempt.test.questions.map((qq) => ({
        id: qq.id,
        text: qq.text,
        selectedOptionId: byQ.get(qq.id) ?? null,
        options: qq.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      })),
    });
  })
);

// Ба донишҷӯ иҷозати нави супоридани тест медиҳад
adminResultsRouter.post(
  "/attempts/:id/allow-retake",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const attempt = await prisma.attempt.findUnique({ where: { id } });
    if (!attempt) throw new HttpError(404, "NOT_FOUND", "Кӯшиш ёфт нашуд.");
    if (attempt.status === "IN_PROGRESS") {
      throw new HttpError(409, "ATTEMPT_IN_PROGRESS", "Имтиҳон ҳанӯз идома дорад.");
    }
    const newer = await prisma.attempt.findFirst({ where: { userId: attempt.userId, testId: attempt.testId, attemptNo: { gt: attempt.attemptNo } } });
    if (newer) throw new HttpError(409, "NOT_LATEST", "Ин кӯшиши охирин нест.");
    await prisma.attempt.update({ where: { id }, data: { retakeGranted: true } });
    res.json({ ok: true });
  })
);

adminResultsRouter.get(
  "/results/export.csv",
  asyncHandler(async (_req, res) => {
    const attempts = await prisma.attempt.findMany({
      orderBy: { startedAt: "desc" },
      include: { user: { select: { fullName: true, email: true, group: { select: { name: true } } } }, test: { select: { title: true } } },
    });
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Full name", "Email", "Group", "Test", "Attempt", "Status", "Score", "Total", "Started", "Finished"].map(esc).join(","),
      ...attempts.map((a) =>
        [a.user.fullName, a.user.email, a.user.group?.name, a.test.title, a.attemptNo, a.status, a.score, a.total, a.startedAt.toISOString(), a.finishedAt?.toISOString()]
          .map(esc)
          .join(",")
      ),
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="results.csv"');
    res.send("﻿" + rows.join("\r\n"));
  })
);
