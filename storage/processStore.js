// 	Хранит текущее состояние каждого процесса бронирования (processId).
const processStates = new Map();

// Получить текущее состояние процесса бронирования (processId)
function getState(processId) {
  return processStates.get(processId);
}

// Записывает новое состояние процесса. 
function setState(processId, state) {
  processStates.set(processId, state);
}

// Проверяет наличие записи о процессе в хранилище. 
function has(processId) {
  return processStates.has(processId);
}

// Очищает все состояния (используется в тестах). 
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