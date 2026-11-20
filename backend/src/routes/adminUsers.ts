import { Router } from "express";
import { Prisma, UserStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, publicUser } from "../lib/auth";
import { asyncHandler, HttpError } from "../lib/errors";
import { finalizeAttempt } from "../lib/exam";

export const adminUsersRouter = Router();

const idParam = (v: unknown) => z.string().uuid().parse(v);

adminUsersRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [students, pending, locked, tests, attempts, groups] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { status: "LOCKED" } }),
      prisma.test.count(),
      prisma.attempt.count(),
      prisma.group.count(),
    ]);
    res.json({ students, pending, locked, tests, attempts, groups });
  })
);

// ---- Корбарон ----
adminUsersRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        search: z.string().trim().optional(),
        status: z.nativeEnum(UserStatus).optional(),
        role: z.enum(["STUDENT", "ADMIN"]).optional(),
        groupId: z.string().uuid().optional(),
      })
      .parse(req.query);

    const where: Prisma.UserWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.role) where.role = q.role;
    if (q.groupId) where.groupId = q.groupId;
    if (q.search) {
      where.OR = [
        { fullName: { contains: q.search, mode: "insensitive" } },
        { email: { contains: q.search, mode: "insensitive" } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      include: { group: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    res.json(users.map(publicUser));
  })
);

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(6).max(100),
  groupId: z.string().uuid().optional().nullable(),
  role: z.enum(["STUDENT", "ADMIN"]).default("STUDENT"),
});

adminUsersRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    const d = createSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: d.email } });
    if (exists) throw new HttpError(409, "EMAIL_EXISTS", "Ин Email аллакай сабт шудааст.");
    const user = await prisma.user.create({
      data: {
        fullName: d.fullName,
        email: d.email,
        passwordHash: await hashPassword(d.password),
        groupId: d.groupId || null,
        role: d.role,
        status: "ACTIVE",
      },
      include: { group: true },
    });
    res.status(201).json(publicUser(user));
  })
);

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(200).optional(),
  groupId: z.string().uuid().nullable().optional(),
  // Админ метавонад пароли НАВ таъин кунад, вале пароли кӯҳнаро намебинад.
  newPassword: z.string().min(6).max(100).optional(),
});

adminUsersRouter.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const d = updateSchema.parse(req.body);
    if (d.email) {
      const other = await prisma.user.findUnique({ where: { email: d.email } });
      if (other && other.id !== id) throw new HttpError(409, "EMAIL_EXISTS", "Ин Email аллакай сабт шудааст.");
    }
    const user = await prisma.user.update({
      where: { id },
      data: {
        fullName: d.fullName,
        email: d.email,
        groupId: d.groupId,
        passwordHash: d.newPassword ? await hashPassword(d.newPassword) : undefined,
      },
      include: { group: true },
    });
    res.json(publicUser(user));
  })
);

adminUsersRouter.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    if (id === req.user!.id) throw new HttpError(400, "CANNOT_SELF", "Худро нест карда намешавад.");
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  })
);

async function setStatus(id: string, status: UserStatus, lockReason: string | null = null) {
  const user = await prisma.user.update({ where: { id }, data: { status, lockReason }, include: { group: true } });
  return publicUser(user);
}

adminUsersRouter.post(
  "/users/:id/approve",
  asyncHandler(async (req, res) => res.json(await setStatus(idParam(req.params.id), "ACTIVE")))
);
adminUsersRouter.post(
  "/users/:id/reject",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    if (id === req.user!.id) throw new HttpError(400, "CANNOT_SELF", "Худро рад карда намешавад.");
    res.json(await setStatus(id, "REJECTED"));
  })
);
adminUsersRouter.post(
  "/users/:id/lock",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    if (id === req.user!.id) throw new HttpError(400, "CANNOT_SELF", "Худро маҳкам карда намешавад.");
    res.json(await setStatus(id, "LOCKED", "Аз тарафи админ маҳкам шуд"));
  })
);
adminUsersRouter.post(
  "/users/:id/unlock",
  asyncHandler(async (req, res) => res.json(await setStatus(idParam(req.params.id), "ACTIVE")))
);

adminUsersRouter.post(
  "/users/:id/promote",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: idParam(req.params.id) },
      data: { role: "ADMIN", status: "ACTIVE" },
      include: { group: true },
    });
    res.json(publicUser(user));
  })
);

adminUsersRouter.post(
  "/users/:id/demote",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    if (id === req.user!.id) throw new HttpError(400, "CANNOT_SELF", "Ҳуқуқи худро кам карда намешавад.");
    const user = await prisma.user.update({ where: { id }, data: { role: "STUDENT" }, include: { group: true } });
    res.json(publicUser(user));
  })
);

// Таърихи воридшавӣ ва имтиҳонҳои як корбар
adminUsersRouter.get(
  "/users/:id/history",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const [logins, attempts] = await Promise.all([
      prisma.loginLog.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.attempt.findMany({
        where: { userId: id },
        include: { test: { select: { title: true } } },
        orderBy: { startedAt: "desc" },
      }),
    ]);
    res.json({ logins, attempts });
  })
);

adminUsersRouter.get(
  "/login-logs",
  asyncHandler(async (_req, res) => {
    const logs = await prisma.loginLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { user: { select: { fullName: true } } },
    });
    res.json(logs);
  })
);

// ---- Гурӯҳҳо ----
const groupSchema = z.object({ name: z.string().trim().min(1).max(80) });

adminUsersRouter.get(
  "/groups",
  asyncHandler(async (_req, res) => {
    const groups = await prisma.group.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true, assignments: true } } },
    });
    res.json(groups);
  })
);
adminUsersRouter.post(
  "/groups",
  asyncHandler(async (req, res) => {
    const { name } = groupSchema.parse(req.body);
    res.status(201).json(await prisma.group.create({ data: { name } }));
  })
);
adminUsersRouter.patch(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const { name } = groupSchema.parse(req.body);
    res.json(await prisma.group.update({ where: { id: idParam(req.params.id) }, data: { name } }));
  })
);
adminUsersRouter.delete(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    await prisma.group.delete({ where: { id: idParam(req.params.id) } });
    res.json({ ok: true });
  })
);

// Истифодаи finalizeAttempt барои имтиҳони қатъшуда (ҳангоми маҳкамкунии админ)
adminUsersRouter.post(
  "/users/:id/terminate-active",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const active = await prisma.attempt.findMany({ where: { userId: id, status: "IN_PROGRESS" } });
    for (const a of active) await finalizeAttempt(a.id, "TERMINATED");
    res.json({ ok: true, terminated: active.length });
  })
);
