import { ApiManager } from '@/models/api.manager';
import { SocketManager } from '@/models/socket.manager';
import { SocketUser } from '@/models/socket.user';
import { UWS } from '@/types/types';
import uWS from 'uWebSockets.js';

export class Manager {
  app: uWS.TemplatedApp;
  serverToken: string;

  matchingQueue: {
    [type: string]: {
      [limit: number]: SocketUser[];
    };
  } = {};

  socket: SocketManager = new SocketManager();
  api: ApiManager = new ApiManager();

  constructor(app: uWS.TemplatedApp, serverToken: string) {
    this.app = app;
    this.serverToken = serverToken;
    this.setServerToken(this.serverToken);
  }

  async outMentoringSession(ws: UWS.WebSocket, session_id: number) {
    await this.api.outMentoringSession(ws.user_id, session_id);
    this.leaveSession(ws);
    return await this.api.findUsersAllSessions(ws);
  }

  addUser(ws: UWS.WebSocket) {
    this.socket.addUser(ws);
  }

  deleteUser(ws: UWS.WebSocket) {
    this.socket.deleteUser(ws);
  }

  changeSession(ws: UWS.WebSocket, session_id: number) {
    this.socket.changeSession(ws, session_id);
  }

  leaveSession(ws: UWS.WebSocket) {
    this.socket.changeSession(ws, -1);
  }

  setServerToken(token: string) {
    this.api.setServerToken(token);
  }

  addMatchQueue(ws: UWS.WebSocket, type: string, limit: number) {
    if (!this.matchingQueue[type]) this.matchingQueue[type] = {};
    if (!this.matchingQueue[type][limit]) this.matchingQueue[type][limit] = [];

    this.matchingQueue[type][limit].push(this.socket.findUser(ws));

    const group = this.findGroupByLimit(type, limit);
    return group;
  }

  deleteMatchQueue(ws: UWS.WebSocket, type: string, limit: number) {
    if (!this.matchingQueue[type]) this.matchingQueue[type] = {};
    if (!this.matchingQueue[type][limit]) this.matchingQueue[type][limit] = [];

    const delUser = this.socket.findUser(ws);

    this.matchingQueue[type][limit] = this.matchingQueue[type][limit].filter(
      (user) => user !== delUser,
    );

    this.socket.changeSession(ws, -1);

    return delUser;
  }

  hasGroup(type: string, limit: number) {
    return this.matchingQueue[type][limit].length >= limit;
  }

  findGroupByLimit(type: string, limit: number) {
    if (this.hasGroup(type, limit)) {
      return this.matchingQueue[type][limit].splice(0, limit);
    } else {
      return this.matchingQueue[type][limit];
    }
  }
}
