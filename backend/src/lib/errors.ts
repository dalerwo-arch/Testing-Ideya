import { NextFunction, Request, RequestHandler, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message || code);
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "ALREADY_EXISTS", message: "Ин маълумот аллакай мавҷуд аст." });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ёфт нашуд." });
    }
  }
  console.error(err);
  return res.status(500).json({ error: "SERVER_ERROR", message: "Хатои дохилии сервер." });
}
