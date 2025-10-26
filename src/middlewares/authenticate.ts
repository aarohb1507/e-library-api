// src/middlewares/authenticate.ts

import createHttpError from "http-errors";

import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

import { config } from "../config/config";
import type { NextFunction, Request, Response } from "express";

export interface AuthRequest extends Request {
  userId: string;
}

const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  // Accept both "Bearer <token>" and raw "<token>"
  const authHeader = req.get("authorization") || req.get("Authorization");
  if (!authHeader) {
    return next(createHttpError(401, "Authorization token is required."));
  }

  const parts = authHeader.trim().split(" ");
  const token = parts.length === 2 && /^Bearer$/i.test(parts[0]?? "") ? parts[1] : authHeader.trim();

  if (!token) {
    return next(createHttpError(401, "Authorization token is required."));
  }

  const secret = config.jwtSecret;
  if (!secret) {
    // Misconfiguration – fail fast so you notice it during setup
    return next(createHttpError(500, "JWT secret is not configured."));
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload | string;

    // Usually decoded is a JwtPayload; ensure we extract a user id
    let userId: string | undefined;
    if (typeof decoded !== "string") {
      // Commonly 'sub' is used to store the user id
      userId = (decoded.sub as string) || (decoded["userId"] as string);
    }

    if (!userId) {
      return next(createHttpError(401, "Invalid token payload."));
    }

    (req as AuthRequest).userId = userId;
    return next();
  } catch {
    return next(createHttpError(401, "Token expired or invalid."));
  }
};

export default authenticate;
