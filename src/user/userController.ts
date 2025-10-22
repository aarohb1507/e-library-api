import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import userModel from "./userModel";
import bcrypt from "bcrypt";
import { config } from "../config/config";
import jwt from "jsonwebtoken";
import type { User } from "./userTypes";



const createUser = async (req: Request, res: Response, next: NextFunction) => {
  //validation
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    const error = createHttpError(400, "All fields are required ");
    return next(error);
  }
  //database call
  try {
    const user = await userModel.findOne({ email });

    if (user) {
      const error = createHttpError(400, "User already exists");
      return next(error);
    }
  } catch (err) {
    return next(createHttpError(500, "error while getting user"));
  }

  //pssword hashing
  const hashPassword = await bcrypt.hash(password, 10);

  let newUser: User;
  try {
    newUser = await userModel.create({
      name,
      email,
      password: hashPassword,
    });
  } catch (err) {
    return next(createHttpError(500, "error while creating user"));
  }

  //process

  try {
    //token generation
    const token = jwt.sign({ sub: newUser._id }, config.jwtSecret as string, {
      expiresIn: "7d",
      algorithm: "HS256",
    });

    //response
    res.status(201).json({
      accessToken: token,
    });
  } catch (err) {
    return next(createHttpError(500, "error while signing jwt token"));
  }
  
};
//LOGIN ENDPOINTS:

const loginUser = async(req:Request, res:Response, next:NextFunction)=>{
  const {email, password} = req.body
//all fields 
  if(!email || !password){
    return next(createHttpError(400, "All fields are required"))
  }
//finding if exist
let user
  try{
      user = await userModel.findOne({ email })
  if(!user){
    return next(createHttpError(404, "no such email exists"))
  }
  }catch(err){
    return next(createHttpError(500, "error while finding user email"))
  }
  //match passwords
  const isMatch = await bcrypt.compare(password, user.password)
  if(!isMatch){
    return next(createHttpError(404, "passwords don't match"))
  }
 //token issue
  
  res.json({
    message:"ok dokay"
  })
}


export {createUser, loginUser};


