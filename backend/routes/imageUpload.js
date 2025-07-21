import express from 'express'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'

const router = express.Router()
const prisma = new PrismaClient()

// Setup multer for local file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage })

// Upload controller using Prisma
const imgController = async (req, res) => {
  const id = req.body._id

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        userImg: req.file.originalname
      }
    })

    res.send({
      success: true,
      message: 'Image uploaded successfully',
      imageName: req.file.originalname,
      imagePath: req.file.path
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Error uploading image' })
  }
}

// Route
router.post('/upload', upload.single('image'), imgController)

export { router as imgUpload }
