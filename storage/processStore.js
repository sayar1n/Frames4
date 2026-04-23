const processStates = new Map();

function getState(processId) {
  return processStates.get(processId);
}

function setState(processId, state) {
  processStates.set(processId, state);
}

function has(processId) {
  return processStates.has(processId);
}

// Добавьте функцию очистки
function clearProcessStore() {
  processStates.clear();
}

module.exports = { 
  getState, 
  setState, 
  has, 
  clearProcessStore,
  processStates
};