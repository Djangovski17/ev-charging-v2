export type OcppMessage =
  | ClientBootNotificationMessage
  | ServerBootNotificationResponse;

export type MessageDirection = 'FromChargePoint' | 'ToChargePoint';

export interface ClientBootNotificationMessage extends Array<unknown> {
  0: 2; // CALL
  1: string; // Unique ID
  2: 'BootNotification';
  3: BootNotificationPayload;
}

export interface BootNotificationPayload {
  chargePointModel: string;
  chargePointVendor: string;
  [key: string]: unknown;
}

export interface ServerBootNotificationResponse extends Array<unknown> {
  0: 3; // CALLRESULT
  1: string; // Unique ID (mirrors request)
  2: BootNotificationResponsePayload;
}

export interface BootNotificationResponsePayload {
  status: 'Accepted' | 'Pending' | 'Rejected';
  currentTime: string;
  interval: number;
}

export const isBootNotification = (
  message: unknown
): message is ClientBootNotificationMessage => {
  return (
    Array.isArray(message) &&
    message[0] === 2 &&
    typeof message[1] === 'string' &&
    message[2] === 'BootNotification' &&
    typeof message[3] === 'object'
  );
};

