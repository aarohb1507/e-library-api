import express, { type NextFunction, type Request, type Response } from 'express'
import type { HttpError } from 'http-errors'

const app = express()

app.get('/', (req, res, next)=>{
  res.json({
    message: "Welcome to elib apis"
  })
})

//global error handler

app.use((err:HttpError, req:Request, res:Response, next:NextFunction)=>{
  const statusCode = err.statusCode || 500
})
 
export default app;
