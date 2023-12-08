/* Minimal example that shuts down gracefully */

import * as uWS from 'uWebSockets.js';
import { commonEventHandler } from './handler/commonEventHandler';
import type { UWS } from './types/types';
import { parseMessageToJson } from './util/feature';
import { DB_CONNECTION, PORT, checkConnection } from './util/global.constants';
import { database } from './modules/database';
import { Manager } from './modules/manager';
import { UserModel } from './models/user.model';
import { axiosInstance, messageQueue } from './util/instances';
/* We store the listen socket here, so that we can shut it down later */
import * as cryptoJS from 'crypto-js';

let listenSocket: uWS.us_listen_socket;

function shutdown() {
  console.log('Shutting down now');
  uWS.us_listen_socket_close(listenSocket);
  listenSocket = null;
}

database
  .initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
    checkConnection.resolver(true);
  })
  .catch((err) => {
    console.error('Error during Data Source initialization', err);
  });

checkConnection.promise().then(() => {
  const app = uWS./*SSL*/ App({
    // key_file_name: 'misc/key.pem',
    // cert_file_name: 'misc/cert.pem',
    // passphrase: '1234',
  });

  checkConnection.manager = new Manager(app);

  axiosInstance
    .post('/auth/socket/token')
    .then(({ data }) => {
      const token = data.data;
      const compare = cryptoJS
        .HmacSHA256('channel-socket-server', 'devkimson-sockete-server-provkey')
        .toString();
      if (token !== compare) return;
      console.log('get server side socket token', token);
      checkConnection.manager.setServerToken(token);

      app.ws('/mentoring', {
        /* Options */
        compression: uWS.SHARED_COMPRESSOR,
        maxPayloadLength: 16 * 1024 * 1024,
        idleTimeout: 32,
        /* Handlers */
        upgrade: (res, req, context) => {
          console.log(
            'An Http connection wants to become WebSocket, URL: ' +
              req.getUrl() +
              '!',
          );

          /* Keep track of abortions */
          const upgradeAborted = { aborted: false };

          /* You MUST copy data out of req here, as req is only valid within this immediate callback */
          const params = new URLSearchParams(req.getQuery());
          const email = params.get('e');
          const user_id = +params.get('uid');
          const username = params.get('u');
          const profile = params.get('p');
          const token = params.get('t');
          const url = req.getUrl();
          const secWebSocketKey = req.getHeader('sec-websocket-key');
          const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
          const secWebSocketExtensions = req.getHeader(
            'sec-websocket-extensions',
          );

          /* Simulate doing "async" work before upgrading */
          setTimeout(() => {
            // console.log(
            //   "We are now done with our async task, let's upgrade the WebSocket!",
            // );

            if (upgradeAborted.aborted) {
              console.log(
                'Ouch! Client disconnected before we could upgrade it!',
              );
              /* You must not upgrade now */
              return;
            }

            /* Cork any async response including upgrade */
            res.cork(() => {
              /* This immediately calls open handler, you must not use res after this call */
              res.upgrade(
                { url, email, username, user_id, profile, token },
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
            /* We can simply signal that we were aborted */
            upgradeAborted.aborted = true;
          });
        },
        open: (ws: UWS.WebSocket) => {
          console.log('[SYSTEM] A WebSocket connected with URL: ' + ws.url);

          const userData = ws.getUserData();
          console.log(userData);
          if (
            !(
              userData.username &&
              userData.email &&
              userData.url &&
              userData.user_id &&
              userData.profile
            )
          ) {
            ws.close();
          } else {
            // const ifUserExists = checkConnection.manager.findUserById(
            //   ws.user_id,
            // );

            ws.subscribe('broadcast');
            // const newUser = checkConnection.manager.addUser(userData, ws);

            // if (ifUserExists) {
            //   ifUserExists.ws = ws;
            //   ifUserExists.token = newUser.token;
            //   newUser.joined = ifUserExists.joined;
            //   ifUserExists.status = newUser.status;
            // }

            app.publish(
              'broadcast',
              JSON.stringify({
                event: 'findAllChannels',
                data: {
                  channels: checkConnection.manager.findUsersAllChannels(ws),
                },
              }),
              false,
              true,
            );
          }
        },
        message: async (ws: UWS.WebSocket, message, isBinary) => {
          /* Ok is false if backpressure was built up, wait for drain */
          // let ok = ws.send(message, isBinary);
          if (isBinary) {
            // binary data
          } else {
            // non-binary data
            const json = parseMessageToJson(message);
            await commonEventHandler({
              app,
              ws,
              isBinary,
            })(json);

            await commonEventHandler({
              app,
              ws,
              isBinary,
            })({
              type: 'manager',
              event: 'findAllChannels',
              data: {},
            });

            // ws.send(
            //   JSON.stringify({
            //     event: json.event,
            //     data: result,
            //   }),
            // );
          }
        },
        drain: (ws) => {
          console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
        },
        close: (ws: UWS.WebSocket, code, message) => {
          console.log('[SYSTEM] WebSocket closed');
          // const outUser = checkConnection.manager.findUserByWs(ws);
          // if (outUser) {
          // outUser.joined.forEach((join) => {
          //   const channel = checkConnection.manager.findChannelById(join);
          //   // checkConnection.manager.outChannel(ws, join);
          //   channel.out(outUser);
          //   checkConnection.manager.checkUsersZeroOrOne(channel);
          // });
          if (ws) {
            console.log('[SYSTEM] ' + ws.email + ' user out.');
          }
        },
      });
      // .get('/shutdown', (res, req) => {
      //   if (listenSocket) {
      //     res.end('Okay, shutting down now!');
      //     /* This function is provided directly by µSockets */
      //     uWS.us_listen_socket_close(listenSocket);
      //     listenSocket = null;
      //   } else {
      //     /* We just refuse if alrady shutting down */
      //     res.close();
      //   }
      // })

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
    })
    .catch(() => {
      setTimeout(() => {
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
      }, 5000);
    });
});

setInterval(() => {
  if (messageQueue.length > 0) {
    const queue = messageQueue.shift();
    queue();
  }
}, 8);
