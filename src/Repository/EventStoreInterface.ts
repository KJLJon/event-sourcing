import { Callable, CommittedEvent, Event, PageUid } from "../Types/Types";

interface EventStoreInterface {
  getCallable(callableUid: string): Callable;
  getCallableStreamName(callableUid: string): string

  getCallables(stream: string): Callable[];
  register(stream: string, callable: Callable): string;
  remove(callableUid: string): boolean;

  confirm(callableUid: string, uid: string): boolean;
  
  getLastSentPosition(callableUid: string): PageUid | undefined;
  getLastConfirmedPosition(callableUid: string): PageUid | undefined;
  setPosition(callableUid: string, position?: PageUid): boolean;
  setSentPosition(callableUid: string, position: PageUid): boolean;
  setLastConfirmedPosition(callableUid: string, position: PageUid): boolean;

  getCorrelatedEvents(correlationUid: string, limit: number, from?: PageUid): CommittedEvent[];
  getStreamEvents(stream: string, limit: number, from?: PageUid): CommittedEvent[];

  addEvent(stream: string, event: Event): PageUid;
}

export { EventStoreInterface }