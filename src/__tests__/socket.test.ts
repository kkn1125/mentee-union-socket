import { pkg } from '@/util/instances';
import { DataSource } from 'typeorm';
import * as uWS from 'uWebSockets.js';
import { WebSocket } from 'ws';
import { getServerToken, startServer } from '..';
import { EVENT, TYPE } from '@/util/global.constants';

let listenSocket: uWS.us_listen_socket;

function shutdown() {
  console.log('Shutting down now');
  uWS.us_listen_socket_close(listenSocket);
  listenSocket = null;
}

// describe('test suit', () => {
//   it('jest connection test', () => {
//     expect(1 + 1).toStrictEqual(2);
//   });
// });

beforeAll(async () => {
  const token = await getServerToken();
  startServer(token);
});

describe('socket connection test', () => {
  let client: WebSocket;
  let responseMessage;
  const params = new URLSearchParams({
    e: 'chaplet01@gmail.com',
    uid: '2',
    u: 'kimson',
    p: 'none',
    t: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsInVzZXJuYW1lIjoia2ltc29uIiwiZW1haWwiOiJjaGFwbGV0MDFAZ21haWwuY29tIiwicGhvbmVfbnVtYmVyIjoiMDEwLTEyMTItMTMxMyIsImxhc3Rfc2lnbl9pbiI6IjIwMjMtMTItMDlUMTU6MjM6NTkuMDAwWiIsImlhdCI6MTcwMjEzNTQzOSwiZXhwIjoxNzAyMTM3MjM5fQ.NqF7cJI_d3GaiLcAmpppqNN1IJOAEdH4Nz6SWBF4Ko0',
  });

  beforeEach(async () => {
    client = new WebSocket('ws://localhost:8081/mentoring?' + params);
    client.on('open', () => {
      console.log('client socket opened!');
      setTimeout(() => {
        client.close(1000);
      }, 50);
    });
    await waitForWebSocketConnection(client, client.OPEN);
  });

  afterEach(async () => {
    await waitForWebSocketConnection(client, client.CLOSED);
  });

  it('db, socket connection test', async () => {
    expect(pkg.manager.socket.users.size).toStrictEqual(1);
  });
});

describe('socket connection test', () => {
  let client: WebSocket;
  let responseMessage;
  const params = new URLSearchParams({
    e: 'chaplet01@gmail.com',
    uid: '2',
    u: 'kimson',
    p: 'none',
    t: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsInVzZXJuYW1lIjoia2ltc29uIiwiZW1haWwiOiJjaGFwbGV0MDFAZ21haWwuY29tIiwicGhvbmVfbnVtYmVyIjoiMDEwLTEyMTItMTMxMyIsImxhc3Rfc2lnbl9pbiI6IjIwMjMtMTItMDlUMTU6MjM6NTkuMDAwWiIsImlhdCI6MTcwMjEzNTQzOSwiZXhwIjoxNzAyMTM3MjM5fQ.NqF7cJI_d3GaiLcAmpppqNN1IJOAEdH4Nz6SWBF4Ko0',
  });

  beforeEach(async () => {
    client = new WebSocket('ws://localhost:8081/mentoring?' + params);
    client.on('open', () => {
      console.log('client socket opened!');
    });
    client.onmessage = (data) => {
      console.log('message', data);
      responseMessage = data;
      client.close(1000);
    };
    await waitForWebSocketConnection(client, client.OPEN);
  });

  afterEach(async () => {});

  it('user matchingQueue', async () => {
    client.send(
      JSON.stringify({
        type: TYPE.USERS,
        event: EVENT.MATCHING_USER,
        data: {
          category_id: 1,
          topic: '',
          objective: '',
          format: '',
          note: '',
          limit: 2,
        },
      }),
    );

    expect(responseMessage).toStrictEqual([
      pkg.manager.socket.findUser(pkg.ws),
    ]);

    await waitForWebSocketConnection(client, client.CLOSED);
  });
});

function waitForWebSocketConnection(socket: WebSocket, state: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(socket.readyState, state);
      if (socket.readyState === state) {
        resolve(true);
      } else {
        waitForWebSocketConnection(socket, state).then(resolve);
      }
    }, 500);
  });
}
