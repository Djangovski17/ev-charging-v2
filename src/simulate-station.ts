import WebSocket from 'ws';
const STATION_ID = 'CP_001';

const ws = new WebSocket(`wss://ev-charging-v2-production.up.railway.app/ocpp/${STATION_ID}`);

let meterValueInterval: NodeJS.Timeout | null = null;
let currentEnergyWh = 0;

ws.on('open', () => {
  console.log('Połączono z serwerem OCPP');
  
  const message = [2, "msg_1", "BootNotification", {
    chargePointVendor: "Test",
    chargePointModel: "Model1"
  }];
  
  ws.send(JSON.stringify(message));
  console.log('Wysłano wiadomość:', JSON.stringify(message));
});

ws.on('message', (data: WebSocket.Data) => {
  const messageStr = data.toString();
  console.log('Otrzymano wiadomość od serwera:', messageStr);
  
  try {
    const message = JSON.parse(messageStr);
    
    // Sprawdź czy to odpowiedź na BootNotification (typ 3 - CALLRESULT)
    if (Array.isArray(message) && message[0] === 3) {
      console.log('Otrzymano odpowiedź na BootNotification:', message);
      // Nie zamykamy połączenia - keep alive
      return;
    }
    
    // Sprawdź czy to RemoteStartTransaction (typ 2 - CALL)
    if (Array.isArray(message) && message[0] === 2 && message[2] === 'RemoteStartTransaction') {
      const uniqueId = message[1];
      console.log('OTRZYMAŁEM ROZKAZ STARTU! ROZPOCZYNAM ŁADOWANIE...');
      
      // Wyślij odpowiedź Accepted
      const response = [
        3, // CALLRESULT
        uniqueId,
        {
          status: 'Accepted'
        }
      ];
      
      ws.send(JSON.stringify(response));
      console.log('Wysłano odpowiedź Accepted na RemoteStartTransaction');
      
      // Rozpocznij wysyłanie MeterValues co 5 sekund
      currentEnergyWh = 0;
      meterValueInterval = setInterval(() => {
        currentEnergyWh += 10;
        
        const meterValueMessage = [
          2, // CALL
          `meter_${Date.now()}`,
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 1,
            meterValue: [
              {
                timestamp: new Date().toISOString(),
                sampledValue: [
                  {
                    value: currentEnergyWh.toString(),
                    context: 'Sample.Periodic',
                    format: 'Raw',
                    measurand: 'Energy.Active.Import.Register',
                    location: 'Outlet',
                    unit: 'Wh'
                  }
                ]
              }
            ]
          }
        ];
        
        ws.send(JSON.stringify(meterValueMessage));
        console.log(`Wysłano MeterValues: ${currentEnergyWh}Wh`);
      }, 5000);
      
      return;
    }
    
    console.log('Nieznany typ wiadomości:', message);
  } catch (error) {
    console.error('Błąd parsowania wiadomości:', error);
  }
});

ws.on('error', (error: Error) => {
  console.error('Błąd połączenia:', error);
  if (meterValueInterval) {
    clearInterval(meterValueInterval);
  }
  process.exit(1);
});

ws.on('close', () => {
  console.log('Połączenie zamknięte');
  if (meterValueInterval) {
    clearInterval(meterValueInterval);
  }
  process.exit(0);
});

