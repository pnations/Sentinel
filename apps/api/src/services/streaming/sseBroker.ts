export type StreamMessageType =
  | "event.created"
  | "finding.created"
  | "incident.created"
  | "incident.updated"
  | "ai.analysis.created"
  | "response.action.updated";

export type StreamMessage<TPayload = unknown> = {
  id: string;
  type: StreamMessageType;
  timestamp: string;
  payload: TPayload;
};

type Subscriber = {
  id: string;
  write: (message: string) => void;
  close: () => void;
};

export class SseBroker {
  private subscribers = new Map<string, Subscriber>();

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);
    return () => {
      this.subscribers.delete(subscriber.id);
      subscriber.close();
    };
  }

  publish<TPayload>(message: StreamMessage<TPayload>): void {
    const formatted = `id: ${message.id}\nevent: ${message.type}\ndata: ${JSON.stringify(message)}\n\n`;

    for (const subscriber of this.subscribers.values()) {
      subscriber.write(formatted);
    }
  }

  heartbeat(): void {
    for (const subscriber of this.subscribers.values()) {
      subscriber.write(": heartbeat\n\n");
    }
  }

  count(): number {
    return this.subscribers.size;
  }
}
