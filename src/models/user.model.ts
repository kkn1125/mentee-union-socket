import { UWS } from '@/types/types';
import { v4 } from 'uuid';
import uWS from 'uWebSockets.js';

export class UserModel {
  static id: number = 0;
  id: number;
  user_id: number;
  profile: string;
  token: string;
  email: string;
  url: string;
  status: 'waitlist' | 'matching' | `matching/${string}` | `room${string}` =
    'waitlist';
  joined: number[] = [];
  ws: UWS.WebSocket;
  app: uWS.TemplatedApp;
  // TODO: 이후 비회원, 회원, 구독회원 타입 지정 필요
  // type: 'user' | 'user';

  constructor(url: string, user_id: number, email: string, profile: string);
  constructor(userData: CustomWs);
  constructor(
    dataOrUrl: string | CustomWs,
    user_id?: number,
    email?: string,
    profile?: string,
  ) {
    UserModel.id += 1;
    this.id = UserModel.id;
    this.token = v4();
    if (typeof dataOrUrl === 'string') {
      this.url = dataOrUrl;
      this.user_id = user_id;
      this.email = email;
      this.profile = profile;
    } else {
      this.url = dataOrUrl.url;
      this.user_id = dataOrUrl.user_id;
      this.email = dataOrUrl.email;
      this.profile = dataOrUrl.profile;
    }
  }

  setWs(ws: UWS.WebSocket) {
    this.ws = ws;
  }

  setApp(ws: uWS.TemplatedApp) {
    this.app = ws;
  }

  // initSubscribe() {
  //   this.ws.subscribe('waitlist');
  // }

  joinChannel(channel_id: number) {
    if (!this.joined.includes(channel_id)) {
      this.joined.push(channel_id);
    }
    this.status = `room${channel_id}`;
    this.ws.unsubscribe('waitlist');
    this.ws.subscribe(this.status);
  }

  outChannel(channel_id: number) {
    this.ws.unsubscribe(this.status);
    this.ws.unsubscribe(`room${channel_id}`);
    this.status = 'waitlist';
    const index = this.joined.indexOf(channel_id);
    this.joined = this.joined.filter((join) => join !== index);
    this.ws.subscribe('waitlist');
  }

  disconnect() {
    console.log(this.email + ' 유저의 연결이 끊어집니다.');
    console.log(this.email + ' 유저의 상태: ' + this.status);
    this.ws.close();
  }

  get [Symbol.toStringTag]() {
    return JSON.stringify(Object.assign({}, this));
  }

  toJSON() {
    return Object.assign(
      {},
      {
        id: this.id,
        user_id: this.user_id,
        profile: this.profile,
        token: this.token,
        email: this.email,
        url: this.url,
        status: this.status,
        joined: this.joined,
        ws: this.ws,
        app: this.app,
      },
    );
  }
}
