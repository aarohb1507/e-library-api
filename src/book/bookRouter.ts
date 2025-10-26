// src/book/bookRouter.ts
import path from "node:path";
import { fileURLToPath } from "node:url"; // ESM-safe __dirname
import express from "express";
import multer from "multer";
import {
  createBook,
  updateBook,
  listBooks,
  getSingleBook,
  deleteBook,
} from "./bookController";
import authenticate from "../middlewares/authenticate"; // <-- if your export is named, change to: { authenticate }

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bookRouter = express.Router();

// Multer temp storage (local) — controller uploads to Cloudinary then unlinks
const upload = multer({
  dest: path.resolve(__dirname, "../../public/data/uploads"),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
});

// /api/books
bookRouter.post(
  "/",
  authenticate,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "file", maxCount: 1 }, // PDF
  ]),
  createBook
);

bookRouter.patch(
  "/:bookId",
  authenticate,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "file", maxCount: 1 }, // PDF
  ]),
  updateBook
);

bookRouter.get("/", listBooks);
bookRouter.get("/:bookId", getSingleBook);

bookRouter.delete("/:bookId", authenticate, deleteBook);

export default bookRouter;
