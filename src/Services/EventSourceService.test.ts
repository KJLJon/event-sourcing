import { EventSourceService } from "..";
import { MemoryStoreAdapter } from "../Repository/MemoryStoreAdapter";
import { Callable, Event } from "../Types/Types";

const adapter = new MemoryStoreAdapter();
const service = new EventSourceService(adapter);

// @ts-ignore
//const { events, streams, metadata } = adapter;

beforeEach(() => {
  // @ts-ignore
  adapter.events = [];
  // @ts-ignore
  adapter.streams = [];
  // @ts-ignore
  adapter.metadata = [];
});

const addEvents = (stream: string = 'test', correlation: string = Math.random().toString()) => {
  return service.commit(stream, {
    type: 'tested',
    correlationUid: correlation
  });
};

const addCallable = (stream: string = 'test', fn: Function = jest.fn()): {callableUid: string, fn: Function} => {
  const callableUid = service.register(stream, {
    type: 'function',
    fn: fn,
  });

  return { callableUid, fn };
}



it('should add an event', () => {
  const stream = 'stream';
  const committed = addEvents(stream)

  const streamEvents = service.fetchByStream(stream);

  expect(committed).toBe(true);
  expect(streamEvents).toHaveLength(1);
});


it('should register callable', () => {
  const streamNameWithEvents = 'test-callable';
  const callableYesEvents = addCallable(streamNameWithEvents);
  const callableNoEvents = addCallable();

  addEvents(streamNameWithEvents);
  
  expect(callableYesEvents.fn).toBeCalledTimes(1);
  expect(callableNoEvents.fn).not.toBeCalled();
});


it('should remove listener', () => {
  const {callableUid, fn} = addCallable();
  service.remove(callableUid);
  addEvents();

  expect(fn).not.toBeCalled();
});


it('should replay events', () => {
  addEvents();

  const {callableUid, fn} = addCallable();

  service.replay(callableUid);
  
  expect(fn).toBeCalledTimes(1);
});

it('should pull events after reset', () => {
  addEvents();

  const {callableUid, fn} = addCallable();
  
  service.reset(callableUid);
  service.pull(callableUid, 10).forEach((event) => {
    fn(event);
    service.confirm(callableUid, event.uid);
  });

  expect(fn).toBeCalledTimes(1);
  expect(service.pull(callableUid, 10)).toHaveLength(0);
});

it('should fetch events', () => {
  const correlationId = 'test';

  addEvents('stream-1', correlationId);
  addEvents('stream-2', correlationId);

  const correlatedEvents = service.fetchByCorrelation(correlationId, 10);

  expect(correlatedEvents).toHaveLength(2);
})