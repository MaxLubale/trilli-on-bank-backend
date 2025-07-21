// utils/otp.js
import nodemailer from "nodemailer"

export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()

export const sendOtpEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  await transporter.sendMail({
    from: `"MyApp" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset OTP",
    html: `<p>Your OTP is: <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  })
}
