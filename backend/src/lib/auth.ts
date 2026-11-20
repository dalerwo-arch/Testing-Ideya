import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role, User } from "@prisma/client";
import { config } from "./config";

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export function signToken(user: Pick<User, "id" | "role">): string {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): { sub: string; role: Role } {
  return jwt.verify(token, config.jwtSecret) as unknown as { sub: string; role: Role };
}

/** Маълумоти корбар бе ҳеҷ гуна ҳаш/пароль. */
export function publicUser(u: User & { group?: { id: string; name: string } | null }) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    status: u.status,
    lockReason: u.lockReason,
    groupId: u.groupId,
    group: u.group ? { id: u.group.id, name: u.group.name } : null,
    hasGoogle: !!u.googleId,
    createdAt: u.createdAt,
  };
}
