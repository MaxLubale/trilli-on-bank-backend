import express from 'express'
import Stripe from 'stripe';
import dotenv from 'dotenv';
import prisma from '../prismaClient.js'; // Prisma client instance

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

const addUser = async (req, res) => {
  const { email, id } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).send({ success: false, message: 'User not found' });

    const existing = await prisma.others.findUnique({ where: { userId: id } });

    if (existing) {
      await prisma.otherUser.create({
        data: {
          userId: user.id.toString(),
          email: user.email,
          img: user.userImg || '',
          name: user.firstName,
          others: { connect: { id: existing.id } }
        }
      });
    } else {
      await prisma.others.create({
        data: {
          userId: parseInt(id),
          users: {
            create: [{
              userId: user.id.toString(),
              email: user.email,
              img: user.userImg || '',
              name: user.firstName
            }]
          }
        }
      });
    }

    res.send({ success: true, message: 'add user success' });
  } catch (error) {
    console.error(error);
    res.send({ success: false, message: 'invalid user' });
  }
};

const quickTransfer = async (req, res) => {
  const { id, userId, amount } = req.body;

  try {
    const card = await prisma.card.findFirst({ where: { userId: parseInt(id) } });
    const senderWallet = await prisma.wallet.findUnique({ where: { userId: parseInt(id) } });

    if (!senderWallet || senderWallet.balance < amount) {
      return res.send({ success: false, message: 'insufficient balance' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      payment_method: card?.paymentMethodId,
      customer: senderWallet.customerId,
      amount,
      currency: 'usd',
      confirm: true,
      payment_method_types: ['card'],
    });

    if (paymentIntent.status === 'succeeded') {
      const remaining = senderWallet.balance - amount;

      await prisma.wallet.update({
        where: { userId: parseInt(id) },
        data: { balance: remaining }
      });

      await prisma.pay.update({
        where: { userId: parseInt(id) },
        data: {
          payments: {
            create: {
              paymentIntentId: paymentIntent.id,
              type: 'payment',
              amount: paymentIntent.amount,
              created: paymentIntent.created
            }
          }
        }
      });

      const receiverWallet = await prisma.wallet.findUnique({ where: { userId: parseInt(userId) } });

      if (receiverWallet) {
        await prisma.wallet.update({
          where: { userId: parseInt(userId) },
          data: { balance: receiverWallet.balance + amount }
        });

        await prisma.pay.update({
          where: { userId: parseInt(userId) },
          data: {
            payments: {
              create: {
                paymentIntentId: paymentIntent.id,
                type: 'add credit',
                amount: paymentIntent.amount,
                created: paymentIntent.created
              }
            }
          }
        });
      }

      res.send({ success: true, message: 'payment successfully' });
    }
  } catch (error) {
    console.error(error);
    res.send({ success: false, message: 'transfer failed' });
  }
};

const userDetails = async (req, res) => {
  const { id } = req.body;

  try {
    const others = await prisma.others.findUnique({
      where: { userId: parseInt(id) },
      include: { users: true }
    });

    if (!others) return res.send({ success: false });
    res.send({ data: others, success: true });
  } catch (error) {
    console.error(error);
    res.send({ success: false });
  }
};

const uDetails = async (req, res) => {
  const { id } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.send({ success: false });
    res.send(user);
  } catch (error) {
    console.error(error);
    res.send({ success: false });
  }
};

const Transferdetails = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { phoneNumber: parseInt(phoneNumber) } });
    if (!user) return res.send({ success: false });

    res.send({ success: true, id: user.id });
  } catch (error) {
    console.error(error);
    res.send({ success: false });
  }
};

// ROUTES
router.post('/adduser', addUser);
router.post('/adduserdetails', userDetails);
router.post('/udetails', uDetails);
router.post('/transferdetails', Transferdetails);
router.post('/quicktransfer', quickTransfer);

export { router as addUser };
