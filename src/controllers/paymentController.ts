import { Request, Response } from 'express';
import { createPaymentIntent } from '../services/stripeService';
import { logError, logInfo } from '../services/logger';
import { prisma } from '../services/prisma';

export const createPaymentIntentHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { amount, stationId } = req.body;

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

    if (!stationId || typeof stationId !== 'string') {
      res.status(400).json({
        error: 'Invalid request',
        message: 'stationId is required and must be a string',
      });
      return;
    }

    logInfo('[Payment] Creating payment intent', { amount, stationId });

    const result = await createPaymentIntent({ amount });

    logInfo('[Payment] Payment intent created', { id: result.id });

    // Utwórz rekord Transaction w bazie danych
    const amountInZloty = amount / 100; // Konwersja z groszy na złotówki
    const transaction = await prisma.transaction.create({
      data: {
        stripePaymentId: result.id,
        stationId: stationId,
        amount: amountInZloty,
        energyKwh: 0,
        startTime: new Date(),
        status: 'PENDING',
      },
    });

    logInfo('[Payment] Transaction created in database', { 
      transactionId: transaction.id,
      stripePaymentId: result.id 
    });

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

