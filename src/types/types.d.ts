import uWS from 'uWebSockets.js';

export declare global {
  export declare interface Test {}

  export declare interface Message {
    id?: number;
    user_id: number;
    username: string;
    profile: string;
    message: string;
    is_read?: boolean;
    is_top?: boolean;
    removed?: boolean;
    created_at: number;
  }

  declare interface CustomWs {
    url: string;
    token: string;
    email: string;
    username: string;
    user_id: number;
    profile: string;
  }
  declare interface User {
    id: number;
    grade_id: number;
    username: string;
    email: string;
    phone_number: string;
    birth: Date;
    gender: string;
    auth_email: boolean;
    level: number;
    points: number;
    fail_login_count: number;
    last_login_at: Date;
    status: string;
    deleted_at: Date;
    created_at: Date;
    updated_at: Date;

    profiles: Profile[];
    mentorings: Mentoring[];
    grade: Grade;
  }
  declare interface Grade {
    id: number;
    name: string;
    description: string;
    deleted_at: Date;
    created_at: Date;
    updated_at: Date;
    users: User[];
  }
  declare interface Profile {
    id: number;
    user_id: number;
    origin_name: string;
    new_name: string;
    user: User;
  }
  declare interface Mentoring {
    id: number;
    mentee_id: number;
    mentoring_session_id: number;
    token: string;
    status: string;
    deleted_at: Date;
    created_at: Date;
    updated_at: Date;
    mentoringSession: MentoringSession;
    user: User;
  }

  declare interface MentoringSession {
    id: number;
    category_id: number;
    topic: string;
    objective: string;
    format: string;
    note: string;
    limit: number;
    deleted_at: Date;
    created_at: Date;
    updated_at: Date;
    mentorings: Mentoring[];
    messages: Message[];
    category: Category;
  }

  declare interface Message {
    id: number;
    user_id: number;
    mentoring_session_id: number;
    message: string;
    it_top: boolean;
    deleted_at: Date;
    created_at: Date;
    updated_at: Date;
    user: User;
    mentoringSession: MentoringSession;
    readedUsers: ReadUser[];
  }

  declare interface ReadMessage {
    user_id: number;
    message_id: number;
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
