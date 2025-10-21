import express from 'express'

const userRouter = express.Router()


//routes

userRouter.post('/register',(req, res)=> {
  res.json({
    message: "user registered"
  })
})
export default userRouter