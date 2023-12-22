import { UWS } from '@/types/types';
import { EVENT, USER_STATE } from '@/util/global.constants';
import { axiosInstance, pkg } from '@/util/instances';
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

  async findOneSessionBySessionId(session_id: number) {
    try {
      const { data } = await axiosInstance.get(
        `/mentoring-session/session/${session_id}`,
        {
          headers: {
            'channel-token': 'Bearer ' + this.serverToken,
          },
        },
      );
      return data.data;
    } catch (error) {
      console.log('error', error);
      return null;
    }
  }

  async findOneSession(user_id: number, session_id: number) {
    try {
      const { data } = await axiosInstance.get(
        `/mentoring-session/${session_id}`,
        {
          headers: {
            'channel-token': 'Bearer ' + this.serverToken,
            'channel-user-id': user_id,
          },
        },
      );
      return data.data;
    } catch (error) {
      console.log('error', error);
      return null;
    }
  }

  findUsersAllSessions(ws: UWS.WebSocket) {
    const user = pkg.users.get(ws);
    return axiosInstance.get('/mentoring/users', {
      headers: {
        'channel-token': 'Bearer ' + this.serverToken,
        'channel-user-id': user.user_id,
      },
    });
  }

  createMentoringSession(
    ws: UWS.WebSocket,
    {
      category_id,
      topic,
      objective,
      format,
      note,
      limit,
    }: Partial<MentoringSession>,
  ) {
    const user = pkg.users.get(ws);
    return axiosInstance.post(
      '/mentoring-session',
      {
        category_id: category_id,
        topic: topic,
        objective: objective,
        format: format,
        note: note,
        limit: limit,
      },
      {
        headers: {
          'channel-token': 'Bearer ' + this.serverToken,
          'channel-user-id': user.user_id,
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
        status: USER_STATE.SESSION(session_id),
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
    const user = pkg.users.get(ws);
    const { data } = await axiosInstance.get('/mentoring-session/users', {
      headers: {
        'channel-token': 'Bearer ' + this.serverToken,
        'channel-user-id': user.user_id,
      },
    });
    return data.data;
  }

  async saveMessageAndGet(ws: UWS.WebSocket, data: any) {
    const user = pkg.users.get(ws);
    await axiosInstance.post(
      '/messages/save',
      {
        message: data.message,
        session_id: data.session_id,
      },
      {
        headers: {
          'channel-token': 'Bearer ' + this.serverToken,
          'channel-user-id': user.user_id,
        },
      },
    );
    return await axiosInstance.get(`/messages/session/${data.session_id}`);
  }

  async saveSystemMessageAndGet(data: any) {
    await axiosInstance.post(
      `/messages/save/session/${data.session_id}`,
      {
        message: data.message,
      },
      {
        headers: {
          'channel-token': 'Bearer ' + this.serverToken,
        },
      },
    );
    return await axiosInstance.get(`/messages/session/${data.session_id}`);
  }

  readMessage(ws: UWS.WebSocket, data: { session_id: number }) {
    const user = pkg.users.get(ws);
    return axiosInstance.post(
      `/messages/read/session/${data.session_id}`,
      {},
      {
        headers: {
          'channel-token': 'Bearer ' + this.serverToken,
          'channel-user-id': user.user_id,
        },
      },
    );
  }

  removeMessage(ws: UWS.WebSocket, message_id: number) {
    const user = pkg.users.get(ws);
    return axiosInstance.delete(`/messages/soft/${message_id}`, {
      headers: {
        'channel-token': 'Bearer ' + this.serverToken,
        'channel-user-id': user.user_id,
      },
    });
  }
}
