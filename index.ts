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

  let available = maxConcurrency;
  const errorRef = { current: null as Error | null };

  let globalResolve!: () => void;
  const receivedAll = new Promise((resolve) => {
    globalResolve = resolve;
  });

  const listeners = new Set<(err: Error | null) => void>();

  function notify() {
    for (const listener of listeners) {
      listener(errorRef.current);
    }
  }

  function ready() {
    let resolve: () => void;
    let reject: (error: Error) => void;

    const promise = new Promise((thisResolve, thisReject) => {
      resolve = thisResolve;
      reject = thisReject;
    });

    const listener = (err: Error | null) => {
      if (err) {
        reject(err);
      } else if (available > 0) {
        available -= 1;

        listeners.delete(listener);
        resolve();
      }
    };
    listeners.add(listener);

    notify();

    return promise;
  }

  const results: Array<[number, R]> = [];
  const zipped = collection.map((item, index) => ({ item, index }));

  for (const { item, index } of zipped) {
    await ready();

    task(item, index)
      .then((result) => {
        available += 1;
        results.push([index, result]);

        if (results.length === collection.length) {
          globalResolve();
          return;
        }
      })
      .catch((thisError) => {
        errorRef.current = thisError;
      })
      .finally(notify);
  }

  await ready();
  await receivedAll;

  return results.sort(([a], [b]) => a - b).map(([, result]) => result);
}

export default pool;
