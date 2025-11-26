import { Express } from 'express';
import healthRoutes from './healthRoutes';
import startRoutes from './startRoutes';
import paymentRoutes from './paymentRoutes';
import adminRoutes from './adminRoutes';

export const registerRoutes = (app: Express): void => {
  // Rejestracja routingu - kolejność ma znaczenie!
  // Najpierw specyficzne ścieżki, potem ogólne
  app.use('/health', healthRoutes);
  app.use('/admin', adminRoutes);
  app.use('/', startRoutes); // /stop/:stationId będzie tutaj
  app.use('/', paymentRoutes);
  
  // Handler 404 dla niezarejestrowanych route'ów
  app.use((req, res) => {
    console.log(`[404] Nie znaleziono route'a: ${req.method} ${req.path}`);
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.path}`,
    });
  });
};

