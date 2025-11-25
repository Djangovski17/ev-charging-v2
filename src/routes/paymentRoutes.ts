import { Router } from 'express';
import { createPaymentIntentHandler } from '../controllers/paymentController';

const router = Router();

router.post('/create-payment-intent', createPaymentIntentHandler);

export default router;

