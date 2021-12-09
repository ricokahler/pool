interface PoolOptions<T, R> {
  /**
   * The input collection that will feed the tasks
   */
  readonly collection: readonly T[];
  /**
   * A function that takes an item from the collection and returns a result
   */
  readonly task: (t: T, index: number) => Promise<R>;
  /**
   * The max number of concurrent tasks. If not provided, all tasks are ran at
   * once
   */
  readonly maxConcurrency?: number;
}

/**
 * Like `Promise.all` but you can specify how many concurrent tasks you want at once.
 */
async function pool<T, R>({
  collection,
  task,
  maxConcurrency,
}: PoolOptions<T, R>): Promise<R[]> {
  if (!maxConcurrency) {
    return Promise.all(collection.map((item, i) => task(item, i)));
  }

  if (!collection.length) {
    return [];
  }

  const results: Array<[R, number]> = [];
  const mutableCollection = collection.map((t, i) => [t, i] as [T, number]);

  let available = maxConcurrency;
  let done = false;
  let globalResolve!: () => void;
  let globalReject!: (err: Error) => void;
  const finalPromise = new Promise<void>((resolve, reject) => {
    globalResolve = resolve;
    globalReject = reject;
  });

  const listeners = new Set<() => void>();
  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }
  function ready() {
    return new Promise<void>((resolve) => {
      const listener = () => {
        if (done) {
          listeners.delete(listener);
          resolve();
        } else if (available > 0) {
          listeners.delete(listener);
          available -= 1;
          resolve();
        }
      };

      listeners.add(listener);
      notify();
    });
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const value = mutableCollection.shift();
    if (!value) break;
    if (done) break;

    const [t, i] = value;

    await ready();

    task(t, i)
      .then((r) => {
        results.push([r, i]);
        available += 1;

        if (results.length === collection.length) {
          done = true;
          globalResolve();
        }
      })
      .catch((e) => {
        done = true;
        globalReject(e);
      })
      .finally(notify);
  }

  await finalPromise;

  return results
    .slice()
    .sort(([, a], [, b]) => a - b)
    .map(([r]) => r);
}

export default pool;
