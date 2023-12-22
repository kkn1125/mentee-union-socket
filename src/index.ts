/* Minimal example that shuts down gracefully */

import * as uWS from 'uWebSockets.js';
// import { commonEventHandler } from './handler/commonEventHandler';
import { Manager } from './modules/manager';
import type { UWS } from './types/types';
import { parseMessageToJson } from './util/feature';
import { EVENT, PORT, TYPE } from './util/global.constants';
import { axiosInstance, messageQueue, pkg } from './util/instances';
/* We store the listen socket here, so that we can shut it down later */
import * as cryptoJS from 'crypto-js';
import { handleNonBinaryData } from './handler/handleNonBinaryData';

let listenSocket: uWS.us_listen_socket;

function shutdown() {
  console.log('Shutting down now');
  uWS.us_listen_socket_close(listenSocket);
  listenSocket = null;
}

let app: uWS.TemplatedApp;

export function startServer(serverToken: string) {
  app = uWS./*SSL*/ App({
    // key_file_name: 'misc/key.pem',
    // cert_file_name: 'misc/cert.pem',
    // passphrase: '1234',
  });

  pkg.manager = new Manager(app, serverToken);

  app.ws('/mentoring', {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 32,
    /* Handlers */
    upgrade: handleUpgrade,
    open: handleOpen,
    message: async (ws: UWS.WebSocket, message, isBinary) => {
      // pkg.ws = ws;
      /* Ok is false if backpressure was built up, wait for drain */
      if (isBinary) {
        // binary data
      } else {
        // non-binary data
        const json = parseMessageToJson(message);

        handleNonBinaryData(app, ws)(json.type, json.event, json.data);
      }
    },
    drain: (ws) => {
      console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
    },
    close: handleClose,
  });

  app.listen(PORT, (token) => {
    /* Save the listen socket for later shut down */
    listenSocket = token;
    /* Did we even manage to listen? */
    if (token) {
      console.log('Socket Server listening to port ' + PORT);
      /* Stop listening soon */
      // shutdown()
    } else {
      console.log('Failed to listen to port ' + PORT);
    }
  });
}

function handleUpgrade(
  res: uWS.HttpResponse,
  req: uWS.HttpRequest,
  context: uWS.us_socket_context_t,
) {
  console.log(
    'An Http connection wants to become WebSocket, URL: ' + req.getUrl() + '!',
  );

  /* Keep track of abortions */
  const upgradeAborted = { aborted: false };

  /* You MUST copy data out of req here, as req is only valid within this immediate callback */
  const params = new URLSearchParams(req.getQuery());
  const email = params.get('e');
  const user_id = +params.get('uid');
  const username = params.get('u');
  const profile = params.get('p');
  const url = req.getUrl();
  const secWebSocketKey = req.getHeader('sec-websocket-key');
  const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
  const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');

  /* Simulate doing "async" work before upgrading */
  setTimeout(() => {
    if (upgradeAborted.aborted) {
      console.log('Ouch! Client disconnected before we could upgrade it!');
      /* You must not upgrade now */
      return;
    }

    /* Cork any async response including upgrade */
    res.cork(() => {
      /* This immediately calls open handler, you must not use res after this call */
      res.upgrade(
        { url, email, username, user_id, profile },
        /* Use our copies here */
        secWebSocketKey,
        secWebSocketProtocol,
        secWebSocketExtensions,
        context,
      );
    });
  }, 1000);

  /* You MUST register an abort handler to know if the upgrade was aborted by peer */
  res.onAborted(() => {
    console.log('aborted');
    /* We can simply signal that we were aborted */
    upgradeAborted.aborted = true;
  });
}

async function handleOpen(ws: UWS.WebSocket) {
  console.log('[SYSTEM] A WebSocket connected with URL: ' + ws.url);
  messageQueue.push(() => {
    try {
      const userData = ws.getUserData();
      if (
        userData.username === undefined ||
        userData.email === undefined ||
        userData.url === undefined ||
        userData.user_id === undefined ||
        userData.profile === undefined
      ) {
        console.log(
          userData.username,
          userData.email,
          userData.url,
          userData.user_id,
          userData.profile,
        );
        ws.end();
      } else {
        try {
          ws.subscribe('broadcast');
          ws.subscribe('waitlist');
          pkg.manager.socket.addUser(ws);
          handleNonBinaryData(app, ws)(
            TYPE.SESSIONS,
            EVENT.FINDALL_SESSION,
            {},
          );
        } catch (error) {
          console.log('catch open subscribe error:', error);
        }
      }
    } catch (error) {
      console.log('catch close error:', error);
    }
  });
}

function handleClose(ws: UWS.WebSocket, code: number, message: ArrayBuffer) {
  console.log('[SYSTEM] WebSocket closed\ncode:', code, message);
  // });
  try {
    if (ws) {
      console.log('[SYSTEM] ' + ws.email + ' user out.');
      pkg.manager.deleteUser(ws);
    }
  } catch (error) {
    console.log('catch close error:', error);
  }
}

export async function getServerToken() {
  const { data } = await axiosInstance.post('/auth/socket/token');
  const token = data.data;
  const compare = cryptoJS
    .HmacSHA256('channel-socket-server', 'devkimson-sockete-server-provkey')
    .toString();

  if (token !== compare) return;

  console.log('get server side socket token', token);

  return token;
}

async function excuteSocketServer() {
  let queue;
  try {
    const token = await getServerToken();
    startServer(token);
    queue = setInterval(() => {
      if (messageQueue.length > 0) {
        const queue = messageQueue.shift();
        queue?.();
      }
    }, 8);
  } catch (error) {
    console.log('catch queue error', error);
    clearInterval(queue);
  }
}

process.env.RUN_MODE !== 'test' && excuteSocketServer();
