import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { Role } from "@prisma/client"; // used in TokenPayload
import { config } from "../config";
import { AppError } from "./errorHandler";
import { ErrorCode, AuthenticatedUser } from "../types";
import { prisma } from "../lib/prisma";

/**
 * JWT payload — used ONLY for identity resolution.
 * Role, ban status, mute status are NEVER trusted from the token;
 * they are always fetched from the database on every request.
 */
interface TokenPayload {
  sub: string;
  organizationId: string;
  tokenVersion: number;
  jti?: string;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(
        new AppError(401, ErrorCode.UNAUTHORIZED, "Bearer token required")
      );
    }

    const token = header.slice(7);
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, config.auth.jwtSecret) as TokenPayload;
    } catch {
      return next(
        new AppError(401, ErrorCode.UNAUTHORIZED, "Invalid or expired token")
      );
    }

    // Check token revocation (logout)
    if (payload.jti) {
      const revoked = await prisma.revokedToken.findUnique({
        where: { jti: payload.jti },
      });
      if (revoked) {
        return next(
          new AppError(401, ErrorCode.TOKEN_REVOKED, "Token has been revoked")
        );
      }
    }

    // Fetch FRESH user state from DB on every request
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        organizationId: true,
        username: true,
        role: true,
        isBanned: true,
        muteUntil: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      return next(
        new AppError(401, ErrorCode.UNAUTHORIZED, "User no longer exists")
      );
    }

    // Verify tokenVersion matches — moderation/role changes bump this
    if (user.tokenVersion !== payload.tokenVersion) {
      return next(
        new AppError(
          401,
          ErrorCode.TOKEN_REVOKED,
          "Token invalidated by account state change"
        )
      );
    }

    // Enforce ban at the middleware level — banned users cannot use ANY endpoint
    if (user.isBanned) {
      return next(
        new AppError(403, ErrorCode.USER_BANNED, "Account is banned")
      );
    }

    // Populate req.user from DB — NOT from token claims
    req.user = {
      id: user.id,
      organizationId: user.organizationId,
      username: user.username,
      role: user.role,
      isBanned: user.isBanned,
      muteUntil: user.muteUntil,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, "Authentication required");
    }
    if (!roles.includes(req.user.role as string)) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        `Required role: ${roles.join(" or ")}`
      );
    }
    next();
  };
}

export function signToken(user: { id: string; organizationId: string; tokenVersion?: number }): string {
  const payload: TokenPayload = {
    sub: user.id,
    organizationId: user.organizationId,
    tokenVersion: user.tokenVersion ?? 0,
    jti: uuidv4(),
  };
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}
