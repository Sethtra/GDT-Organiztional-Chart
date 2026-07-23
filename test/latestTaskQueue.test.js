import test from 'node:test';
import assert from 'node:assert/strict';
import { createLatestTaskQueue } from '../src/utils/latestTaskQueue.js';

test('runs one task at a time and coalesces pending work to the latest value', async () => {
  const processed = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const queue = createLatestTaskQueue(async (value) => {
    processed.push(value);
    if (value === 'first') await firstGate;
  });

  const completion = queue.enqueue('first');
  queue.enqueue('second');
  queue.enqueue('latest');
  releaseFirst();
  await completion;

  assert.deepEqual(processed, ['first', 'latest']);
  assert.equal(queue.running, false);
});

test('can cancel pending work without interrupting the running task', async () => {
  const processed = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const queue = createLatestTaskQueue(async (value) => {
    processed.push(value);
    if (value === 1) await gate;
  });

  const completion = queue.enqueue(1);
  queue.enqueue(2);
  queue.cancelPending();
  release();
  await completion;

  assert.deepEqual(processed, [1]);
});
