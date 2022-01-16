import { Callable, PageUid, Event, CommittedEvent } from "../Types/Types";
import { EventStoreInterface } from "./EventStoreInterface";

type Stream = {
  callables: Callable[],
  events: CommittedEvent[],
};

type Metadata = {
  callable: Callable,
  stream: string,
  position: {
    confirmed?: PageUid,
    sent?: PageUid,
  },
};

class MemoryStoreAdapter implements EventStoreInterface {

  protected metadata: Metadata[] = [];
  protected streams: { [key: string]: Stream } = {};
  protected events: CommittedEvent[] = [];

  addEvent(stream: string, event: Event): PageUid {
    const results = this.findOrCreateStream(stream);
    const committedEvent: CommittedEvent = {
      ...event,
      uid: this.events.length.toString()
    };

    this.events.push(committedEvent);
    results.events.push(committedEvent);

    return committedEvent.uid;
  }

  getCallable(callableUid: string): Callable {
    const metadata = this.metadata[parseInt(callableUid)];

    if (!metadata) {
      throw new Error('Invalid callable uid');
    }

    return metadata.callable;
  }

  getCallableStreamName(callableUid: string): string {
    const metadata = this.metadata[parseInt(callableUid)];

    if (!metadata) {
      throw new Error('Invalid callable uid');
    }

    return metadata.stream;
  }

  getCallables(stream: string): Callable[] {
    const results = this.findStreamByName(stream);

    return results?.callables || [];
  }

  register(stream: string, callable: Callable): string {
    const results = this.findOrCreateStream(stream);
    const uid = this.createMetadata(stream, callable);

    callable.uid = uid;
    results.callables.push(callable);

    return uid;
  }

  remove(callableUid: string): boolean {
    const metadataIndex = parseInt(callableUid);
    const metadata = this.metadata[metadataIndex];

    if (!metadata) {
      return false;
    }

    const callableIndex = this.streams[metadata.stream].callables.findIndex((callable) => callable.uid === callableUid);

    delete this.metadata[metadataIndex];
    delete this.streams[metadata.stream].callables[callableIndex];

    return true;
  }

  confirm(callableUid: string, uid: PageUid): boolean {
    const metadata = this.getMetadata(callableUid);

    metadata.position.confirmed = uid;

    return true;
  }

  getLastConfirmedPosition(callableUid: string): PageUid | undefined {
    const metadata = this.getMetadata(callableUid);

    return metadata.position.confirmed;
  }

  getLastSentPosition(callableUid: string): PageUid | undefined {
    const metadata = this.getMetadata(callableUid);

    return metadata.position.sent;
  }

  setPosition(callableUid: string, position?: PageUid): boolean {
    const metadata = this.getMetadata(callableUid);

    metadata.position.confirmed = position;
    metadata.position.sent = position;

    return true;
  }
  
  setSentPosition(callableUid: string, position: PageUid): boolean {
    const metadata = this.getMetadata(callableUid);

    metadata.position.sent = position;

    return true;
  }

  setLastConfirmedPosition(callableUid: string, position: PageUid): boolean {
    const metadata = this.getMetadata(callableUid);

    metadata.position.confirmed = position;

    return true;
  }
  
  getCorrelatedEvents(correlationUid: string, limit: number, from: PageUid): CommittedEvent[] {
    return this.events.filter(event => event.correlationUid === correlationUid);
  }

  /**
   * get events, but don't include the event `from`
   * 
   * @param stream stream name
   * @param limit number of events to get
   * @param from event to search from
   * @returns 
   */
  getStreamEvents(stream: string, limit: number, from?: PageUid): CommittedEvent[] {
    const results = this.findStreamByName(stream);
    const fromIndex = from ? parseInt(from) + 1 : 0;

    if (!results) {
      throw new Error('Invalid stream name');
    }

    return results.events.slice(fromIndex, fromIndex + limit);
  }

  protected findStreamByName(name: string): Stream | undefined {
    return this.streams[name];
  }

  protected findOrCreateStream(name: string): Stream {
    const stream = this.findStreamByName(name);
    
    if (stream) {
      return stream;
    }

    return this.streams[name] = {
      callables: [],
      events: [],
    };
  }

  protected createMetadata(stream: string, callable: Callable, fifo: boolean = true): string {
    const streamEventsLength = this.streams[stream].events.length;
    const metadata: Metadata = {
      stream,
      callable,
      position: {
        confirmed: undefined,
        sent: streamEventsLength > 0 ? (streamEventsLength - 1).toString() : undefined,
      }
    };

    return (this.metadata.push(metadata) - 1).toString();
  }

  protected getMetadata(callableUid: string): Metadata {
    const uid = parseInt(callableUid);
    const metadata: Metadata | undefined = this.metadata[uid];

    if (metadata) {
      return metadata;
    }

    throw new Error('invalid callable uid');
  }
}

export { MemoryStoreAdapter };