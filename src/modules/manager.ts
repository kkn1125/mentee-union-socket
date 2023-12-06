import { ChannelModel } from '@/models/channel.model';
import { ChannelManager } from './channel.manager';
import { UserManager } from './user.manager';
import { UserModel } from '@/models/user.model';
import { v4 } from 'uuid';
import { UWS } from '@/types/types';
import uWS from 'uWebSockets.js';

export class Manager {
  serverToken: string;
  app: uWS.TemplatedApp;

  channel: ChannelManager = new ChannelManager();
  user: UserManager = new UserManager();

  // users: UserModel[] = [];
  channelList: ChannelModel[] = [];
  waitList: UserModel[] = [];

  matchingQueue: {
    [type: string]: UserModel[];
  } = {};

  constructor(app: uWS.TemplatedApp) {
    this.app = app;
  }

  findChannelById(channel_id: number) {
    return this.channelList.find((channel) => channel.id === channel_id);
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
    // this.channel.createChannel({
    //   name: channelName,
    //   url: '',
    // });
    const channel = new ChannelModel(
      channelName,
      category,
      content,
      limit,
      user,
    );
    channel.join(user);
    this.channelList.push(channel);
  }

  // joinChannel(ws: UWS.WebSocket, channel_id: number) {
  //   const found = this.findUserByWs(ws);
  //   found.joinChannel(channel_id);
  //   found.status = `room${channel_id}`;
  // }

  outChannel(ws: UWS.WebSocket, channel_id: number) {
    const channel = this.findChannelById(channel_id);
    const found = this.findUserByWs(ws);
    channel.out(found);
    found.ws.publish(
      `room${channel_id}`,
      JSON.stringify({
        event: 'outChannel',
        data: {
          user: channel.admin.toJSON(),
        },
      }),
    );
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
      const waitUser = this.matchingQueue[type].shift();
      this.dequeue(type, waitUser);
      const channel = this.findChannelByAdmin(waitUser);
      channel.join(waitUser);
      channel.join(user);
      console.log('waitUser', waitUser);
      console.log('user', user);

      channel.users.forEach((_user) => {
        _user.ws.send(
          JSON.stringify({
            event: 'matched',
            data: {
              channel_id: channel.id,
              user: _user.toJSON(),
            },
          }),
        );
      });

      // user.ws.send(
      //   JSON.stringify({
      //     event: 'matched',
      //     data: {
      //       channel_id: channel.id,
      //       user: user.toJSON(),
      //     },
      //   }),
      // );
      // this.app.publish(
      //   `room${channel.id}`,
      //   JSON.stringify({
      //     type: 'matched',
      //     data: {
      //       channel_id: channel.id,
      //     },
      //   }),
      // );
    } else {
      this.addChannel({
        category: type,
        content: content,
        limit: limit,
        user,
      });
      this.matchingQueue[type].push(user);
      user.status = `matching`;
      user.ws.subscribe('matching');
    }
  }

  dequeue(type: string, user: UserModel) {
    if (!user) return;
    const index = this.matchingQueue[type].indexOf(user);
    this.matchingQueue[type].splice(index, 1);
    user.status = 'waitlist';
    user?.ws?.unsubscribe?.('matching');
  }

  toWaitList(user_id: number) {
    const found = this.findUserByUserIdInChannelList(user_id);
    if (found) {
      found.status = 'waitlist';
      found.ws.subscribe('waitlist');
    } else {
      console.log('유저가 채널에 없습니다. 이미 대기열에 있습니다.');
    }
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
