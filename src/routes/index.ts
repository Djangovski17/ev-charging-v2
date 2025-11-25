import { Express } from 'express';
import healthRoutes from './healthRoutes';
import startRoutes from './startRoutes';
import paymentRoutes from './paymentRoutes';

export const registerRoutes = (app: Express): void => {
  app.use('/health', healthRoutes);
  app.use('/', startRoutes);
  app.use('/', paymentRoutes);
};

