import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/userModel.js";

dotenv.config();
const router = express.Router();

// Email validation helper
const isValidEmail = (email) =>
  /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(email);

// Basic phone number validation (Kenyan format or general 10+ digits)
const isValidPhone = (phone) => /^[\d\s+\-()]{10,}$/.test(phone);

const registerController = async (req, res) => {
  const {
    firstName = "",
    lastName = "",
    email = "",
    phoneNumber = "",
    NIC = "",
    password = "",
    confirmPassword = "",
  } = req.body;

  const trimmedEmail = email.trim().toLowerCase();

  // Field checks
  if (
    !firstName ||
    !lastName ||
    !trimmedEmail ||
    !phoneNumber ||
    !NIC ||
    !password ||
    !confirmPassword
  ) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  if (!isValidEmail(trimmedEmail)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address." });
  }

  if (!isValidPhone(phoneNumber)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone number format." });
  }

  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Passwords do not match." });
  }

  try {
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "Email is already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      email: trimmedEmail,
      phoneNumber,
      NIC,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ userId: savedUser._id }, process.env.SECRETKEY, {
      expiresIn: "7d", // optional
    });

    // Return success with token and user info
    return res.status(201).json({
      success: true,
      message: "Signup successful.",
      token,
      user: {
        id: savedUser._id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error. Please try again." });
  }
};

router.post("/register", registerController);

export { router as registerRoutes };
