/**
 * @file Ambient declaration for Vite `?worker` modules required by transitive dependencies.
 */

declare module "*?worker" {
  const WorkerConstructor: {
    new (): Worker;
  };
  export default WorkerConstructor;
}
