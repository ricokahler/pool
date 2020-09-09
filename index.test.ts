import pool from './';

function createDeferredPromise<T>() {
  let _resolve!: (t?: T) => void;
  let _reject!: (error: Error) => void;
  const resolvedRef = { current: false };
  const touchedRef = { current: false };

  const promise = new Promise<T>((thisResolve, thisReject) => {
    _resolve = thisResolve;
    _reject = thisReject;
  });

  return Object.assign(promise, {
    touch: () => {
      touchedRef.current = true;
    },
    resolve: () => {
      resolvedRef.current = true;
      _resolve();
    },
    reject: (error: Error) => {
      _reject(error);
    },
    isResolved: () => {
      return resolvedRef.current;
    },
    isTouched: () => {
      return touchedRef.current;
    },
  });
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

it('runs every item in a collection through an async function limiting the number of concurrent workers', async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();
  const three = createDeferredPromise();

  const promise = pool({
    collection: [one, two, three],
    task: async (obj, index) => {
      obj.touch();
      await obj;
      return index;
    },
    maxConcurrency: 1,
  });

  setTimeout(async () => {
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(false);
    expect(two.isTouched()).toBe(false);
    expect(two.isResolved()).toBe(false);
    expect(three.isTouched()).toBe(false);
    expect(three.isResolved()).toBe(false);

    one.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(false);
    expect(three.isTouched()).toBe(false);
    expect(three.isResolved()).toBe(false);

    two.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(true);
    expect(three.isTouched()).toBe(true);
    expect(three.isResolved()).toBe(false);

    three.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(true);
    expect(three.isTouched()).toBe(true);
    expect(three.isResolved()).toBe(true);
  }, 0);

  const result = await promise;
  expect(result).toEqual([0, 1, 2]);
});

it('works with max concurrency greater than one', async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();
  const three = createDeferredPromise();

  const promise = pool({
    collection: [one, two, three],
    task: async (obj) => {
      obj.touch();
      await obj;
    },
    maxConcurrency: 2,
  });

  setTimeout(async () => {
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(false);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(false);
    expect(three.isTouched()).toBe(false);
    expect(three.isResolved()).toBe(false);

    one.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(false);
    expect(three.isTouched()).toBe(true);
    expect(three.isResolved()).toBe(false);

    two.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(true);
    expect(three.isTouched()).toBe(true);
    expect(three.isResolved()).toBe(false);

    three.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(true);
    expect(three.isTouched()).toBe(true);
    expect(three.isResolved()).toBe(true);
  }, 0);

  await promise;
});

it('works with an empty collection', async () => {
  await pool({
    collection: [],
    task: async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    maxConcurrency: 10,
  });
});

it('returns the collection in input order', async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();
  const three = createDeferredPromise();
  const four = createDeferredPromise();
  const five = createDeferredPromise();
  const six = createDeferredPromise();

  const promise = pool({
    collection: [one, two, three, four, five, six],
    task: async (obj, i) => {
      obj.touch();
      await obj;
      return i;
    },
    maxConcurrency: 3,
  });

  setTimeout(async () => {
    six.resolve();
    five.resolve();
    four.resolve();
    await flush(); // ¯\_(ツ)_/¯
    three.resolve();
    two.resolve();
    one.resolve();
  }, 0);

  const result = await promise;

  expect(result).toEqual([0, 1, 2, 3, 4, 5]);
});

it('defaults to a Promise.all implements if no max concurrency is given', async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();

  const promise = pool({
    collection: [one, two],
    task: async (obj) => {
      obj.touch();
      await obj;
    },
  });

  setTimeout(() => {
    expect(one.isTouched()).toBe(true);
    expect(two.isTouched()).toBe(true);

    one.resolve();
    two.resolve();
  }, 0);

  await promise;
});

it('throws at the first error', async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();
  const three = createDeferredPromise();

  const promise = pool({
    collection: [one, two, three],
    task: async (obj, i) => {
      obj.touch();
      await obj;
    },
    maxConcurrency: 1,
  });

  setTimeout(async () => {
    one.resolve();
    await flush();

    two.reject(new Error('test error'));
  }, 0);

  let rejected = false;
  try {
    await promise;
  } catch (e) {
    rejected = true;
    expect(e.message).toBe('test error');
  }
  expect(rejected).toBe(true);
});

it('throws if the last item throws', async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();
  const three = createDeferredPromise();

  const promise = pool({
    collection: [one, two, three],
    task: async (obj, i) => {
      obj.touch();
      await obj;
    },
    maxConcurrency: 1,
  });

  setTimeout(async () => {
    one.resolve();
    await flush();

    two.resolve();
    await flush();

    three.reject(new Error('test error'));
  }, 0);

  let rejected = false;
  try {
    await promise;
  } catch (e) {
    rejected = true;
    expect(e.message).toBe('test error');
  }
  expect(rejected).toBe(true);
});
