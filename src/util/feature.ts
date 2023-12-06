import { MessageType } from '@/types/types';

export const parseMessageToJson: (message: ArrayBuffer) => MessageType = (
  message,
) => JSON.parse(Buffer.from(message).toString('utf8'));
