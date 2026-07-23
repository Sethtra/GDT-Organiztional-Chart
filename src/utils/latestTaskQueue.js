export function createLatestTaskQueue(worker) {
  let latestTask;
  let runningPromise = null;

  const drain = async () => {
    while (latestTask !== undefined) {
      const task = latestTask;
      latestTask = undefined;
      await worker(task);
    }
  };

  return {
    enqueue(task) {
      latestTask = task;
      if (!runningPromise) {
        runningPromise = drain().finally(() => {
          runningPromise = null;
        });
      }
      return runningPromise;
    },
    cancelPending() {
      latestTask = undefined;
    },
    whenIdle() {
      return runningPromise || Promise.resolve();
    },
    get running() {
      return runningPromise !== null;
    },
  };
}
