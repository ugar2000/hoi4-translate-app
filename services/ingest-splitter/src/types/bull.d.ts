import 'bull';

declare module 'bull' {
  interface Job<T = any> {
    updateProgress(progress: number | object): Promise<void>;
  }
}
