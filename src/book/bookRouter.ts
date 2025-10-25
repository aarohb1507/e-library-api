import path from "node:path";
import { fileURLToPath } from "node:url"; // ⬅️ ESM-safe __dirname
import multer from "multer";
import express from "express";
import { createBook } from "./bookController";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // ⬅️ now usable below

const bookRouter = express.Router();

// multer middleware
const upload = multer({
  dest: path.resolve(__dirname, "../../public/data/uploads"),
  limits: { fileSize: 3e7 }, // 30MB
});

// routes
bookRouter.post(
  "/",
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  createBook
);

export default bookRouter;
