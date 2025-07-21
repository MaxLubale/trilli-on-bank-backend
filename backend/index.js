import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { PrismaClient } from "@prisma/client"
import { registerRoutes } from "./routes/registerRoute.js"
import { loginRoutes } from "./routes/loginRoute.js"
import { otpGenerate } from "./routes/otp_generator.js"
import { otpVerify } from "./routes/otp_verify.js"
import { homeRoutes } from "./routes/homeRoute.js"
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'
import { imgUpload } from "./routes/imageUpload.js"
import { imgDisplay } from "./routes/imageDisplay.js"
import router from "./routes/paymentRoute.js"
import { addPin } from "./routes/addPinRoute.js"
import { addUser } from "./routes/addUsers.js"
import { reset } from "./routes/resetPassword.js"

dotenv.config()
const PORT = process.env.PORT || 3000 
const app = express()
const prisma = new PrismaClient()  // Prisma initialization

// Make prisma accessible via request object (optional utility)
app.use((req, res, next) => {
  req.prisma = prisma
  next()
})

app.use(cors())
app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Static uploads directory
const uploadsDirectory = path.join(__dirname, 'uploads')
app.use('/uploads', express.static(uploadsDirectory))

// Register all routes
app.use("/api", registerRoutes)
app.use("/api", loginRoutes)
app.use("/api", otpGenerate)
app.use("/api", otpVerify)
app.use("/api", homeRoutes)
app.use("/api", imgUpload)
app.use("/api", imgDisplay)
app.use("/api", router)
app.use("/api", addPin)
app.use("/api", addUser)
app.use("/api", reset)

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`)
})
