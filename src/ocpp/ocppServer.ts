import { Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { logError, logInfo } from '../services/logger';
import { isBootNotification } from './types';
import { getIo } from '../index';
import { prisma } from '../services/prisma';
import { createRefund } from '../services/stripeService';

const OCPP_PATH = /^\/ocpp\/(?<chargePointId>[\w-]+)$/;

// Mapa aktywnych połączeń: chargePointId -> WebSocket
const activeConnections = new Map<string, WebSocket>();

// Mapa uniqueId -> transactionId dla RemoteStartTransaction
const remoteStartTransactionMap = new Map<string, string>();

export const initOcppServer = (httpServer: Server): void => {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const { url = '' } = request;
    
    // Pomiń ścieżki Socket.io - Socket.io obsłuży je samodzielnie
    if (url.startsWith('/socket.io/')) {
      return;
    }
    
    // Obsłuż tylko ścieżki OCPP
    if (!OCPP_PATH.test(url)) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (socket, request) => {
    const match = request.url ? request.url.match(OCPP_PATH) : null;
    const chargePointId = match?.groups?.chargePointId ?? 'unknown';
    logInfo(`[OCPP] Charge point connected`, { chargePointId });
    
    // Zapisz połączenie w mapie
    activeConnections.set(chargePointId, socket);

    socket.on('message', (data) => {
      logInfo('[OCPP] Incoming message', {
        chargePointId,
        payload: data.toString(),
      });

      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch (error) {
        logError('[OCPP] Failed to parse message JSON', error);
        socket.send(
          JSON.stringify([
            4,
            'unknown',
            'FormatViolation',
            'Invalid JSON payload',
            {},
          ])
        );
        return;
      }

      if (isBootNotification(parsed)) {
        handleBootNotification(socket, parsed[1]);
        return;
      }

      // Sprawdź czy to MeterValues
      if (
        Array.isArray(parsed) &&
        parsed[0] === 2 &&
        typeof parsed[2] === 'string' &&
        parsed[2] === 'MeterValues'
      ) {
        handleMeterValues(socket, chargePointId, parsed[1], parsed[3]).catch(err => 
          logError('[OCPP] Error in handleMeterValues', err)
        );
        return;
      }

      // Sprawdź czy to odpowiedź CallResult (typ 3) na RemoteStartTransaction lub RemoteStopTransaction
      if (
        Array.isArray(parsed) &&
        parsed[0] === 3 &&
        typeof parsed[1] === 'string'
      ) {
        const uniqueId = parsed[1];
        
        // Sprawdź czy to odpowiedź na RemoteStartTransaction
        if (uniqueId.startsWith('remote_start_')) {
          handleRemoteStartTransactionResponse(chargePointId, uniqueId, parsed[2]).catch(err => 
            logError('[OCPP] Error in handleRemoteStartTransactionResponse', err)
          );
          return;
        }
        
        // Sprawdź czy to odpowiedź na RemoteStopTransaction
        if (uniqueId.startsWith('remote_stop_')) {
          handleRemoteStopTransactionResponse(chargePointId, uniqueId, parsed[2]).catch(err => 
            logError('[OCPP] Error in handleRemoteStopTransactionResponse', err)
          );
          return;
        }
      }

      const uniqueId =
        Array.isArray(parsed) && typeof parsed[1] === 'string'
          ? parsed[1]
          : 'unknown';
      socket.send(
        JSON.stringify([
          4,
          uniqueId,
          'NotSupported',
          'Action not supported',
          {},
        ])
      );
    });

    socket.on('close', (code, reason) => {
      logInfo('[OCPP] Connection closed', {
        chargePointId,
        code,
        reason: reason.toString(),
      });
      // Usuń połączenie z mapy
      activeConnections.delete(chargePointId);
    });
  });
};

/**
 * Wysyła komendę RemoteStartTransaction do stacji ładowania
 * @param chargePointId ID stacji ładowania
 * @returns true jeśli komenda została wysłana, false jeśli stacja nie jest połączona
 */
export const sendRemoteStartTransaction = async (chargePointId: string): Promise<boolean> => {
  const socket = activeConnections.get(chargePointId);
  
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logError('[OCPP] Cannot send RemoteStartTransaction', {
      chargePointId,
      reason: 'No active connection',
    });
    return false;
  }

  // Znajdź najnowszą transakcję ze statusem PENDING dla tej stacji
  const pendingTransaction = await prisma.transaction.findFirst({
    where: {
      stationId: chargePointId,
      status: 'PENDING',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!pendingTransaction) {
    logError('[OCPP] No pending transaction found for station', { chargePointId });
    return false;
  }

  const uniqueId = `remote_start_${Date.now()}`;
  
  // Zapisz mapowanie uniqueId -> transactionId
  remoteStartTransactionMap.set(uniqueId, pendingTransaction.id);
  
  const message = [
    2, // CALL
    uniqueId,
    'RemoteStartTransaction',
    {
      connectorId: 1,
    },
  ];

  logInfo('[OCPP] Sending RemoteStartTransaction', { 
    chargePointId, 
    uniqueId,
    transactionId: pendingTransaction.id 
  });
  socket.send(JSON.stringify(message));
  return true;
};

/**
 * Wysyła komendę RemoteStopTransaction do stacji ładowania
 * @param chargePointId ID stacji ładowania
 * @returns true jeśli komenda została wysłana, false jeśli stacja nie jest połączona
 */
export const sendRemoteStopTransaction = async (chargePointId: string): Promise<boolean> => {
  const socket = activeConnections.get(chargePointId);
  
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logError('[OCPP] Cannot send RemoteStopTransaction', {
      chargePointId,
      reason: 'No active connection',
    });
    return false;
  }

  // Znajdź najnowszą transakcję ze statusem CHARGING dla tej stacji
  const chargingTransaction = await prisma.transaction.findFirst({
    where: {
      stationId: chargePointId,
      status: 'CHARGING',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!chargingTransaction) {
    logError('[OCPP] No charging transaction found for station', { chargePointId });
    return false;
  }

  const uniqueId = `remote_stop_${Date.now()}`;
  
  // Zapisz mapowanie uniqueId -> transactionId
  remoteStartTransactionMap.set(uniqueId, chargingTransaction.id);
  
  const message = [
    2, // CALL
    uniqueId,
    'RemoteStopTransaction',
    {
      transactionId: 1, // W rzeczywistości powinno być ID transakcji OCPP, ale dla uproszczenia używamy 1
    },
  ];

  logInfo('[OCPP] Sending RemoteStopTransaction', { 
    chargePointId, 
    uniqueId,
    transactionId: chargingTransaction.id 
  });
  socket.send(JSON.stringify(message));
  return true;
};

const handleBootNotification = (socket: WebSocket, uniqueId: string): void => {
  const response = [
    3,
    uniqueId,
    {
      status: 'Accepted',
      currentTime: new Date().toISOString(),
      interval: 60,
    },
  ];

  logInfo('[OCPP] Responding to BootNotification', { uniqueId });
  socket.send(JSON.stringify(response));
};

/**
 * Obsługuje odpowiedź na RemoteStartTransaction
 */
const handleRemoteStartTransactionResponse = async (
  chargePointId: string,
  uniqueId: string,
  payload: unknown
): Promise<void> => {
  const transactionId = remoteStartTransactionMap.get(uniqueId);
  
  if (!transactionId) {
    logError('[OCPP] No transaction ID found for RemoteStartTransaction response', {
      chargePointId,
      uniqueId,
    });
    return;
  }

  // Sprawdź czy odpowiedź jest pozytywna (status: 'Accepted')
  const isAccepted = 
    payload &&
    typeof payload === 'object' &&
    'status' in payload &&
    (payload as { status: unknown }).status === 'Accepted';

  if (isAccepted) {
    try {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'CHARGING',
          startTime: new Date(),
        },
      });

      // Zaktualizuj status stacji na CHARGING
      await prisma.station.update({
        where: { id: chargePointId },
        data: { status: 'CHARGING' },
      });

      logInfo('[OCPP] Transaction updated to CHARGING, station status updated', {
        chargePointId,
        transactionId,
        uniqueId,
      });
    } catch (error) {
      logError('[OCPP] Failed to update transaction to CHARGING', error);
    }
  } else {
    logInfo('[OCPP] RemoteStartTransaction not accepted', {
      chargePointId,
      transactionId,
      uniqueId,
      payload,
    });
  }

  // Usuń z mapy po przetworzeniu
  remoteStartTransactionMap.delete(uniqueId);
};

/**
 * Obsługuje odpowiedź na RemoteStopTransaction
 */
const handleRemoteStopTransactionResponse = async (
  chargePointId: string,
  uniqueId: string,
  payload: unknown
): Promise<void> => {
  const transactionId = remoteStartTransactionMap.get(uniqueId);
  
  if (!transactionId) {
    logError('[OCPP] No transaction ID found for RemoteStopTransaction response', {
      chargePointId,
      uniqueId,
    });
    return;
  }

  // Sprawdź czy odpowiedź jest pozytywna (status: 'Accepted')
  const isAccepted = 
    payload &&
    typeof payload === 'object' &&
    'status' in payload &&
    (payload as { status: unknown }).status === 'Accepted';

  if (isAccepted) {
    try {
      // Pobierz aktualną transakcję wraz ze stacją
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { station: true },
      });

      if (transaction) {
        const finalEnergy = transaction.energyKwh;
        const pricePerKwh = transaction.station.pricePerKwh;
        const finalCost = finalEnergy * pricePerKwh;
        const amountPaid = transaction.amount; // w złotówkach
        const refundAmount = amountPaid - finalCost; // w złotówkach

        let refundId: string | null = null;

        // Jeśli jest reszta do zwrotu, wykonaj refund
        if (refundAmount > 0) {
          try {
            const refundAmountInGrosze = Math.round(refundAmount * 100); // Konwersja na grosze
            const refund = await createRefund({
              paymentIntentId: transaction.stripePaymentId,
              amount: refundAmountInGrosze,
            });
            refundId = refund.id;
            logInfo('[OCPP] Refund created successfully', {
              chargePointId,
              transactionId,
              refundId,
              refundAmount,
            });
          } catch (refundError) {
            logError('[OCPP] Failed to create refund', refundError);
            // Kontynuuj mimo błędu refundu - transakcja i tak powinna być zakończona
          }
        }

        // Zaktualizuj transakcję
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'COMPLETED',
            endTime: new Date(),
            finalEnergy: finalEnergy,
            finalCost: finalCost,
            refundId: refundId,
          },
        });

        // Zaktualizuj status stacji na AVAILABLE
        await prisma.station.update({
          where: { id: chargePointId },
          data: { status: 'AVAILABLE' },
        });

        logInfo('[OCPP] Transaction updated to COMPLETED, station status updated to AVAILABLE', {
          chargePointId,
          transactionId,
          uniqueId,
          finalEnergy,
          finalCost,
          refundAmount,
          refundId,
        });
      }
    } catch (error) {
      logError('[OCPP] Failed to update transaction to COMPLETED', error);
    }
  } else {
    logInfo('[OCPP] RemoteStopTransaction not accepted', {
      chargePointId,
      transactionId,
      uniqueId,
      payload,
    });
  }

  // Usuń z mapy po przetworzeniu
  remoteStartTransactionMap.delete(uniqueId);
};

const handleMeterValues = async (
  socket: WebSocket,
  chargePointId: string,
  uniqueId: string,
  payload: unknown
): Promise<void> => {
  // Wyciągnij wartość energii i mocy z payloadu
  let energyValue: number | null = null;
  let powerValue: number | null = null;
  
  logInfo('[OCPP] Processing MeterValues payload', { chargePointId, uniqueId, payload: JSON.stringify(payload) });
  
  if (
    payload &&
    typeof payload === 'object' &&
    'meterValue' in payload &&
    Array.isArray((payload as { meterValue: unknown }).meterValue) &&
    (payload as { meterValue: Array<unknown> }).meterValue.length > 0
  ) {
    const firstMeterValue = (payload as { meterValue: Array<unknown> }).meterValue[0];
    if (
      firstMeterValue &&
      typeof firstMeterValue === 'object' &&
      'sampledValue' in firstMeterValue &&
      Array.isArray((firstMeterValue as { sampledValue: unknown }).sampledValue)
    ) {
      const sampledValues = (firstMeterValue as { sampledValue: Array<unknown> }).sampledValue;
      
      // Przejdź przez wszystkie sampledValues i znajdź energy i power
      for (const sampledValue of sampledValues) {
        if (
          sampledValue &&
          typeof sampledValue === 'object' &&
          'value' in sampledValue
        ) {
          const value = (sampledValue as { value: unknown }).value;
          const measurand = (sampledValue as { measurand?: unknown }).measurand;
          
          logInfo('[OCPP] Processing sampledValue', { measurand, value, valueType: typeof value });
          
          // Funkcja pomocnicza do sprawdzania czy measurand oznacza energię
          const isEnergyMeasurand = (m: unknown): boolean => {
            if (typeof m !== 'string') return false;
            const mLower = m.toLowerCase();
            return (
              mLower.includes('energy') &&
              (mLower.includes('import') || mLower.includes('export') || mLower.includes('wh'))
            );
          };
          
          // Funkcja pomocnicza do sprawdzania czy measurand oznacza moc
          const isPowerMeasurand = (m: unknown): boolean => {
            if (typeof m !== 'string') return false;
            const mLower = m.toLowerCase();
            return (
              mLower.includes('power') &&
              (mLower.includes('active') || mLower.includes('w'))
            );
          };
          
          // Sprawdź energię (obsługuje różne formaty: Energy_Wh, Energy_Import_Register, Energy.Active.Import.Register, itp.)
          if (isEnergyMeasurand(measurand) || measurand === 'Energy_Wh' || measurand === 'Energy_Export_Register' || measurand === 'Energy_Import_Register') {
            const numValue = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : null;
            if (numValue !== null && !isNaN(numValue)) {
              energyValue = numValue;
              logInfo('[OCPP] Extracted energy value', { energyValue, measurand });
            }
          }
          
          // Sprawdź moc (obsługuje różne formaty)
          if (isPowerMeasurand(measurand) || measurand === 'Power_W' || measurand === 'Power_Active_Import' || measurand === 'Power_Active_Export') {
            const numValue = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : null;
            if (numValue !== null && !isNaN(numValue)) {
              powerValue = numValue;
              logInfo('[OCPP] Extracted power value', { powerValue, measurand });
            }
          }
          
          // Jeśli nie ma measurand, przyjmij że to energia (dla kompatybilności wstecznej)
          if (!measurand && energyValue === null) {
            const numValue = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : null;
            if (numValue !== null && !isNaN(numValue)) {
              energyValue = numValue;
              logInfo('[OCPP] Extracted energy value (no measurand)', { energyValue });
            }
          }
        }
      }
    }
  }

  console.log(`[MeterValues] Odebrano pomiar licznika: ${energyValue !== null ? energyValue : 'unknown'} Wh, ${powerValue !== null ? powerValue : 'unknown'} W`);

  // Zaktualizuj energyKwh w bazie danych dla aktywnej transakcji (ze statusem CHARGING)
  if (energyValue !== null) {
    try {
      const energyKwh = energyValue / 1000; // Konwersja z Wh na kWh
      
      const updatedTransaction = await prisma.transaction.updateMany({
        where: {
          stationId: chargePointId,
          status: 'CHARGING',
        },
        data: {
          energyKwh: energyKwh,
        },
      });

      if (updatedTransaction.count > 0) {
        logInfo('[OCPP] Updated energyKwh for charging transaction', {
          chargePointId,
          energyKwh,
          updatedCount: updatedTransaction.count,
        });
      }
    } catch (error) {
      logError('[OCPP] Failed to update energyKwh in database', error);
    }
  }

  // Wyślij CallResult z pustym payloadem
  const response = [3, uniqueId, {}];

  logInfo('[OCPP] Responding to MeterValues', { uniqueId, energyValue, powerValue });
  socket.send(JSON.stringify(response));

  // Emituj zdarzenie przez Socket.io tylko jeśli istnieje aktywna transakcja CHARGING
  try {
    const activeTransaction = await prisma.transaction.findFirst({
      where: {
        stationId: chargePointId,
        status: 'CHARGING',
      },
    });

    if (activeTransaction) {
      const io = getIo();
      const emitData = {
        stationId: chargePointId,
        energy: energyValue,
        power: powerValue,
      };
      
      logInfo('[Socket.IO] Emitting energy_update event', { ...emitData, connectedClients: io.sockets.sockets.size });
      io.emit('energy_update', emitData);
      console.log(`[Socket.IO] Emitowano zdarzenie energy_update dla stacji ${chargePointId}: energy=${energyValue}, power=${powerValue}`);
    } else {
      logInfo('[Socket.IO] Skipping energy_update - no active CHARGING transaction', { chargePointId });
    }
  } catch (error) {
    logError('[Socket.IO] Failed to emit energy_update', error);
    console.error('[Socket.IO] Błąd podczas emitowania zdarzenia:', error);
  }
};

