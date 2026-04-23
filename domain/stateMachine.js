const STATES = {
  NEW: 'Новый',
  REQUEST_ACCEPTED: 'ЗаявкаПринята',
  RESOURCE_BOOKED: 'РесурсЗабронирован',
  ACCESS_GRANTED: 'ДоступВыдан',
  COMPLETED: 'Завершён',
  COMPENSATED: 'КомпенсацияВыполнена'
};

// Допустимые переходы (без компенсации – компенсация обрабатывается отдельно)
const transitions = {
  [STATES.NEW]: { 'ПринятьЗаявку': STATES.REQUEST_ACCEPTED },
  [STATES.REQUEST_ACCEPTED]: { 'Забронировать': STATES.RESOURCE_BOOKED },
  [STATES.RESOURCE_BOOKED]: { 'ВыдатьДоступ': STATES.ACCESS_GRANTED },
  [STATES.ACCESS_GRANTED]: { 'Завершить': STATES.COMPLETED }
};

module.exports = { STATES, transitions };