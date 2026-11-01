import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import { build } from 'esbuild';

const built = await build({ entryPoints:[fileURLToPath(new URL('../src/chat-revision.ts', import.meta.url))], bundle:true, platform:'node', format:'cjs', write:false });
function allocator(crypto) {
  const context = { module:{ exports:{} }, crypto };
  vm.runInNewContext(built.outputFiles[0].text, context);
  return context.module.exports.createChatRevision;
}

test('opaque extreme host revisions cannot poison this or another allocation', () => {
  const create = allocator(webcrypto), tokens = new Set();
  for (const host of ['mcchat:web:'+'f'.repeat(32), 'x'.repeat(256), 'mcchat:web:'+'0'.repeat(32)]) {
    for (let i=0;i<100;i++) {
      const token = create([host]);
      assert.match(token, /^mcchat:web:[0-9a-f]{32}$/);
      assert.notEqual(token, host);
      assert.ok(!tokens.has(token));
      tokens.add(token);
    }
  }
});

test('rejects a provider collision with any active accepted, live or history revision', () => {
  let calls=0;
  const create=allocator({getRandomValues(bytes){bytes.fill(++calls);return bytes;}});
  const token = value => 'mcchat:web:'+value.toString(16).padStart(2,'0').repeat(16);
  assert.equal(create([token(1),token(2),token(3)]),token(4));
  assert.equal(calls,4);
});

test('missing or repeating entropy fails explicitly without a shared exhausted counter', () => {
  assert.throws(()=>allocator(undefined)(),/require crypto.getRandomValues/);
  let calls=0;
  const create=allocator({getRandomValues(bytes){calls++;bytes.fill(0);return bytes;}});
  assert.throws(()=>create(['mcchat:web:'+'0'.repeat(32)]),/entropy provider/);
  assert.equal(calls,8);
  assert.equal(create(), 'mcchat:web:'+'0'.repeat(32));
});
