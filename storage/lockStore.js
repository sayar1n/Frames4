const processLocks = new Map();

async function runWithLock(processId, fn) {
  let resolveLock;
  const lockPromise = new Promise((resolve) => { resolveLock = resolve; });
  
  const previousLock = processLocks.get(processId) || Promise.resolve();
  const newLock = previousLock.then(async () => {
    try {
      return await fn();
    } finally {
      resolveLock();
    }
  });
  processLocks.set(processId, newLock);
  newLock.finally(() => {
    if (processLocks.get(processId) === newLock) {
      processLocks.delete(processId);
    }
  });
  return newLock;
}

module.exports = { runWithLock };