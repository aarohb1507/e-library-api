// src/book/bookController.ts
import path from "node:path";
import fs from "node:fs";
import type { Request, Response, NextFunction } from "express";
import cloudinary from "../config/cloudinary";
import createHttpError from "http-errors";
import bookModel from "./bookModel";
import type { AuthRequest } from "../middlewares/authenticate";

// A helper type for the multer fields we expect
type UploadFields = Partial<{
  coverImage: Express.Multer.File[];
  file: Express.Multer.File[];
}>;

const createBook = async (req: Request, res: Response, next: NextFunction) => {
  const { title, genre, description } = req.body;

  const files = req.files as UploadFields | undefined;
  const cover = files?.coverImage?.[0];
  const pdf = files?.file?.[0];

  // Compile-time + runtime safety checks
  if (!cover) {
    return next(createHttpError(400, "coverImage file is required (field name: 'coverImage')."));
  }
  if (!pdf) {
    return next(createHttpError(400, "Book PDF is required (field name: 'file')."));
  }

  // Safe extraction with fallbacks
  const coverExt = cover.mimetype?.split("/").pop() || "png";
  const coverFileName = cover.filename;
  const coverFilePath = path.resolve(__dirname, "../../public/data/uploads", coverFileName);

  const pdfFileName = pdf.filename;
  const pdfFilePath = path.resolve(__dirname, "../../public/data/uploads", pdfFileName);

  try {
    // Upload cover image
    const uploadCover = await cloudinary.uploader.upload(coverFilePath, {
      filename_override: coverFileName,
      folder: "book-covers",
      format: coverExt,
    });

    // Upload PDF as raw
    const uploadPdf = await cloudinary.uploader.upload(pdfFilePath, {
      resource_type: "raw",
      filename_override: pdfFileName,
      folder: "book-pdfs",
      format: "pdf",
    });

    const _req = req as AuthRequest;

    const newBook = await bookModel.create({
      title,
      description,
      genre,
      author: _req.userId,
      coverImage: uploadCover.secure_url,
      file: uploadPdf.secure_url,
    });

    // Best-effort cleanup - don't fail the request if cleanup fails
    // since the book is already created successfully
    try {
      await fs.promises.unlink(coverFilePath);
    } catch (err) {
      console.warn("Failed to delete temporary cover file:", err);
    }
    
    try {
      await fs.promises.unlink(pdfFilePath);
    } catch (err) {
      console.warn("Failed to delete temporary PDF file:", err);
    }

    return res.status(201).json({ id: newBook._id });
  } catch (err) {
    console.error(err);
    return next(createHttpError(500, "Error while creating book"));
  }
};

const updateBook = async (req: Request, res: Response, next: NextFunction) => {
  const { title, description, genre } = req.body;
  const bookId = req.params.bookId;

  try {
    const book = await bookModel.findOne({ _id: bookId });
    if (!book) return next(createHttpError(404, "Book not found"));

    // Access control
    const _req = req as AuthRequest;
    if (book.author.toString() !== _req.userId) {
      return next(createHttpError(403, "You cannot update others' books."));
    }

    const files = req.files as UploadFields | undefined;
    const cover = files?.coverImage?.[0];
    const pdf = files?.file?.[0];

    let coverUrl = book.coverImage;
    let fileUrl = book.file;

    // Upload new cover if provided
    if (cover) {
      try {
        const coverExt = cover.mimetype?.split("/").pop() || "png";
        const coverPath = path.resolve(__dirname, "../../public/data/uploads", cover.filename);
        
        const uploaded = await cloudinary.uploader.upload(coverPath, {
          filename_override: cover.filename,
          folder: "book-covers",
          format: coverExt,
        });
        coverUrl = uploaded.secure_url;

        // Cleanup temporary file
        try {
          await fs.promises.unlink(coverPath);
        } catch (cleanupErr) {
          console.warn("Failed to delete temporary cover file:", cleanupErr);
        }

        // Delete old cover from Cloudinary
        const oldCoverSplits = book.coverImage.split("/");
        const oldCoverFile = oldCoverSplits.at(-1) ?? "";
        const oldCoverFolder = oldCoverSplits.at(-2) ?? "book-covers";
        const oldCoverPublicId = `${oldCoverFolder}/${oldCoverFile.split(".").slice(0, -1).join(".")}`;

        try {
          await cloudinary.uploader.destroy(oldCoverPublicId);
        } catch (deleteErr) {
          console.warn("Failed to delete old cover from Cloudinary:", deleteErr);
        }
      } catch (err) {
        console.error(err);
        return next(createHttpError(500, "Error uploading cover image"));
      }
    }

    // Upload new PDF if provided
    if (pdf) {
      try {
        const pdfPath = path.resolve(__dirname, "../../public/data/uploads", pdf.filename);
        
        const uploadedPdf = await cloudinary.uploader.upload(pdfPath, {
          resource_type: "raw",
          filename_override: pdf.filename,
          folder: "book-pdfs",
          format: "pdf",
        });
        fileUrl = uploadedPdf.secure_url;

        // Cleanup temporary file
        try {
          await fs.promises.unlink(pdfPath);
        } catch (cleanupErr) {
          console.warn("Failed to delete temporary PDF file:", cleanupErr);
        }

        // Delete old PDF from Cloudinary
        const oldFileSplits = book.file.split("/");
        const oldFileFolder = oldFileSplits.at(-2) ?? "book-pdfs";
        const oldFilePublicId = `${oldFileFolder}/${oldFileSplits.at(-1) ?? ""}`;

        try {
          await cloudinary.uploader.destroy(oldFilePublicId, { resource_type: "raw" });
        } catch (deleteErr) {
          console.warn("Failed to delete old PDF from Cloudinary:", deleteErr);
        }
      } catch (err) {
        console.error(err);
        return next(createHttpError(500, "Error uploading PDF file"));
      }
    }

    const updatedBook = await bookModel.findOneAndUpdate(
      { _id: bookId },
      {
        title,
        description,
        genre,
        coverImage: coverUrl,
        file: fileUrl,
      },
      { new: true }
    );

    return res.json(updatedBook);
  } catch (err) {
    console.error(err);
    return next(createHttpError(500, "Error updating book"));
  }
};

const listBooks = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const books = await bookModel.find().populate("author", "name");
    return res.json(books);
  } catch (err) {
    console.error(err);
    return next(createHttpError(500, "Error while getting books"));
  }
};

const getSingleBook = async (req: Request, res: Response, next: NextFunction) => {
  const bookId = req.params.bookId;

  try {
    const book = await bookModel.findOne({ _id: bookId }).populate("author", "name");
    if (!book) return next(createHttpError(404, "Book not found."));
    return res.json(book);
  } catch (err) {
    console.error(err);
    return next(createHttpError(500, "Error while getting a book"));
  }
};

const deleteBook = async (req: Request, res: Response, next: NextFunction) => {
  const bookId = req.params.bookId;

  try {
    const book = await bookModel.findOne({ _id: bookId });
    if (!book) return next(createHttpError(404, "Book not found"));

    const _req = req as AuthRequest;
    if (book.author.toString() !== _req.userId) {
      return next(createHttpError(403, "You cannot delete others' books."));
    }

    // Derive Cloudinary public IDs safely
    const coverSplits = book.coverImage.split("/");
    const coverFileLast = coverSplits.at(-1) ?? "";
    const coverFolder = coverSplits.at(-2) ?? "book-covers";
    const coverPublicId = `${coverFolder}/${coverFileLast.split(".").slice(0, -1).join(".")}`;

    const fileSplits = book.file.split("/");
    const fileFolder = fileSplits.at(-2) ?? "book-pdfs";
    const filePublicId = `${fileFolder}/${fileSplits.at(-1) ?? ""}`;

    // Delete from Cloudinary (best-effort)
    try {
      await cloudinary.uploader.destroy(coverPublicId);
    } catch (e) {
      console.warn("Failed to delete cover from Cloudinary:", e);
    }
    
    try {
      await cloudinary.uploader.destroy(filePublicId, { resource_type: "raw" });
    } catch (e) {
      console.warn("Failed to delete PDF from Cloudinary:", e);
    }

    await bookModel.deleteOne({ _id: bookId });
    return res.sendStatus(204);
  } catch (err) {
    console.error(err);
    return next(createHttpError(500, "Error while deleting book"));
  }
};

export { createBook, updateBook, listBooks, getSingleBook, deleteBook };
