import { UWS } from '@/types/types';

export class SocketUser {
  currentSession: number = -1;
  state: string = 'waitlist';
  user_id: number;
  email: string;
  profile: string;
  username: string;
  token: string;
  url: string;
  ws: UWS.WebSocket;

  constructor(ws: UWS.WebSocket) {
    const data = ws.getUserData();
    this.ws = ws;
    this.user_id = data.user_id;
    this.email = data.email;
    this.profile = data.profile;
    this.username = data.username;
    this.token = data.token;
    this.url = data.url;
  }

  updateState(state: string) {
    this.state = state;
  }

  setCurrentSession(session_id: number) {
    this.currentSession = session_id;
  }

  toJSON() {
    return {
      currentSession: this.currentSession,
      state: this.state,
      user_id: this.user_id,
      email: this.email,
      profile: this.profile,
      username: this.username,
      token: this.token,
      url: this.url,
    };
  }
}
