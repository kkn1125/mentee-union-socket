/* Minimal example that shuts down gracefully */

import * as uWS from 'uWebSockets.js';
import { PORT } from './util/global.constants';
import type { UWS } from './types/types';
/* We store the listen socket here, so that we can shut it down later */

let listenSocket: uWS.us_listen_socket;

function shutdown() {
  console.log('Shutting down now');
  uWS.us_listen_socket_close(listenSocket);
  listenSocket = null;
}

const app = uWS
  ./*SSL*/ App({
    // key_file_name: 'misc/key.pem',
    // cert_file_name: 'misc/cert.pem',
    // passphrase: '1234',
  })
  .ws('/mentoring', {
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
      const url = req.getUrl();
      const secWebSocketKey = req.getHeader('sec-websocket-key');
      const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
      const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');

      /* Simulate doing "async" work before upgrading */
      setTimeout(() => {
        console.log(
          "We are now done with our async task, let's upgrade the WebSocket!",
        );

        if (upgradeAborted.aborted) {
          console.log('Ouch! Client disconnected before we could upgrade it!');
          /* You must not upgrade now */
          return;
        }

        /* Cork any async response including upgrade */
        res.cork(() => {
          /* This immediately calls open handler, you must not use res after this call */
          res.upgrade(
            { url: url },
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
      console.log('A WebSocket connected with URL: ' + ws.url);
    },
    message: (ws, message, isBinary) => {
      /* Ok is false if backpressure was built up, wait for drain */
      let ok = ws.send(message, isBinary);
    },
    drain: (ws) => {
      console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
      console.log('WebSocket closed');
    },
  })
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
  .listen(PORT, (token) => {
    /* Save the listen socket for later shut down */
    listenSocket = token;
    /* Did we even manage to listen? */
    if (token) {
      console.log('Listening to port ' + PORT);

      /* Stop listening soon */
      // shutdown()
    } else {
      console.log('Failed to listen to port ' + PORT);
    }
  });
