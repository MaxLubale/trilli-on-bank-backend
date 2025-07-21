import express from "express"
import { PrismaClient } from "@prisma/client"

const router = express.Router()
const prisma = new PrismaClient()

// GET user by email
const homeController = async (req, res) => {
  const { email } = req.params

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.send({ success: false, message: "User not found." })
    }

    return res.send(user)
  } catch (error) {
    console.error(error)
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    })
  }
}

// POST user by ID
const accountController = async (req, res) => {
  const { id } = req.body

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return res.send({ success: false, message: "User not found." })
    }

    return res.send(user)
  } catch (error) {
    console.error(error)
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    })
  }
}

router.get("/home/:email", homeController)
router.get("/details/:email", homeController)
router.post("/details/account", accountController)

export { router as homeRoutes }
