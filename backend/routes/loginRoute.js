import express from "express"
import dotenv from "dotenv"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import User from "../models/userModel.js"

dotenv.config()
const router = express.Router()

const loginController = async (req, res) => {
  const { email, password } = req.body

  try {
    const validUser = await User.findOne({ email })
    if (!validUser) {
      return res.status(404).send({ success: false, message: "User not found." })
    }

    const isPasswordValid = await bcrypt.compare(password, validUser.password)
    if (!isPasswordValid) {
      return res.status(401).send({ success: false, message: "Wrong credentials." })
    }

    const token = jwt.sign({ userId: validUser._id }, process.env.SECRETKEY, { expiresIn: '7d' })

    res
      .cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })
      .status(200)
      .send({
        success: true,
        message: "Login successful.",
        token,
        id: validUser._id,
        email: validUser.email
      })
  } catch (error) {
    console.error(error)
    res.status(500).send({ success: false, message: "Server error." })
  }
}

router.post("/login", loginController)

export { router as loginRoutes }
