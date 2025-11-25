import { Request, Response } from 'express';
import { createPaymentIntent } from '../services/stripeService';
import { logError, logInfo } from '../services/logger';

export const createPaymentIntentHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number') {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Amount is required and must be a number',
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Amount must be greater than 0',
      });
      return;
    }

    logInfo('[Payment] Creating payment intent', { amount });

    const result = await createPaymentIntent({ amount });

    logInfo('[Payment] Payment intent created', { id: result.id });

    res.json({
      id: result.id,
      clientSecret: result.clientSecret,
    });
  } catch (error) {
    logError('[Payment] Failed to create payment intent', error);

    if (error instanceof Error) {
      if (error.message.includes('STRIPE_SECRET_KEY')) {
        res.status(500).json({
          error: 'Server configuration error',
          message: 'Stripe API key is not configured',
        });
        return;
      }

      res.status(500).json({
        error: 'Payment processing error',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Payment processing error',
      message: 'An unexpected error occurred',
    });
  }
};

