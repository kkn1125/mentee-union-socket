import { ChannelModel } from '@/models/channel.model';
import { ChannelManager } from './channel.manager';
import { UserManager } from './user.manager';
import { UserModel } from '@/models/user.model';
import { v4 } from 'uuid';
import { UWS } from '@/types/types';
import uWS from 'uWebSockets.js';
import { messageQueue } from '@/util/instances';

export class Manager {
  serverToken: string;
  app: uWS.TemplatedApp;

  channel: ChannelManager = new ChannelManager();
  user: UserManager = new UserManager();

  // users: UserModel[] = [];
  channelList: ChannelModel[] = [];
  waitList: UserModel[] = [];

  matchingQueue: {
    [type: string]: ChannelModel[];
  } = {};

  constructor(app: uWS.TemplatedApp) {
    this.app = app;
  }

  findChannelById(channel_id: number) {
    return this.channelList.find((channel) => channel.id === channel_id);
  }

  checkUsersZeroOrOne(channel: ChannelModel) {
    if (channel.users.length === 0) {
      console.log('[SYSTEM] channel remove', channel.id);
      this.removeChannel(channel.id);
    } else if (channel.users.length === 1) {
      channel.admin = channel.users[0];
      this.matchingQueue[channel.category].push(channel);
      messageQueue.push(() => {
        this.app.publish(
          `room${channel.id}`,
          JSON.stringify({
            event: 'outChannel/admin',
            data: {
              user: channel.admin.toJSON(),
            },
          }),
          false,
          true,
        );
      });
    }
  }

  findUserByWs(ws: UWS.WebSocket) {
    return (
      this.waitList.find((user) => user.ws === ws) ||
      this.channelList.reduce((acc: null | UserModel, cur) => {
        if (acc === null) {
          const user = cur.findUserByWs(ws);
          if (user) {
            return user;
          }
        } else {
          return acc;
        }
      }, null)
    );
  }

  findUserByUserIdInWaitList(user_id: number) {
    return this.waitList.find((user) => user.user_id === user_id);
  }

  removeUserInWaitList(ws: UWS.WebSocket) {
    const found = this.findUserByWs(ws);
    if (found) {
      const index = this.waitList.indexOf(found);
      if (index === -1) {
        console.log('해당 유저는 대기열에 없습니다.');
        return null;
      } else {
        this.waitList.splice(index, 1);
        return found;
      }
    } else {
      console.log('해당 유저는 이미 삭제되었습니다.');
      return null;
    }
  }

  removeUserInChannels(ws: UWS.WebSocket) {
    const found = this.findUserByWs(ws);
    found.joined.forEach((join) => {
      found.outChannel(join);
    });
    const channels = this.channelList.filter((channel) =>
      channel.users.includes(found),
    );
    if (channels.length > 0) {
      channels.forEach((channel) => {
        channel.out(found);
      });
      return found;
    } else {
      console.log('해당 유저는 채널에 없습니다.');
      return null;
    }
  }

  findUserByUserIdInChannelList(user_id: number) {
    for (const channel of this.channelList) {
      return channel.users.find((user) => user.user_id === user_id);
    }

    return null;
  }

  findUserById(user_id: number) {
    return (
      this.findUserByUserIdInWaitList(user_id) ||
      this.findUserByUserIdInChannelList(user_id)
    );
  }

  findChannelByAdmin(user: UserModel) {
    return this.channelList.find((channel) => channel.admin === user);
  }

  setServerToken(token: string) {
    this.serverToken = token;
  }

  addUser(userData: CustomWs, ws: UWS.WebSocket) {
    const user = new UserModel(userData);
    user.setWs(ws);
    user.setApp(this.app);
    ws.subscribe('waillist');
    this.waitList.push(user);
    return user;
  }

  addChannel({
    category,
    content,
    limit,
    user,
  }: {
    category: string;
    content: string;
    limit: number;
    user: UserModel;
  }) {
    const channelName = v4();
    const channel = new ChannelModel(
      channelName,
      category,
      content,
      limit,
      user,
    );
    channel.join(user);
    this.channelList.push(channel);
    return channel;
  }

  joinChannel(ws: UWS.WebSocket, channel_id: number) {
    const found = this.findUserByWs(ws);
    const channel = this.findChannelById(channel_id);
    channel.join(found);
  }

  outChannel(ws: UWS.WebSocket, channel_id: number) {
    const found = this.findUserByWs(ws);
    const channel = this.findChannelById(channel_id);
    if (channel) {
      channel.out(found);
      messageQueue.push(() => {
        found.ws.publish(
          `room${channel_id}`,
          JSON.stringify({
            event: 'outChannel',
            data: {
              user: channel.admin.toJSON(),
            },
          }),
          false,
          true,
        );
      });
    } else {
      console.log('no channel');
    }
  }

  removeChannel(channel_id: number) {
    const index = this.channelList.findIndex(
      (channel) => channel.id === channel_id,
    );
    this.channelList.splice(index, 1);
  }

  addQueue(
    type: string,
    user: UserModel,
    content: string = 'no content',
    limit: number = 5,
  ) {
    if (!this.matchingQueue[type]) {
      this.matchingQueue[type] = [];
    }
    if (this.matchingQueue[type].length > 0) {
      const channel = this.dequeue(type);
      channel.admin.ws.unsubscribe(channel.admin.status);
      channel.admin.status = `room${channel.id}`;
      channel.admin.ws.subscribe(channel.admin.status);
      channel.join(user);

      channel.saveMessage({
        message: `${user.ws.username}님이 매칭되었습니다.`,
        removed: false,
        username: 'system',
        profile: user.profile,
        user_id: user.user_id,
        created_at: +new Date(),
      });

      channel.saveMessage({
        message: `서로 존중하는 건강한 멘티 문화를 만드는데 참여해주세요 :)`,
        removed: false,
        username: 'system',
        profile: user.profile,
        user_id: user.user_id,
        created_at: +new Date(),
      });

      channel.users.forEach((_user) => {
        console.log('send channel event matched to', _user.email);
        messageQueue.push(() => {
          _user.ws.send(
            JSON.stringify({
              event: 'matched',
              data: {
                channel_id: channel.id,
                user: _user.toJSON(),
                chattings: channel.chattings,
              },
            }),
            false,
            true,
          );
        });
      });
    } else {
      const channel = this.addChannel({
        category: type,
        content: content,
        limit: limit,
        user,
      });
      this.matchingQueue[type].push(channel);
      channel.saveMessage({
        message: `${user.ws.username}님이 매칭되었습니다.`,
        removed: false,
        username: 'system',
        profile: user.profile,
        user_id: user.user_id,
        created_at: +new Date(),
      });
      user.status = `matching`;
      user.ws.subscribe('matching');
    }
  }

  dequeue(type: string) {
    return this.matchingQueue[type].shift();
  }

  toWaitList(user: UserModel) {
    if (user.status !== 'waitlist') {
      // if (found.status.startsWith('room')) {
      //   this.outChannel(found.ws, Number(found.status.replace('room', '')));
      // }
      user.joined.forEach((join) => {
        user.ws.unsubscribe('room' + join);
      });
      user.status = 'waitlist';
      user.ws.subscribe('waitlist');
    } else {
      console.log('유저가 채널에 없습니다. 이미 대기열에 있습니다.');
    }
  }

  getChannels(ws: UWS.WebSocket) {
    return this.channelList.filter((channel) =>
      channel.users.some((user) => user.ws === ws),
    );
  }

  disconnectUser(user_id: number) {
    const found = this.findUserById(user_id);
    if (found) {
      const result =
        this.removeUserInWaitList(found.ws) ||
        this.removeUserInChannels(found.ws);
      result.disconnect();
    } else {
      console.log('유저가 채널에 없습니다. 이미 대기열에 있습니다.');
    }
  }
}
