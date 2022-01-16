type PageUid = string;
type CommittedEvent = Event & {uid: PageUid};
type Event = {
  type: string,
  correlationUid: string
}

type Callable = {
  type: string,
  fn: Function,
  uid?: PageUid
}

export {
  PageUid,
  CommittedEvent,
  Event,
  Callable
}