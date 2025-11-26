import { Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { logError, logInfo } from '../services/logger';

export const getStations = async (_req: Request, res: Response): Promise<void> => {
  try {
    logInfo('[Admin] Fetching all stations');
    const stations = await prisma.station.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(stations);
  } catch (error) {
    logError('[Admin] Failed to fetch stations', error);
    res.status(500).json({
      error: 'Failed to fetch stations',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
};

export const createStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, connectorType, pricePerKwh, status } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        error: 'Invalid request',
        message: 'name is required and must be a string',
      });
      return;
    }

    if (!connectorType || typeof connectorType !== 'string') {
      res.status(400).json({
        error: 'Invalid request',
        message: 'connectorType is required and must be a string',
      });
      return;
    }

    if (!pricePerKwh || typeof pricePerKwh !== 'number') {
      res.status(400).json({
        error: 'Invalid request',
        message: 'pricePerKwh is required and must be a number',
      });
      return;
    }

    if (pricePerKwh <= 0) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'pricePerKwh must be greater than 0',
      });
      return;
    }

    logInfo('[Admin] Creating new station', { id, name, connectorType, pricePerKwh });

    const stationData: {
      name: string;
      connectorType: string;
      pricePerKwh: number;
      status: string;
      id?: string;
    } = {
      name,
      connectorType,
      pricePerKwh,
      status: status || 'AVAILABLE',
    };

    // Jeśli ID zostało podane, użyj go (inaczej Prisma wygeneruje UUID)
    if (id && typeof id === 'string') {
      stationData.id = id;
    }

    const station = await prisma.station.create({
      data: stationData,
    });

    logInfo('[Admin] Station created successfully', { stationId: station.id });
    res.status(201).json(station);
  } catch (error) {
    logError('[Admin] Failed to create station', error);

    // Sprawdź czy to błąd duplikacji ID
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({
        error: 'Duplicate station ID',
        message: 'A station with this ID already exists',
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to create station',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
};

export const getTransactions = async (_req: Request, res: Response): Promise<void> => {
  try {
    logInfo('[Admin] Fetching all transactions');
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        station: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    res.json(transactions);
  } catch (error) {
    logError('[Admin] Failed to fetch transactions', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
};

