import { v4 } from 'uuid';
import { UserModel } from './user.model';
import { UWS } from '@/types/types';

export class ChannelModel {
  static id: number = 0;
  id: number;
  name: string;
  category: string;
  content: string;
  limit: number;
  users: UserModel[] = [];
  whiteList: number[] = [];
  blackList: number[] = [];
  admin: UserModel;
  chattings: Message[] = [];

  constructor(
    name: string = v4(),
    category: string = 'none',
    content: string = 'none',
    limit: number = 5,
    admin: UserModel,
  ) {
    ChannelModel.id += 1;
    this.id = ChannelModel.id;
    this.name = name;
    this.category = category;
    this.content = content;
    this.limit = limit;
    this.admin = admin;
  }

  join(user: UserModel) {
    if (this.whiteList.length === 0) {
      user.joinChannel(this.id);
      this.users.push(user);
    } else {
      const isWhiteUser = this.whiteList.includes(user.user_id);
      if (isWhiteUser) {
        this.users.push(user);
      } else {
        console.log(
          'blocked join this channel cause it was turn on white list mode',
        );
      }
    }
  }

  out(user: UserModel) {
    user.outChannel(this.id);
    this.users = this.users.filter((_user) => _user.id !== user.id);
  }

  findUserByWs(ws: UWS.WebSocket) {
    return this.users.find((user) => user.ws === ws);
  }

  checkBlackList() {
    return this.users.some((user) => this.blackList.includes(user.user_id));
  }

  checkWhiteList() {
    return this.users.some((user) => this.whiteList.includes(user.user_id));
  }

  findUser(user_id: number) {
    return this.users.find((user) => user.user_id === user_id);
  }

  addWhiteList(user: UserModel) {
    this.whiteList.push(user.user_id);
    this.join(user);
  }

  addBlackList(user: UserModel) {
    this.blackList.push(user.user_id);
    const hasBlackUser = this.checkBlackList();
    if (hasBlackUser) {
      const blackUser = this.findUser(user.user_id);
      this.out(blackUser);
    }
  }

  disconnect(user: UserModel) {
    this.out(user);
    user.disconnect();
  }

  saveMessage(message: Message) {
    const lastChat = this.chattings[this.chattings.length - 1];
    console.log('save message', message);
    if (lastChat) {
      message.id = lastChat.id + 1;
    } else {
      message.id = 1;
    }
    this.chattings.push(message);
  }

  removeMessage(message_id: number) {
    const message = this.chattings.find((chat) => chat.id === message_id);
    message.removed = true;
  }
}
