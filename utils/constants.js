const TRANSLATE_DIRECTIONS = {
  ENG_RUS: 'Eng-Rus',
  RUS_ENG: 'Rus-Eng'
};

const VOICE_TYPES = {
  MALE: 'Male',
  FEMALE: 'Female'
};

const PAUSE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const USER_STATES = {
  SELECTING_PHRASE_TYPE: 'selecting_phrase_type',
  SELECTING_TRANSLATE_DIRECTION: 'selecting_translate_direction',
  SELECTING_VOICE: 'selecting_voice',
  SELECTING_PAUSE: 'selecting_pause',
  READY_TO_START: 'ready_to_start'
};

const SOURCE_TYPES = {
  TELEGRAM: 'telegram',
  WEB: 'web'
};

module.exports = {
  TRANSLATE_DIRECTIONS,
  VOICE_TYPES,
  PAUSE_OPTIONS,
  USER_STATES,
  SOURCE_TYPES
};