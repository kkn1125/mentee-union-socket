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
    console.log('receive message', event, type, data);
    if (type === 'manager') {
      handleManager(app, ws, isBinary)(event, data);
    } else if (type === 'message') {
      handleMessage(app, ws, isBinary)(event, data);
    }
  };
}

function handleManager(
  app: uWS.TemplatedApp,
  ws: UWS.WebSocket,
  isBinary: boolean,
) {
  return async function handleManager(event: string, _data: any) {
    const manager = checkConnection.manager;

    const processor = {
      async findAllChannels() {
        const { data } = await manager.findUsersAllChannels(ws);
        addQueue(() => {
          app.publish('broadcast', packet(event, data.data));
        });
      },
    };

    processor[event]?.(_data);
  };
}

function handleMessage(
  app: uWS.TemplatedApp,
  ws: UWS.WebSocket,
  isBinary: boolean,
) {
  return async function handleMessage(event: string, _data: any) {
    const manager = checkConnection.manager;

    const processor = {
      async chattings(__data: any) {
        await manager.saveMessage(ws, __data);
        addQueue(() => {
          ws.send(packet(event, __data.data));
        });
      },
    };

    processor[event]?.(_data);
  };
}

function packet(event: string, data: any) {
  return JSON.stringify({
    event,
    data,
  });
}

function addQueue(cb) {
  messageQueue.push(cb);
}
