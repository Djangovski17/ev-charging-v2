import { logInfo, logError } from './logger';

export interface InvoiceData {
  transactionId: string;
  email: string;
  amount: number;
  energyKwh: number;
  cost: number;
  refundAmount: number;
  startTime: Date;
  endTime: Date;
  stationId: string;
  stationName?: string;
}

/**
 * Wysyła fakturę na podany adres email
 * W wersji MVP loguje informację - w produkcji można podpiąć np. SendGrid, Mailgun, etc.
 */
export const sendInvoice = async (data: InvoiceData): Promise<{ success: boolean; message: string }> => {
  try {
    logInfo('[Email] Sending invoice', {
      email: data.email,
      transactionId: data.transactionId,
      amount: data.cost,
    });

    // W wersji produkcyjnej tutaj byłoby rzeczywiste wysłanie emaila
    // Przykład z SendGrid:
    // await sgMail.send({
    //   to: data.email,
    //   from: 'noreply@ev-charging.com',
    //   subject: `Faktura za ładowanie - ${data.transactionId}`,
    //   html: generateInvoiceHtml(data),
    // });

    // Symulacja wysyłki - w produkcji zastąpić rzeczywistym serwisem
    console.log(`[Email] Faktura wysłana na adres: ${data.email}`);
    console.log(`[Email] Szczegóły faktury:`, {
      transactionId: data.transactionId,
      energyKwh: data.energyKwh,
      cost: data.cost,
      refundAmount: data.refundAmount,
    });

    return {
      success: true,
      message: `Faktura została wysłana na adres ${data.email}`,
    };
  } catch (error) {
    logError('[Email] Failed to send invoice', error);
    return {
      success: false,
      message: `Nie udało się wysłać faktury: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
    };
  }
};

