import express from "express";
import dotenv from "dotenv";
import Stripe from "stripe";

// Mongoose Models (Replace with Prisma client if you're migrating)
import Card from "../models/cardModel.js";
import User from "../models/userModel.js";
import Wallet from "../models/walletModel.js";
import Pay from "../models/paymentModel.js";

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Utility to respond with error
const handleError = (res, error, message = "Server error", status = 500) => {
  console.error(error);
  return res.status(status).send({ success: false, message });
};

// 1. Create Stripe Customer + Wallet
router.post("/createuser", async (req, res) => {
  const { id } = req.body;

  try {
    const existingWallet = await Wallet.findOne({ userId: id });
    if (existingWallet) {
      return res.send({ success: true, message: "Wallet already created." });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).send({ success: false, message: "User not found" });

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.firstName,
      phone: user.phoneNumber,
    });

    const wallet = new Wallet({ userId: id, customerId: customer.id });
    await wallet.save();

    res.status(200).send({ success: true, message: "Customer created successfully" });
  } catch (error) {
    return handleError(res, error);
  }
});

// 2. Add Payment Method
router.post("/paymentmethod", async (req, res) => {
  const { id, token, name } = req.body;

  try {
    const wallet = await Wallet.findOne({ userId: id });
    if (!wallet) return res.status(404).send({ success: false, message: "Wallet not found" });

    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: { token },
    });

    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: wallet.customerId,
    });

    const cardData = {
      userId: id,
      paymentMethodId: paymentMethod.id,
      cardNumber: paymentMethod.card.last4,
      expireData: `${paymentMethod.card.exp_month}/${paymentMethod.card.exp_year}`,
      holderName: name,
    };

    await Card.findOneAndUpdate({ userId: id }, cardData, { upsert: true });

    res.status(200).send({ success: true, message: "Payment method added successfully" });
  } catch (error) {
    return handleError(res, error);
  }
});

// 3. Get Card Details
router.post("/carddetails", async (req, res) => {
  const { id } = req.body;
  try {
    const card = await Card.findOne({ userId: id });
    if (!card) return res.status(404).send({ success: false, message: "No card on file" });

    res.send(card);
  } catch (error) {
    return handleError(res, error);
  }
});

// 4. Add Credit to Wallet
router.post("/addcredit", async (req, res) => {
  const { id, total } = req.body;

  try {
    const card = await Card.findOne({ userId: id });
    const wallet = await Wallet.findOne({ userId: id });
    const user = await User.findById(id);
    if (!card || !wallet || !user) return res.status(404).send({ success: false, message: "Missing card/wallet/user info" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      confirm: true,
      payment_method: card.paymentMethodId,
      customer: wallet.customerId,
      receipt_email: user.email,
    });

    if (paymentIntent.status === "succeeded") {
      wallet.balance += total;
      await wallet.save();

      const paymentRecord = {
        paymentIntentId: paymentIntent.id,
        type: "add credit",
        amount: paymentIntent.amount,
        created: paymentIntent.created,
      };

      await Pay.findOneAndUpdate(
        { userId: id },
        { $push: { payments: paymentRecord } },
        { upsert: true }
      );

      res.status(200).send({ success: true, message: "Credit added successfully" });
    }
  } catch (error) {
    return handleError(res, error);
  }
});

// 5. Pay with Balance
router.post("/nexpayment", async (req, res) => {
  const { id, total } = req.body;

  try {
    const wallet = await Wallet.findOne({ userId: id });
    const card = await Card.findOne({ userId: id });

    if (wallet.balance < total) {
      return res.send({ success: false, message: "Insufficient balance" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      confirm: true,
      payment_method: card.paymentMethodId,
      customer: wallet.customerId,
    });

    if (paymentIntent.status === "succeeded") {
      wallet.balance -= total;
      await wallet.save();

      const paymentRecord = {
        paymentIntentId: paymentIntent.id,
        type: "payment",
        amount: paymentIntent.amount,
        created: paymentIntent.created,
      };

      await Pay.findOneAndUpdate(
        { userId: id },
        { $push: { payments: paymentRecord } },
        { upsert: true }
      );

      res.status(200).send({ success: true, message: "Payment successful" });
    }
  } catch (error) {
    return handleError(res, error);
  }
});

// 6. Show Wallet Balance
router.post("/balance", async (req, res) => {
  const { id } = req.body;
  try {
    const wallet = await Wallet.findOne({ userId: id });
    const balance = wallet?.balance || 0;
    res.send({ success: true, balance });
  } catch (error) {
    return handleError(res, error);
  }
});

// 7. Payment History
router.post("/paymenthistory", async (req, res) => {
  const { id } = req.body;
  try {
    const history = await Pay.findOne({ userId: id });
    if (!history) return res.send({ success: false, message: "No payment history" });

    res.send(history);
  } catch (error) {
    return handleError(res, error);
  }
});

export default router;
