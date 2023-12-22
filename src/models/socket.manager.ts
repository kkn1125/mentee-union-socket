import { UWS } from '@/types/types';
import { SocketUser } from './socket.user';
import { USER_STATE } from '@/util/global.constants';
import { pkg } from '@/util/instances';

export class SocketManager {
  findUser(ws: UWS.WebSocket) {
    return pkg.users.get(ws);
  }

  findUserByUserId(user_id: number) {
    for (const user of [...pkg.users.values()]) {
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
        user.updateState(USER_STATE.WAITLIST);
        user.ws.subscribe(USER_STATE.WAITLIST);
      } else if (session_id === -2) {
        user.updateState(USER_STATE.MATCHING);
      } else {
        const topics = this.getUserTopics(ws);
        for (const topic of topics) {
          user.ws.unsubscribe(topic);
        }
        user.updateState(USER_STATE.SESSION(session_id));
        user.ws.subscribe(USER_STATE.SESSION(session_id));
      }
    }
    return user;
  }

  getUserTopics(ws: UWS.WebSocket) {
    const user = this.findUser(ws);
    return user.ws.getTopics().filter((topic) => topic !== 'broadcast');
  }

  addUser(ws: UWS.WebSocket) {
    const user = new SocketUser(ws);
    pkg.users.set(ws, user);
    return user;
  }

  deleteUser(ws: UWS.WebSocket) {
    return pkg.users.delete(ws);
  }

  getUserState(ws: UWS.WebSocket) {
    return pkg.users.get(ws).toJSON();
  }
}
