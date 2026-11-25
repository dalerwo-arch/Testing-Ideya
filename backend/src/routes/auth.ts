import { Router, Request } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, publicUser, signToken, verifyPassword } from "../lib/auth";
import { asyncHandler, HttpError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { config } from "../lib/config";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS", message: "Дархостҳо аз ҳад зиёд. Як дақиқа интизор шавед." },
});

async function logLogin(req: Request, email: string, success: boolean, userId?: string, reason?: string) {
  try {
    await prisma.loginLog.create({
      data: {
        email,
        success,
        userId: userId ?? null,
        reason: reason ?? null,
        ip: req.ip ?? null,
        userAgent: (req.headers["user-agent"] || "").toString().slice(0, 250) || null,
      },
    });
  } catch (e) {
    console.error("loginLog error", e);
  }
}

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(6).max(100),
  groupId: z.string().uuid().optional().nullable(),
});

authRouter.get(
  "/groups",
  asyncHandler(async (_req, res) => {
    const groups = await prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
    res.json(groups);
  })
);

authRouter.get("/config", (_req, res) => {
  res.json({ googleClientId: config.googleClientId || null, maxExamEntries: config.maxExamEntries });
});

authRouter.post(
  "/register",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new HttpError(409, "EMAIL_EXISTS", "Ин Email аллакай сабт шудааст.");

    if (data.groupId) {
      const g = await prisma.group.findUnique({ where: { id: data.groupId } });
      if (!g) throw new HttpError(400, "GROUP_NOT_FOUND", "Гурӯҳ ёфт нашуд.");
    }

    await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        passwordHash: await hashPassword(data.password),
        groupId: data.groupId || null,
        role: "STUDENT",
        status: "PENDING",
      },
    });
    res.status(201).json({ ok: true, status: "PENDING" });
  })
);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  as: z.enum(["student", "admin"]).default("student"),
});

authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, as } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email }, include: { group: true } });

    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      await logLogin(req, email, false, user?.id, "INVALID_CREDENTIALS");
      throw new HttpError(401, "INVALID_CREDENTIALS", "Email ё парол нодуруст аст.");
    }

    const wantedRole = as === "admin" ? "ADMIN" : "STUDENT";
    if (user.role !== wantedRole) {
      await logLogin(req, email, false, user.id, "WRONG_ROLE");
      throw new HttpError(403, "WRONG_ROLE", as === "admin" ? "Ин аккаунт админ нест." : "Ин аккаунт донишҷӯ нест. Воридшавӣ ҳамчун админро интихоб кунед.");
    }

    if (user.status !== "ACTIVE") {
      const code = `ACCOUNT_${user.status}`;
      await logLogin(req, email, false, user.id, code);
      throw new HttpError(403, code, "Аккаунт фаъол нест.");
    }

    await logLogin(req, email, true, user.id);
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

/**
 * Google Login (ихтиёрӣ, танҳо бо интернет).
 * Frontend `credential` (ID token)-ро мефиристад; мо онро тавассути Google тафтиш мекунем.
 */
authRouter.post(
  "/google",
  loginLimiter,
  asyncHandler(async (req, res) => {
    if (!config.googleClientId) throw new HttpError(404, "GOOGLE_DISABLED", "Google Login танзим нашудааст.");
    const { credential } = z.object({ credential: z.string().min(10) }).parse(req.body);

    let info: { aud?: string; email?: string; email_verified?: string | boolean; name?: string; sub?: string } = {};
    try {
      const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new HttpError(401, "GOOGLE_INVALID", "Токени Google нодуруст аст.");
      info = (await r.json()) as typeof info;
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(503, "GOOGLE_OFFLINE", "Google дастнорас аст (интернет нест).");
    }

    const verified = info.email_verified === true || info.email_verified === "true";
    if (info.aud !== config.googleClientId || !info.email || !info.sub || !verified) {
      throw new HttpError(401, "GOOGLE_INVALID", "Токени Google нодуруст аст.");
    }
    const email = info.email.toLowerCase();

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: info.sub }, { email }] },
      include: { group: true },
    });

    if (!user) {
      await prisma.user.create({
        data: { email, fullName: info.name || email, googleId: info.sub, role: "STUDENT", status: "PENDING" },
      });
      await logLogin(req, email, false, undefined, "ACCOUNT_PENDING");
      throw new HttpError(403, "ACCOUNT_PENDING", "Сабти ном анҷом ёфт. Интизори тасдиқи админ шавед.");
    }

    if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: info.sub }, include: { group: true } });
    }
    if (user.role !== "STUDENT") {
      throw new HttpError(403, "WRONG_ROLE", "Админ бояд бо Email ва парол ворид шавад.");
    }
    if (user.status !== "ACTIVE") {
      const code = `ACCOUNT_${user.status}`;
      await logLogin(req, email, false, user.id, code);
      throw new HttpError(403, code, "Аккаунт фаъол нест.");
    }

    await logLogin(req, email, true, user.id, "GOOGLE");
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { group: true } });
    res.json(publicUser(user!));
  })
);

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = z
      .object({ currentPassword: z.string().min(1), newPassword: z.string().min(6).max(100) })
      .parse(req.body);
    const user = req.user!;
    if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new HttpError(400, "INVALID_CREDENTIALS", "Пароли ҷорӣ нодуруст аст.");
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    res.json({ ok: true });
  })
);

authRouter.patch(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        fullName: z.string().trim().min(2).max(120).optional(),
        email: z.string().trim().toLowerCase().email().max(200).optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(6).max(100).optional(),
      })
      .parse(req.body);

    if (data.email) {
      const exists = await prisma.user.findUnique({ where: { email: data.email } });
      if (exists && exists.id !== req.user!.id) {
        throw new HttpError(409, "EMAIL_EXISTS", "Ин Email аллакай сабт шудааст.");
      }
    }
    if (data.newPassword) {
      if (!req.user!.passwordHash || !(await verifyPassword(data.currentPassword || "", req.user!.passwordHash))) {
        throw new HttpError(400, "INVALID_CREDENTIALS", "Пароли ҷорӣ нодуруст аст.");
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.newPassword ? { passwordHash: await hashPassword(data.newPassword) } : {}),
      },
      include: { group: true },
    });
    res.json(publicUser(updated));
  })
);
