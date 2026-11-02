import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareFixedBedrockUiReferences} from './prepare-fixed-bedrock-ui-references.mjs';

/** Offline fixed whole-source bytes. Existing mismatches are never overwritten. */
export function prepareResourcePackReferences({root, directory} = {}) {
  return prepareFixedBedrockUiReferences({root, directory,
    ledgerFile: 'docs/resource-packs-source.json', expectedFiles: 14,
    defaultDirectory: '.cache/resource-packs-source-20261102-01/original'});
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node scripts/prepare-resource-pack-references.mjs');
    console.log(JSON.stringify(await prepareResourcePackReferences()));
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
