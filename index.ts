interface Params<T, R> {
  /**
   * The input collection that will feed the tasks
   */
  collection: T[];
  /**
   * A function that takes an item from the collection and returns a result
   */
  task: (t: T, index: number) => Promise<R>;
  /**
   * The max number of concurrent tasks. If not provided, all tasks are ran at
   * once
   */
  maxConcurrency?: number;
}

/**
 * Runs every item in a collection through an async function and returns the
 * result with the option of limiting the number of workers at once.
 */
async function pool<T, R>({
  collection,
  task,
  maxConcurrency,
}: Params<T, R>): Promise<R[]> {
  if (!maxConcurrency) {
    return Promise.all(collection.map((item, i) => task(item, i)));
  }

  if (!collection.length) {
    return [];
  }

  const results: Array<[R, number]> = [];
  const mutableCollection = collection
    .slice()
    .map((t, i) => [t, i] as [T, number]);

  let available = maxConcurrency;
  let done = false;
  let globalResolve!: () => void;
  let globalReject!: (err: Error) => void;
  const finalPromise = new Promise((resolve, reject) => {
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
    return new Promise((resolve) => {
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
