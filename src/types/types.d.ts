import uWS from 'uWebSockets.js';

export declare global {
  export declare interface Test {}
  declare interface CustomWs {
    url: string;
  }
}

export declare namespace UWS {
  export declare interface WebSocket extends uWS.WebSocket<CustomWs>, CustomWs {
    // url: string;
  }
}
