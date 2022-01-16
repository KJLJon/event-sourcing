import { EventStoreInterface } from "../Repository/EventStoreInterface";
import { Callable, CommittedEvent, Event, PageUid } from "../Types/Types";

class EventSourceService {
  constructor(protected readonly store: EventStoreInterface) {}

  /**
   * 
   * @param stream stream name
   * @param callback callback function
   * @returns callableUid
   */
  register(stream: string, callable: Callable): string {
    return this.store.register(stream, callable)
  };

  remove(callableUid: string): boolean {
    return this.store.remove(callableUid);
  }

  commit(stream: string, event: Event): boolean {
    const uid = this.store.addEvent(stream, event);
    const callables = this.store.getCallables(stream);

    callables.map((callable) => {
      try {
        callable.fn(event);
        if (callable.uid) {
          this.store.setSentPosition(callable.uid, uid);
        }
      } catch (e) {
      }
    })

    return true;
  }

  /**
   * Reset position 
   * @param callableUid callable unique id
   * @param uid uid to reset to.  If excluded, reset to the begining
   * 
   * @returns if it was successfully reset
   */
  reset(callableUid: string, uid?: PageUid): boolean {
    return this.store.setPosition(callableUid, uid);
  }

  /**
   * Replay events, it doesn't update the position, just replay's
   * 
   * @param callableUid callable to replace
   * @param fromUid from uid, if excluded it will start from begining
   * @param toUid to uid, if excluded will end at current confirmed uid
   */
  replay(callableUid: string, fromUid?: PageUid, toUid?: PageUid): void {
    const callable = this.store.getCallable(callableUid);
    const stream = this.store.getCallableStreamName(callableUid);
    let loop: boolean = true;

    while (loop) {
      const events = this.store.getStreamEvents(stream, 10, fromUid);
      
      if (events.length === 0) {
        loop = false;
        return;
      }

      events.forEach(event => {
        if (loop === false || event.uid === toUid) {
          loop = false;
          return;
        }

        callable.fn(event);

        fromUid = event.uid;
      });
    }
  };

  pull(callableUid: string, limit: number): CommittedEvent[] {
    const stream = this.store.getCallableStreamName(callableUid);
    const from = this.store.getLastSentPosition(callableUid);
    const events = this.store.getStreamEvents(stream, limit, from);
    const length = events.length;

    if (length) {
      this.store.setSentPosition(callableUid, events[length - 1].uid);
    }

    return events
  }

  /**
   * confirm event
   * @param uid uid of event
   * @returns if it was successfully confirmed
   */
  confirm(callableUid: string, uid: string): boolean {
    return this.store.confirm(callableUid, uid);
  }

  /**
   * fetch by stream
   * @param stream stream name
   * @param limit limit number of results
   * @param uid if included will provide events from this uid
   */
  fetchByStream(stream: string, limit: number = 100, uid?: PageUid): Event[] {
    return this.store.getStreamEvents(stream, limit, uid);
  }

  fetchByCorrelation(correlationUid: string, limit: number, uid?: PageUid): Event[] {
    return this.store.getCorrelatedEvents(correlationUid, limit, uid);
  }
}

export { EventSourceService }