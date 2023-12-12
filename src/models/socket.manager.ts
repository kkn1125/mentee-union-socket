import { UWS } from '@/types/types';
import { SocketUser } from './socket.user';
import { USERE_STATE } from '@/util/global.constants';

export class SocketManager {
  users: Map<UWS.WebSocket, SocketUser> = new Map();

  findUser(ws: UWS.WebSocket) {
    return this.users.get(ws);
  }

  findUserByUserId(user_id: number) {
    for (const user of [...this.users.values()]) {
      if (user.user_id === user_id) {
        return user;
      }
    }
    return null;
  }

  changeSession(ws: UWS.WebSocket, session_id: number) {
    const user = this.findUser(ws);
    if (user) {
      user.setCurrentSession(session_id);
      if (session_id === -1) {
        const topics = this.getUserTopics(ws);
        for (const topic of topics) {
          user.ws.unsubscribe(topic);
        }
        user.updateState(USERE_STATE.WAITLIST);
        user.ws.subscribe(USERE_STATE.WAITLIST);
      } else if (session_id === -2) {
        user.updateState(USERE_STATE.MATCHING);
      } else {
        const topics = this.getUserTopics(ws);
        for (const topic of topics) {
          user.ws.unsubscribe(topic);
        }
        user.updateState(USERE_STATE.SESSION(session_id));
        user.ws.subscribe(USERE_STATE.SESSION(session_id));
      }
    }
    return user;
  }

  getUserTopics(ws: UWS.WebSocket) {
    return ws.getTopics().filter((topic) => topic !== 'broadcast');
  }

  addUser(ws: UWS.WebSocket) {
    const user = new SocketUser(ws);
    this.users.set(ws, user);
    return user;
  }

  deleteUser(ws: UWS.WebSocket) {
    return this.users.delete(ws);
  }

  getUserState(ws: UWS.WebSocket) {
    return this.users.get(ws).toJSON();
  }
}
