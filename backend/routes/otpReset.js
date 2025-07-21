// routes/otpReset.js
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { generateOtp, sendOtpEmail } from '../utils/otp.js'
import bcrypt from 'bcrypt'

const router = express.Router()
const prisma = new PrismaClient()

router.post('/request-reset', async (req, res) => {
  const { email } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(404).send({ success: false, message: "User not found" })

  const otp = generateOtp()
  const expiry = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.user.update({
    where: { email },
    data: { otp, otpExpiry: expiry },
  })

  await sendOtpEmail(email, otp)

  res.send({ success: true, message: "OTP sent to email." })
})

router.post('/reset-password', async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body

  if (password !== confirmPassword)
    return res.send({ success: false, message: "Passwords do not match." })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.otp !== otp || new Date() > new Date(user.otpExpiry)) {
    return res.send({ success: false, message: "Invalid or expired OTP." })
  }

  const hashedPassword = bcrypt.hashSync(password, 10)

  await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      otp: null,
      otpExpiry: null,
    },
  })

  res.send({ success: true, message: "Password reset successfully." })
})

export { router as otpResetRoutes }
