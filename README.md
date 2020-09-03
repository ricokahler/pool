# @ricokahler/pool

Pool is like `Promise.all` but you can specific how many concurrent tasks you want at once.

```
npm i @ricokahler/pool
```

```js
import pool from '@ricokahler/pool';

async function blah() {
  const texts = await pool({
    collection: [1, 2, 3, 4, 5],
    task: async (n) => {
      const response = fetch(`/go/download/something/${n}`);
      const text = await response.text();
      return text;
    },
    maxConcurrency: 2, // only fetch two pages at a time
  });

  console.log(texts); // an array of the 5 items downloaded
}
```
