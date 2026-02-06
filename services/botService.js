const {
  TRANSLATE_DIRECTIONS,
  VOICE_TYPES,
  PAUSE_OPTIONS,
  USER_STATES
} = require('../utils/constants');
const PhraseType = require('../models/PhraseType');
const User = require('../models/User');

class BotService {
  constructor() {
    this.userStates = new Map();
  }

  async initializeUser(telegramId) {
    const user = await User.getBySourceId(telegramId, 'telegram');
    
    if (!user || !user.data) {
      return {
        state: USER_STATES.SELECTING_PHRASE_TYPE,
        selectedType: null,
        translateDirection: null,
        voiceType: null,
        pause: null
      };
    }

    return user.data;
  }

  async saveUserState(telegramId, stateData) {
    await User.updateUserData(telegramId, stateData);
  }

  async getPhraseTypes() {
    return await PhraseType.getAllActive();
  }

  generateMenuParams(userData) {
    const params = new URLSearchParams();
    
    if (userData.selectedType) {
      params.append('type', userData.selectedType);
    }
    
    if (userData.translateDirection) {
      params.append('translate_direct', userData.translateDirection);
    }
    
    if (userData.voiceType) {
      params.append('voice', userData.voiceType);
    }
    
    if (userData.pause) {
      params.append('pause', userData.pause);
    }

    return params.toString();
  }

  getMenuText(userData) {
    const lines = [];
    
    lines.push('🎯 *Настройки тренажера:*');
    
    if (userData.selectedType) {
      lines.push(`📚 Тип фраз: ${userData.selectedType}`);
    } else {
      lines.push('📚 Тип фраз: *Не выбран*');
    }
    
    if (userData.translateDirection) {
      lines.push(`🌍 Направление: ${userData.translateDirection}`);
    } else {
      lines.push('🌍 Направление: *Не выбрано*');
    }
    
    if (userData.voiceType) {
      lines.push(`🎤 Диктор: ${userData.voiceType}`);
    } else {
      lines.push('🎤 Диктор: *Не выбран*');
    }
    
    if (userData.pause) {
      lines.push(`⏱️ Пауза: ${userData.pause} сек`);
    } else {
      lines.push('⏱️ Пауза: *Не выбрана*');
    }

    return lines.join('\n');
  }
}

module.exports = new BotService();