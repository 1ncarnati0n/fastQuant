import { nextDelay } from "./backoff";

export type WsStatus = "connecting" | "connected" | "disconnected";

export interface WsMessage {
  type: string;
  payload?: unknown;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private explicitClose = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly messageListeners = new Set<(msg: WsMessage) => void>();
  private readonly statusListeners = new Set<(status: WsStatus) => void>();

  constructor(private readonly url: string) {}

  connect(): void {
    this.explicitClose = false;
    this._connect();
  }

  disconnect(): void {
    this.explicitClose = true;
    this._clearTimers();
    this.ws?.close(1000);
    this.ws = null;
    this._emit("disconnected");
  }

  send(msg: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(cb: (msg: WsMessage) => void): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  onStatus(cb: (status: WsStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private _connect(): void {
    this._emit("connecting");
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.attempt = 0;
      this._emit("connected");
      this._startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage;
        if (msg.type === "pong") return;
        this.messageListeners.forEach((cb) => cb(msg));
      } catch {
        /* ignore malformed */
      }
    };

    this.ws.onclose = () => {
      this._clearTimers();
      if (!this.explicitClose) {
        const delay = nextDelay(this.attempt++);
        this._emit("connecting");
        this.reconnectTimer = setTimeout(() => this._connect(), delay);
      } else {
        this._emit("disconnected");
      }
    };

    this.ws.onerror = () => this.ws?.close();
  }

  private _startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, 20_000);
  }

  private _clearTimers(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
  }

  private _emit(status: WsStatus): void {
    this.statusListeners.forEach((cb) => cb(status));
  }
}
