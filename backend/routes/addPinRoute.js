import express from 'express'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

// Add/Update PIN
const addPinController = async (req, res) => {
  const { email, pin } = req.body

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { pin },
    })

    res.status(200).send({
      success: true,
      message: 'Pin added successfully',
    })
  } catch (error) {
    console.error(error)
    res.status(500).send({
      success: false,
      message: 'Server error',
    })
  }
}

// Verify PIN
const pinVerify = async (req, res) => {
  const { pin, email } = req.body

  try {
    const user = await prisma.user.findFirst({
      where: { pin },
    })

    if (!user) {
      return res.status(404).send({
        success: false,
        message: 'Invalid',
      })
    }

    if (user.email === email) {
      return res.status(200).send({
        success: true,
        message: 'Pin verified successfully',
        email: user.email,
        id: user.id,
      })
    } else {
      return res.status(404).send({
        success: false,
        message: 'Pin is invalid',
      })
    }
  } catch (error) {
    console.error(error)
    res.status(500).send({
      success: false,
      message: 'Server error',
    })
  }
}

router.post('/addpin', addPinController)
router.post('/pinverify', pinVerify)

export { router as addPin }
