import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import userModel from "./userModel";
import bcrypt from "bcrypt";
import { config } from "../config/config";
import jwt from "jsonwebtoken";
import type { User } from "./userTypes";

// small helper so both register & login use the same signing logic
function signAccessToken(userId: string) {
  if (!config.jwtSecret) throw new Error("JWT secret not configured");
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return next(createHttpError(400, "All fields are required"));
  }

  try {
    const existing = await userModel.findOne({ email });
    if (existing) return next(createHttpError(409, "User already exists"));
  } catch {
    return next(createHttpError(500, "Error while checking existing user"));
  }

  const hash = await bcrypt.hash(password, 10);

  let newUser: User;
  try {
    newUser = await userModel.create({ name, email, password: hash });
  } catch {
    return next(createHttpError(500, "Error while creating user"));
  }

  try {
    const accessToken = signAccessToken(String(newUser._id));
    return res.status(201).json({ accessToken });
  } catch {
    return next(createHttpError(500, "Error while signing JWT token"));
  }
};

// LOGIN
const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(createHttpError(400, "All fields are required"));
  }

  let user: User | null;
  try {
    user = await userModel.findOne({ email }).lean();
    // For security, avoid revealing if email exists; use generic error:
    if (!user) return next(createHttpError(401, "Invalid email or password"));
  } catch {
    return next(createHttpError(500, "Error while finding user"));
  }

  const ok = await bcrypt.compare(password, user!.password);
  if (!ok) return next(createHttpError(401, "Invalid email or password"));

  try {
    const accessToken = signAccessToken(String(user!._id));
    // return token (and optionally user profile fields if you want)
    return res.json({ accessToken });
  } catch {
    return next(createHttpError(500, "Error while signing JWT token"));
  }
};

export { createUser, loginUser };
