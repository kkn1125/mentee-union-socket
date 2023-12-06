import { MessageType, UWS } from '@/types/types';
import { checkConnection } from '@/util/global.constants';
import { axiosInstance } from '@/util/instances';
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
        console.log('user status', user, channel, channelId);
        // if (channel) {
        channel.saveMessage(data);
        app.publish(
          user.status,
          JSON.stringify({
            event: 'chattings',
            data: {
              chattings: channel.chattings,
            },
          }),
        );
        // }
      } else if (event === 'remove/chat') {
        const user = manager.findUserByWs(ws);
        const channelId = Number(user.status.replace('room', ''));
        const channel = manager.findChannelById(channelId);
        if (channel) {
          channel.removeMessage(data.chat_id);
          app.publish(
            user.status,
            JSON.stringify({
              event: 'chattings',
              data: {
                chattings: channel.chattings,
              },
            }),
          );
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
        const result = user.toJSON();
        user.ws.send(
          JSON.stringify({
            event: event,
            data: result,
          }),
        );
        return user.toJSON();
      } else if (event === 'joinChannel') {
        const user = manager.findUserByWs(ws);
        const channel = manager.findChannelById(data.channel_id);
        channel.join(user);
        const result = user.toJSON();
        user.ws.send(
          JSON.stringify({
            event: event,
            data: result,
          }),
        );
      } else if (event === 'outChannel') {
        const user = manager.findUserByWs(ws);
        manager.outChannel(ws, +data.channel_id);
        const channel = manager.findChannelById(+data.channel_id);
        if (channel.users.length === 0) {
          console.log('[SYSTEM] channel remove', channel.id);
          manager.removeChannel(+data.channel_id);
        } else if (channel.users.length === 1) {
          channel.admin = channel.users[0];
          app.publish(
            `room${channel.id}`,
            JSON.stringify({
              event: event,
              data: {
                user: channel.admin.toJSON(),
              },
            }),
          );
        }
        user.ws.send(
          JSON.stringify({
            event: event,
            data: {
              user: user.toJSON(),
            },
          }),
        );
      } else if (event === 'addQueue') {
        const user = manager.findUserByWs(ws);
        manager.addQueue(data.type, user, data.content, +data.limit);
        const result = user.toJSON();
        user.ws.send(
          JSON.stringify({
            event: event,
            data: result,
          }),
        );
      } else if (event === 'dequeue') {
        const user = manager.findUserByWs(ws);
        manager.dequeue(data.type, user);
        const result = user.toJSON();
        user.ws.send(
          JSON.stringify({
            event: event,
            data: result,
          }),
        );
      } else if (event === 'toWaitList') {
        const user = manager.findUserByWs(ws);
        manager.toWaitList(ws.user_id);
        const result = user.toJSON();
        user.ws.send(
          JSON.stringify({
            event: event,
            data: result,
          }),
        );
      }
    }
  };
}
