import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareFixedBedrockUiReferences} from './prepare-fixed-bedrock-ui-references.mjs';

/** Offline fixed whole-source bytes. Existing mismatches are never overwritten. */
export function prepareManifestValidationReferences({root, directory} = {}) {
  return prepareFixedBedrockUiReferences({root, directory,
    ledgerFile: 'docs/manifest-validation-source.json', expectedFiles: 7,
    defaultDirectory: '.cache/manifest-validation-source-20261102-01/original'});
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node scripts/prepare-manifest-validation-references.mjs');
    console.log(JSON.stringify(await prepareManifestValidationReferences()));
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
