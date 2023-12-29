import { SocketUser } from '@/models/socket.user';
import { UWS } from '@/types/types';
import { EVENT, TYPE, USER_STATE } from '@/util/global.constants';
import { messageQueue, pkg } from '@/util/instances';
import * as uWS from 'uWebSockets.js';

/**
 * // DONE: 랜덤 매칭 시스템은 문제의 소지가 있음
 * "매칭 성사 시 연결"에서
 * "방 설정 후 생성"하는 방식으로 변경
 */

export function handleNonBinaryData(app: uWS.TemplatedApp, ws: UWS.WebSocket) {
  return async function handleNonBinaryData(
    type: string,
    event: string,
    _data: any,
  ) {
    if (type === TYPE.MESSAGES) {
      // 메시지 전송, 조회 관련
      if (event === EVENT.SAVE_MESSAGE) {
        // message format
        // session_id: number;
        // message: string;
        const { data } = await pkg.manager.api.saveMessageAndGet(ws, _data);
        const messages = data.data;
        const sessionData = await pkg.manager.api.findOneSession(
          ws.user_id,
          _data.session_id,
        );

        const session = sessionData as MentoringSession;

        for (const mentoring of session.mentorings) {
          const mentee = pkg.manager.socket.findUserByUserId(
            mentoring.mentee_id,
          );
          if (mentee.state === USER_STATE.SESSION(_data.session_id)) {
            await pkg.manager.api.readMessage(mentee.ws, _data);
          }
        }

        const afterSessionData = await pkg.manager.api.findOneSession(
          ws.user_id,
          _data.session_id,
        );

        // console.log('response session', afterSessionData.messages);

        for (const mentoring of afterSessionData.mentorings) {
          const mentee = pkg.manager.socket.findUserByUserId(
            mentoring.mentee_id,
          );
          sendWs(mentee.ws, type, EVENT.NEW_MESSAGE, {
            session: afterSessionData,
            messages: afterSessionData.messages,
          });
        }

        // console.log('response session', messages);
        publishApp(app, USER_STATE.SESSION(_data.session_id), type, event, {
          messages: messages,
          session: session,
        });
      } else if (event === EVENT.REMOVE_MESSAGE) {
        await pkg.manager.api.removeMessage(ws, _data.message_id);

        const afterSessionData = await pkg.manager.api.findOneSession(
          ws.user_id,
          _data.session_id,
        );

        // console.log('response session', afterSessionData.messages);

        for (const mentoring of afterSessionData.mentorings) {
          const mentee = pkg.manager.socket.findUserByUserId(
            mentoring.mentee_id,
          );
          sendWs(mentee.ws, type, EVENT.NEW_MESSAGE, {
            session: afterSessionData,
            messages: afterSessionData.messages,
          });
        }
      }
    } else if (type === TYPE.SESSIONS) {
      // 채널 변경, 참여, 나가기 관련
      if (event === EVENT.FINDALL_SESSION) {
        const user = pkg.manager.socket.findUser(ws);
        const { data } = await pkg.manager.api.findUsersAllSessions(ws);
        const usersSessions = data.data.map(
          (mentoring) => mentoring.mentoringSession,
        );
        sendWs(ws, type, event, {
          user,
          session: usersSessions,
        });
      } else if (event === EVENT.CHANGE_SESSION) {
        const user = pkg.manager.socket.changeSession(ws, _data.session_id);
        await pkg.manager.api.readMessage(ws, _data);
        const afterSession = (await pkg.manager.api.findOneSession(
          ws.user_id,
          _data.session_id,
        )) as MentoringSession;
        sendWs(ws, type, event, {
          user,
          session_id: _data.session_id,
          session: afterSession,
          messages: afterSession.messages,
        });
      } else if (event === EVENT.LEAVE_SESSION) {
        const user = pkg.manager.socket.changeSession(ws, -1);
        sendWs(ws, type, event, { user });
      } else if (event === EVENT.OUT_SESSION) {
        const user = pkg.manager.socket.findUser(ws);
        const sessionId = _data.session_id;

        // sessionData 사용?미사용?
        const { data: sessionData } =
          await pkg.manager.api.saveSystemMessageAndGet({
            session_id: _data.session_id,
            message: `${user.username}님이 대화방을 나갔습니다.`,
          });

        /* remove mentoring and return mentoringSession */
        const { data } = await pkg.manager.outMentoringSession(
          user.ws,
          sessionId,
        );

        /* 나간 사람 세션 */
        const usersSessions = data.data.map(
          (mentoring) => mentoring.mentoringSession,
        );

        /* 나간 사람에게 */
        sendWs(ws, type, event, {
          user,
          session: usersSessions,
        });

        const sessions = await pkg.manager.api.findOneSessionBySessionId(
          sessionId,
        );
        if (sessions) {
          for (const mentoring of sessions.mentorings) {
            console.log('순회 멘토링', mentoring);
            const user = pkg.manager.socket.findUserByUserId(
              mentoring.mentee_id,
            );
            console.log('mentoring user', user);
            if (user.currentSession === _data.session_id) {
              if (user) {
                await pkg.manager.api.readMessage(user.ws, _data);
              }
            }
          }
        }

        const otherData = await pkg.manager.api.findOneSession(
          ws.user_id,
          sessionId,
        );
        console.log('otherData', otherData);
        if (otherData) {
          const { mentorings } = otherData;
          for (const mentoring of mentorings) {
            const user = pkg.manager.socket.findUserByUserId(
              mentoring.mentee_id,
            );
            if (user) {
              console.log('no out socket user', user);
              /* 방에 남은 사람에게 */
              // 2023-12-11 23:41:37 이벤트 변경해서 보내야함.
              sendWs(user.ws, type, EVENT.UPDATE_SESSION, {
                user,
                session: otherData,
                group: mentorings,
              });
            } else {
              console.log('not found user id:', mentoring.mentee_id);
            }
          }
        } else {
          console.log('no session id:', sessionId);
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
            limit: 2,
          });
          for (const _user of group) {
            pkg.manager.socket.changeSession(_user.ws, data.data.id);
            await pkg.manager.api.createMentoring(data.data.id, _user);
            const { data: sessionData } =
              await pkg.manager.api.saveSystemMessageAndGet({
                session_id: data.data.id,
                message: `${_user.username}님이 매칭되었습니다.`,
              });
          }

          for (const _user of group) {
            await pkg.manager.api.readMessage(_user.ws, {
              session_id: data.data.id,
            });
          }

          const sessionData = await pkg.manager.api.findOneSession(
            ws.user_id,
            data.data.id,
          );
          for (const _user of group) {
            sendWs(_user.ws, type, EVENT.MATCHED_USER, {
              user: _user,
              group: sessionData.mentorings,
              session: [sessionData],
              session_id: sessionData.id,
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
