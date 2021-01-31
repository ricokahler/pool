# @ricokahler/pool · [![codecov](https://codecov.io/gh/ricokahler/pool/branch/master/graph/badge.svg)](https://codecov.io/gh/ricokahler/pool) [![github status checks](https://badgen.net/github/checks/ricokahler/pool)](https://github.com/ricokahler/pool/actions) [![bundlephobia](https://badgen.net/bundlephobia/minzip/@ricokahler/pool)](https://bundlephobia.com/result?p=@ricokahler/pool) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

Pool is like `Promise.all` but you can specify how many concurrent tasks you want at once.

[Well tested.](https://codecov.io/gh/ricokahler/pool) | [Zero dependencies and small size.](https://bundlephobia.com/result?p=@ricokahler/pool)

```
npm i @ricokahler/pool
```

```js
import pool from '@ricokahler/pool';

async function blah() {
  const texts = await pool({
    collection: [1, 2, 3, 4, 5],
    maxConcurrency: 2, // only fetch two pages at a time
    task: async (n) => {
      const response = await fetch(`/go/download/something/${n}`);
      const text = await response.text();
      return text;
    },
  });

  console.log(texts); // an array of the 5 items downloaded
}
```

`maxConcurrency` is optional. If omitted it will default to just using `Promise.all` with no max concurrency.
