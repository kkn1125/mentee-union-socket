import { UWS } from '@/types/types';
import { EVENT, USERE_STATE } from '@/util/global.constants';
import { axiosInstance } from '@/util/instances';
import { SocketUser } from './socket.user';

export class ApiManager {
  serverToken: string;

  constructor() {}

  setServerToken(token: string) {
    this.serverToken = token;
  }

  outMentoringSession(user_id: number, session_id: number) {
    return axiosInstance.delete(
      `/mentoring/session/${session_id}/mentee/${user_id}`,
      {
        headers: {
          'channel-token': 'Bearer ' + this.serverToken,
          'channel-user-id': user_id,
        },
      },
    );
  }

  findOneSession(user_id: number, session_id: number) {
    return axiosInstance.get(`/mentoring-session/${session_id}`, {
      headers: {
        'channel-token': 'Bearer ' + this.serverToken,
        'channel-user-id': user_id,
      },
    });
  }

  findUsersAllSessions(ws: UWS.WebSocket) {
    return axiosInstance.get('/mentoring/users', {
      headers: {
        'channel-token': 'Bearer ' + this.serverToken,
        'channel-user-id': ws.user_id,
      },
    });
  }

  createMentoringSession(
    ws: UWS.WebSocket,
    { category_id, topic, objective, format, note }: MentoringSessionType,
  ) {
    return axiosInstance.post(
      '/mentoring-session',
      {
        category_id: category_id,
        topic: topic,
        objective: objective,
        format: format,
        note: note,
      },
      {
        headers: {
          'channel-token': 'Bearer ' + this.serverToken,
          'channel-user-id': ws.user_id,
        },
      },
    );
  }

  createMentoring(session_id: number, user: SocketUser) {
    return axiosInstance.post(
      '/mentoring',
      {
        mentoring_session_id: session_id,
        mentee_id: user.user_id,
        token: '',
        status: USERE_STATE.SESSION(session_id),
      },
      {
        headers: {
          'channel-token': 'Bearer ' + this.serverToken,
          'channel-user-id': user.user_id,
        },
      },
    );
  }

  async initializeUserState(ws: UWS.WebSocket) {
    const { data } = await axiosInstance.get('/mentoring-session/users', {
      headers: {
        'channel-token': 'Bearer ' + this.serverToken,
        'channel-user-id': ws.user_id,
      },
    });
    return data.data;
  }

  async saveMessageAndGet(ws: UWS.WebSocket, data: any) {
    await axiosInstance.post(
      '/messages',
      {
        message: data.message,
        session_id: data.session_id,
      },
      {
        headers: {
          'channel-token': 'Bearer ' + this.serverToken,
          'channel-user-id': ws.user_id,
        },
      },
    );
    return await axiosInstance.get(`/messages/session/${data.session_id}`);
  }
}
