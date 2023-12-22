import { SocketUser } from '@/models/socket.user';
import { Manager } from '@/modules/manager';
import { UWS } from '@/types/types';
import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080/api',
});

export const messageQueue: (() => void)[] = [];

export const pkg: {
  manager: Manager;
  users: Map<UWS.WebSocket, SocketUser> /* ws: UWS.WebSocket */;
} = {
  manager: null,
  users: new Map(),

  /* ws: null, */
};
