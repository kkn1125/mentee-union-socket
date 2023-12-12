import { Manager } from '@/modules/manager';
import * as dotenv from 'dotenv';
import * as path from 'path';

const MODE = process.env.NODE_ENV || 'production';

dotenv.config({
  path: path.join(path.resolve(), '.env'),
});
dotenv.config({
  path: path.join(path.resolve(), `.env.${MODE}`),
});

export const HOST = process.env.HOST;
export const PORT = +(process.env.PORT || 8081);

export const DB_HOST = process.env.DB_HOST;
export const DB_PORT = +(process.env.DB_PORT || 3306);
export const DB_USERNAME = process.env.DB_USERNAME;
export const DB_PASSWORD = process.env.DB_PASSWORD;
export const DB_NAME = process.env.DB_NAME;

// export class DB_CONNECTION {
//   resolver: (value: boolean) => void = (value: boolean) => {};
//   promise = () => new Promise<boolean>((resolve) => (this.resolver = resolve));
//   manager: Manager;
// }
// export const checkConnection = new DB_CONNECTION();

export enum TYPE {
  MESSAGES = 'messages',
  SESSIONS = 'sessions',
  USERS = 'users',
}

export enum EVENT {
  /* session */
  FINDALL_SESSION = 'sessions/findall',
  CHANGE_SESSION = 'sessions/change',
  LEAVE_SESSION = 'sessions/leave',
  OUT_SESSION = 'sessions/out',
  /* user */
  FINDALL_USER = 'users/findAll',
  STATE_USER = 'users/state',
  MATCHING_USER = 'users/matching',
  CANCEL_MATCHING_USER = 'users/cancelmatching',
  MATCHED_USER = 'users/matched',
  /* message */
  FINDALL_MESSAGE = 'messages/findAll',
  SAVE_MESSAGE = 'messages/save',
}

export const USERE_STATE = {
  WAITLIST: 'waitlist',
  MATCHING: 'matching',
  SESSION: (session_id: number) => `session${session_id}`,
  BROADCAST: 'broadcast',
};
