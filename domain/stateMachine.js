// Доменная модель: состояния процесса и переходы по событиям.

const STATES = {
  NEW: 'Новый',
  REQUEST_ACCEPTED: 'ЗаявкаПринята',
  RESOURCE_BOOKED: 'РесурсЗабронирован',
  ACCESS_GRANTED: 'ДоступВыдан',
  COMPLETED: 'Завершён',
  COMPENSATED: 'КомпенсацияВыполнена'
};

// Имена событий в POST /api/event. 
const EVENTS = {
  ACCEPT_REQUEST: 'accept_request',
  BOOK: 'book',
  GRANT_ACCESS: 'grant_access',
  COMPLETE: 'complete'
};

const transitions = {
  [STATES.NEW]: { [EVENTS.ACCEPT_REQUEST]: STATES.REQUEST_ACCEPTED },
  [STATES.REQUEST_ACCEPTED]: { [EVENTS.BOOK]: STATES.RESOURCE_BOOKED },
  [STATES.RESOURCE_BOOKED]: { [EVENTS.GRANT_ACCESS]: STATES.ACCESS_GRANTED },
  [STATES.ACCESS_GRANTED]: { [EVENTS.COMPLETE]: STATES.COMPLETED }
};

module.exports = { STATES, transitions, EVENTS };
