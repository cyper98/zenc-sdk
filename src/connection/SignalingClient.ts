import EventEmitter from 'eventemitter3';
import { ConnectionState } from '../types';
import type { WSMessage } from '../types';

export interface SignalingClientOptions {
  url: string;
  token?: string;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export class SignalingClient extends EventEmitter {
  private url: string;
  private token?: string;
  private ws?: WebSocket;
  private reconnectEnabled: boolean;
  private reconnectAttempts: number;
  private reconnectDelay: number;
  private currentAttempt: number = 0;
  private reconnectTimeout?: NodeJS.Timeout;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private messageQueue: WSMessage[] = [];

  constructor(options: SignalingClientOptions) {
    super();
    this.url = options.url;
    this.token = options.token;
    this.reconnectEnabled = options.reconnect ?? true;
    this.reconnectAttempts = options.reconnectAttempts ?? 5;
    this.reconnectDelay = options.reconnectDelay ?? 1000;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.token ? `${this.url}?token=${this.token}` : this.url;
        this.ws = new WebSocket(wsUrl);
        this.setConnectionState(ConnectionState.CONNECTING);

        this.ws.onopen = () => {
          this.setConnectionState(ConnectionState.CONNECTED);
          this.currentAttempt = 0;
          this.flushMessageQueue();
          this.emit('connected');
          resolve();
        };

        this.ws.onclose = (event) => {
          this.handleDisconnect(event.code, event.reason);
        };

        this.ws.onerror = (error) => {
          this.emit('error', error);
          if (this.connectionState === 'connecting') {
            reject(new Error('WebSocket connection failed'));
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.emit('message', message);
            this.emit(message.type, message.data);
          } catch (error) {
            this.emit('error', new Error('Failed to parse message'));
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(message: WSMessage): void {
    if (this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  disconnect(): void {
    this.reconnectEnabled = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connectionStateChanged', state);
    }
  }

  private handleDisconnect(code: number, reason: string): void {
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.emit('disconnected', { code, reason });

    if (this.reconnectEnabled && this.currentAttempt < this.reconnectAttempts) {
      this.attemptReconnect();
    } else if (this.currentAttempt >= this.reconnectAttempts) {
      this.setConnectionState(ConnectionState.FAILED);
      this.emit('reconnectFailed');
    }
  }

  private attemptReconnect(): void {
    this.currentAttempt++;
    this.setConnectionState(ConnectionState.RECONNECTING);
    
    const delay = this.reconnectDelay * Math.pow(2, this.currentAttempt - 1);
    this.emit('reconnecting', { attempt: this.currentAttempt, delay });

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection will be handled by handleDisconnect
      });
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }
}
