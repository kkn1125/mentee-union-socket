import uWS from 'uWebSockets.js';

export declare global {
  export declare interface Test {}

  export declare interface Message {
    id: number;
    user_id: number;
    username: string;
    profile: string;
    message: string;
    removed: boolean;
    created_at: number;
  }

  declare interface CustomWs {
    url: string;
    email?: string;
    user_id?: number;
    profile?: string;
  }
}

export declare namespace UWS {
  export declare interface WebSocket extends uWS.WebSocket<CustomWs>, CustomWs {
    // url: string;
  }
}

export declare interface DefaultMessageType {
  event: string;
}

export declare interface DataManagerType extends DefaultMessageType {
  type: 'manager';
  data: any;
}
export declare interface DataUserType extends DefaultMessageType {
  type: 'user';
  data: User;
}
export declare interface DataChannelType extends DefaultMessageType {
  type: 'channel';
  data: Channel;
}
export declare interface DataMessageType extends DefaultMessageType {
  type: 'message';
  data: {
    message: string;
    scope: string;
  };
}

export declare interface DataStringType extends DefaultMessageType {
  type: 'string';
  data: string;
}

// export declare type DataType =
//   | string
//   | DataMessageType
//   | DataChannelType
//   | DataUserType;

export declare type MessageType =
  | DataManagerType
  | DataUserType
  | DataChannelType
  | DataMessageType
  | DataStringType;
