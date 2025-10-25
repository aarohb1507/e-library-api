import path from "node:path"
import multer from 'multer';
import express from "express";
import { createBook } from "./bookController";

const bookRouter = express.Router();

//multer middleware create
const upload = multer({
  dest:path.resolve(__dirname,"../../public/data/uploads"),
  limits: {fileSize: 3e7}
})
//routes

bookRouter.post("/", upload.fields([
  {name: 'coverImage', maxCount: 1},
  {name: 'file', maxCount: 1},
]),createBook);

export default bookRouter;
