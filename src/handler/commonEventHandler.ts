import { MessageType, UWS } from '@/types/types';
import { checkConnection } from '@/util/global.constants';
import { axiosInstance, messageQueue } from '@/util/instances';
import uWS from 'uWebSockets.js';

export function commonEventHandler({
  app,
  ws,
  isBinary,
}: {
  app: uWS.TemplatedApp;
  ws: UWS.WebSocket;
  isBinary: boolean;
}) {
  return async function commonEventHandler({
    event,
    type = 'message',
    data,
  }: MessageType) {
    const manager = checkConnection.manager;
    console.log('receive message', event, type, data);
    if (type === 'message') {
      if (event === 'chattings') {
        const user = manager.findUserByWs(ws);
        const channelId = Number(user.status.replace('room', '').trim());
        const channel = manager.findChannelById(channelId);
        console.log('user status', user, channel?.users, channelId);
        // if (channel) {
        channel.saveMessage(data);
        messageQueue.push(() => {
          app.publish(
            `room${channel.id}`,
            JSON.stringify({
              event: 'chattings',
              data: {
                chattings: channel.chattings,
              },
            }),
            isBinary,
            true,
          );
        });
        // }
      } else if (event === 'remove/chat') {
        const user = manager.findUserByWs(ws);
        const channelId = Number(user.status.replace('room', ''));
        const channel = manager.findChannelById(channelId);
        if (channel) {
          channel.removeMessage(data.chat_id);
          messageQueue.push(() => {
            app.publish(
              user.status,
              JSON.stringify({
                event: 'chattings',
                data: {
                  chattings: channel.chattings,
                },
              }),
              isBinary,
              true,
            );
          });
        }
      }
    } else if (type === 'string') {
    } else if (type === 'channel') {
      if (event === 'findAllChannels') {
        console.log('check socket token', manager.serverToken);
        /* socket server 위변조 방지 */
        axiosInstance.interceptors.request.use(function (config) {
          Object.assign(config.headers, {
            'channel-token': 'Bearer ' + manager.serverToken,
          });
          return config;
        });

        try {
          const { data } = await axiosInstance.get('/channels');
          console.log('result check', data.data);
          axiosInstance.interceptors.request.clear();
          return data.data;
        } catch (error) {
          return error.response.data.message;
        }

        // return manager.channel.findAllChannels();
      } else if (event === 'findOneChannel') {
        // return manager.channel.findOneChannelById(data);
      } else if (event === 'waitlist') {
        // return manager.channel.findAllChannels();
      } else if (event === 'join') {
        // return manager.channel
      } else {
        // return else
      }
    } else if (type === 'user') {
    } else if (type === 'manager') {
      if (event === 'getUserState') {
        // const { user_id, email, url } = ws.getUserData();
        const user = manager.findUserByWs(ws);
        messageQueue.push(() => {
          user.ws.send(
            JSON.stringify({
              event: event,
              data: { user: user.toJSON() },
            }),
            isBinary,
            true,
          );
        });
        return user.toJSON();
      } else if (event === 'joinChannel') {
        const user = manager.findUserByWs(ws);
        const channel = manager.findChannelById(data.channel_id);
        channel.join(user);
        messageQueue.push(() => {
          user.ws.send(
            JSON.stringify({
              event: event,
              data: { user: user.toJSON() },
            }),
            isBinary,
            true,
          );
        });
      } else if (event === 'outChannel') {
        const user = manager.findUserByWs(ws);
        manager.outChannel(ws, +data.channel_id);
        const channel = manager.findChannelById(+data.channel_id);
        manager.checkUsersZeroOrOne(channel);
        channel.saveMessage({
          user_id: ws.user_id,
          message: `${ws.username}님이 채널을 나갔습니다.`,
          username: 'system',
          profile: ws.profile,
          removed: false,
          created_at: +new Date(),
        });
        messageQueue.push(() => {
          user.ws.send(
            JSON.stringify({
              event: event,
              data: {
                user: user.toJSON(),
              },
            }),
            isBinary,
            true,
          );
        });
      } else if (event === 'addQueue') {
        const user = manager.findUserByWs(ws);
        manager.addQueue(data.type, user, data.content, +data.limit);
        messageQueue.push(() => {
          user.ws.send(
            JSON.stringify({
              event: event,
              data: { user: user.toJSON() },
            }),
            isBinary,
            true,
          );
        });
      } else if (event === 'dequeue') {
        const user = manager.findUserByWs(ws);
        manager.dequeue(data.type);
        user.status = 'waitlist';
        user.ws.unsubscribe('matching');
        messageQueue.push(() => {
          user.ws.send(
            JSON.stringify({
              event: event,
              data: { user: user.toJSON() },
            }),
            isBinary,
            true,
          );
        });
      } else if (event === 'switchChannel') {
        const user = manager.findUserByWs(ws);
        const found = manager.findUserByWs(ws);
        const channel = manager.findChannelById(+data.channel_id);
        if (channel) {
          // channel.out(found);
          found.joined.forEach((join) => {
            ws.unsubscribe('room' + join);
          });
          channel.join(found);
        }
        messageQueue.push(() => {
          ws.send(
            JSON.stringify({
              event: event,
              data: {
                user: user.toJSON(),
                channel_id: data.channel_id,
                chattings: channel.chattings,
              },
            }),
            isBinary,
            true,
          );
        });
      } else if (event === 'toWaitList') {
        const user = manager.findUserByWs(ws);
        manager.toWaitList(user);
        messageQueue.push(() => {
          user.ws.send(
            JSON.stringify({
              event: event,
              data: { user: user.toJSON() },
            }),
            isBinary,
            true,
          );
        });
      }
    }
  };
}
