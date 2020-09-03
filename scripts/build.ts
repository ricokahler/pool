import fs from 'fs';
import path from 'path';
import exec from '@ricokahler/exec';
import { hashElement } from 'folder-hash';
import packageJson from '../package.json';

const args = process.argv.slice(2);

async function main() {
  console.log('cleaning…');
  await exec('rm -rf dist');

  console.log('generating types…');
  await exec('npx tsc');

  console.log('rolling…');
  await exec('npx rollup -c');

  const {
    name,
    description,
    repository,
    license,
    version: packageVersion,
    author,
    sideEffects,
  } = packageJson;

  const hash = await hashElement(path.resolve(__dirname, '../dist'), {
    encoding: 'hex',
  });
  const buildHash = hash.hash.substring(0, 9);

  const publishPackageJson = {
    name,
    description,
    version: args.includes('--use-package-version')
      ? packageVersion
      : `0.0.0-${buildHash}`,
    author,
    repository,
    license,
    main: 'index.js',
    module: 'index.esm.js',
    sideEffects,
  };

  await fs.promises.writeFile(
    path.resolve(__dirname, '../dist/package.json'),
    JSON.stringify(publishPackageJson, null, 2),
  );

  console.log('DONE!');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
