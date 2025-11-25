import { Router } from 'express';
import { sendRemoteStartTransaction, sendRemoteStopTransaction } from '../ocpp/ocppServer';

const router = Router();

router.get('/start/:cpId', (req, res) => {
  const { cpId } = req.params;
  
  const success = sendRemoteStartTransaction(cpId);
  
  if (success) {
    res.json({
      success: true,
      message: `RemoteStartTransaction sent to ${cpId}`,
    });
  } else {
    res.status(404).json({
      success: false,
      message: `Charge point ${cpId} is not connected`,
    });
  }
});

router.get('/stop/:cpId', (req, res) => {
  const { cpId } = req.params;
  
  const success = sendRemoteStopTransaction(cpId);
  
  if (success) {
    res.json({
      success: true,
      message: `RemoteStopTransaction sent to ${cpId}`,
    });
  } else {
    res.status(404).json({
      success: false,
      message: `Charge point ${cpId} is not connected`,
    });
  }
});

export default router;

