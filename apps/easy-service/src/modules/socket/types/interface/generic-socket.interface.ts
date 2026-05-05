export type SocketTopicListener = (payload: unknown) => void;

export interface GenericSocket {
  emit(room: string, topic: string, payload: unknown): void;
  listen(topic: string, listener: SocketTopicListener): () => void;
}
