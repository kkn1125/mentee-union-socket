import { SocketUser } from '@/models/socket.user';
import { UWS } from '@/types/types';
import { EVENT, TYPE, USERE_STATE } from '@/util/global.constants';
import { messageQueue, pkg } from '@/util/instances';
import * as uWS from 'uWebSockets.js';

export function handleNonBinaryData(app: uWS.TemplatedApp, ws: UWS.WebSocket) {
  return async function handleNonBinaryData(
    type: string,
    event: string,
    _data: any,
  ) {
    if (type === TYPE.MESSAGES) {
      // 메시지 전송, 조회 관련
    } else if (type === TYPE.SESSIONS) {
      // 채널 변경, 참여, 나가기 관련
      if (event === EVENT.FINDALL_SESSION) {
        const user = pkg.manager.socket.findUser(ws);
        const { data } = await pkg.manager.api.findUsersAllSessions(ws);
        sendWs(ws, type, event, {
          user,
          session: data.data.map((mtr) => mtr.mentoringSession),
        });
      } else if (event === EVENT.CHANGE_SESSION) {
        const user = pkg.manager.socket.changeSession(ws, _data.session_id);
        sendWs(ws, type, event, { user, session_id: _data.session_id });
      } else if (event === EVENT.LEAVE_SESSION) {
        const user = pkg.manager.socket.changeSession(ws, -1);
        sendWs(ws, type, event, { user });
      } else if (event === EVENT.OUT_SESSION) {
        const user = pkg.manager.socket.findUser(ws);
        const sessionId = user.currentSession;

        const { data } = await pkg.manager.outMentoringSession(
          ws,
          user.currentSession,
        );

        /* 나간 사람에게 */
        sendWs(ws, type, event, {
          user,
          session: data.data,
        });

        const { data: otherData } = await pkg.manager.api.findOneSession(
          ws.user_id,
          sessionId,
        );

        const { mentorings } = otherData.data;
        for (const mentee of mentorings) {
          const user = pkg.manager.socket.findUserByUserId(mentee.id);
          /* 방에 남은 사람에게 */
          // 2023-12-11 23:41:37 이벤트 변경해서 보내야함.
          sendWs(user.ws, type, event, {
            user,
            session: otherData.data,
            group: mentorings.map((mentee) =>
              pkg.manager.socket.findUserByUserId(mentee.id),
            ) as SocketUser[],
          });
        }
      }
    } else if (type === TYPE.USERS) {
      // 유저 상태 관련
      if (event === EVENT.STATE_USER) {
        const user = pkg.manager.socket.findUser(ws);
        sendWs(ws, type, event, { user });
      } else if (event === EVENT.MATCHING_USER) {
        const group = pkg.manager.addMatchQueue(ws, _data.type, _data.limit);
        if (group.length >= _data.limit) {
          const { data } = await pkg.manager.api.createMentoringSession(ws, {
            category_id: _data.type,
            format: _data.format || '',
            note: _data.note || '',
            objective: _data.objective || '',
            topic: _data.topic || '',
          });
          for (const _user of group) {
            pkg.manager.socket.changeSession(_user.ws, data.data.id);
            await pkg.manager.api.createMentoring(data.data.id, _user);
          }
          const { data: sessionData } = await pkg.manager.api.findOneSession(
            ws.user_id,
            data.data.id,
          );
          for (const _user of group) {
            sendWs(_user.ws, type, EVENT.MATCHED_USER, {
              user: _user,
              group,
              session: [sessionData.data],
              session_id: sessionData.data.id,
            });
          }
        } else {
          const user = pkg.manager.socket.changeSession(ws, -2);
          sendWs(ws, type, event, {
            user,
            group,
          });
        }
      } else if (event === EVENT.CANCEL_MATCHING_USER) {
        const user = pkg.manager.deleteMatchQueue(ws, _data.type, _data.limit);
        sendWs(ws, type, event, {
          user,
        });
      }
    } else {
      // 기타 미정
    }
  };
}

function sendWs(ws: UWS.WebSocket, type: string, event: string, data: any) {
  addMessageQueue(() =>
    ws.send(
      JSON.stringify({
        type,
        event,
        data,
      }),
    ),
  );
}

function publishWs(
  ws: UWS.WebSocket,
  topic: string,
  type: string,
  event: string,
  data: any,
) {
  addMessageQueue(() =>
    ws.publish(
      topic,
      JSON.stringify({
        type,
        event,
        data,
      }),
    ),
  );
}

function publishApp(
  app: uWS.TemplatedApp,
  topic: string,
  type: string,
  event: string,
  data: any,
) {
  addMessageQueue(() =>
    app.publish(
      topic,
      JSON.stringify({
        type,
        event,
        data,
      }),
    ),
  );
}

function addMessageQueue(cb: () => void) {
  messageQueue.push(cb);
}
