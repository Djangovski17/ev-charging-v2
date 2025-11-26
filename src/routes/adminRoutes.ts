import { Router } from 'express';
import { getStations, createStation, getTransactions } from '../controllers/adminController';

const router = Router();

router.get('/stations', getStations);
router.post('/stations', createStation);
router.get('/transactions', getTransactions);

export default router;

