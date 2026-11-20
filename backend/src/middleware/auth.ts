import { NextFunction, Request, Response } from "express";
import { Role, User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../lib/auth";
import { HttpError } from "../lib/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) throw new HttpError(401, "UNAUTHORIZED", "Воридшавӣ лозим аст.");

    let payload: { sub: string; role: Role };
    try {
      payload = verifyToken(token);
    } catch {
      throw new HttpError(401, "UNAUTHORIZED", "Токен нодуруст ё кӯҳна шудааст.");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new HttpError(401, "UNAUTHORIZED", "Корбар ёфт нашуд.");
    if (user.status === "LOCKED") throw new HttpError(403, "ACCOUNT_LOCKED", "Аккаунт маҳкам аст.");
    if (user.status === "PENDING") throw new HttpError(403, "ACCOUNT_PENDING", "Аккаунт ҳанӯз тасдиқ нашудааст.");
    if (user.status === "REJECTED") throw new HttpError(403, "ACCOUNT_REJECTED", "Аккаунт рад карда шудааст.");

    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return next(new HttpError(403, "FORBIDDEN", "Дастрасӣ манъ аст."));
    }
    next();
  };
}
