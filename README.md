# @ricokahler/pool · [![codecov](https://codecov.io/gh/ricokahler/pool/branch/master/graph/badge.svg)](https://codecov.io/gh/ricokahler/pool) [![github status checks](https://badgen.net/github/checks/ricokahler/pool)](https://github.com/ricokahler/pool/actions) [![bundlephobia](https://badgen.net/bundlephobia/minzip/@ricokahler/pool)](https://bundlephobia.com/result?p=@ricokahler/pool)

Pool is like `Promise.all` but you can specify how many concurrent tasks you want at once.

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
