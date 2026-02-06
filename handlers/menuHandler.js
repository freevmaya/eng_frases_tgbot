const {
  TRANSLATE_DIRECTIONS,
  VOICE_TYPES,
  PAUSE_OPTIONS,
  USER_STATES
} = require('../utils/constants');
const botService = require('../services/botService');
const User = require('../models/User');
const PhraseType = require('../models/PhraseType');

class MenuHandler {
  constructor(bot) {
    this.bot = bot;
    this.setupHandlers();
  }

  setupHandlers() {
    // Главное меню
    this.bot.command('start', this.handleStart.bind(this));
    this.bot.command('menu', this.handleMenu.bind(this));

    // Обработчики для выбора типа фраз
    this.bot.action(/select_type_(\d+)/, this.handleSelectType.bind(this));

    // Обработчики для выбора направления перевода
    this.bot.action(/select_direction_(.+)/, this.handleSelectDirection.bind(this));

    // Обработчики для выбора диктора
    this.bot.action(/select_voice_(.+)/, this.handleSelectVoice.bind(this));

    // Обработчики для выбора паузы
    this.bot.action(/select_pause_(\d+)/, this.handleSelectPause.bind(this));

    // Запуск тренажера
    this.bot.action('start_training', this.handleStartTraining.bind(this));
  }

  async handleStart(ctx) {
    const telegramId = ctx.from.id;
    
    // Сохраняем/обновляем пользователя
    await this.saveUser(ctx);
    
    // Инициализируем состояние
    const userData = await botService.initializeUser(telegramId);
    await botService.saveUserState(telegramId, userData);
    
    // Показываем меню выбора типа фраз
    await this.showPhraseTypeSelection(ctx);
  }

  async handleMenu(ctx) {
    const telegramId = ctx.from.id;
    const userData = await botService.initializeUser(telegramId);
    
    await ctx.reply(botService.getMenuText(userData), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📚 Выбрать тип фраз', callback_data: 'select_type_menu' }],
          [{ text: '🌍 Выбрать направление', callback_data: 'select_direction_menu' }],
          [{ text: '🎤 Выбрать диктора', callback_data: 'select_voice_menu' }],
          [{ text: '⏱️ Выбрать паузу', callback_data: 'select_pause_menu' }],
          [{ text: '🚀 Начать тренировку', callback_data: 'start_training' }]
        ]
      }
    });
  }

  async showPhraseTypeSelection(ctx) {
    const phraseTypes = await botService.getPhraseTypes();
    
    const buttons = phraseTypes.map(type => [
      { 
        text: type.type_name, 
        callback_data: `select_type_${type.id}` 
      }
    ]);

    await ctx.reply('📚 Выберите тип фраз для изучения:', {
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  }

  async handleSelectType(ctx) {
    const typeId = ctx.match[1];
    const telegramId = ctx.from.id;
    
    // Получаем информацию о типе фраз
    const phraseType = await PhraseType.getById(typeId);
    if (!phraseType) {
      await ctx.answerCbQuery('Тип фраз не найден!');
      return;
    }

    // Обновляем состояние пользователя
    const userData = await botService.initializeUser(telegramId);
    userData.selectedType = phraseType.type_name;
    userData.state = USER_STATES.SELECTING_TRANSLATE_DIRECTION;
    
    await botService.saveUserState(telegramId, userData);
    
    await ctx.answerCbQuery(`Выбран тип: ${phraseType.type_name}`);
    
    // Показываем выбор направления перевода
    await this.showTranslateDirectionSelection(ctx);
  }

  async showTranslateDirectionSelection(ctx) {
    await ctx.reply('🌍 Выберите направление перевода:', {
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: 'Английский → Русский', 
              callback_data: 'select_direction_Eng-Rus' 
            }
          ],
          [
            { 
              text: 'Русский → Английский', 
              callback_data: 'select_direction_Rus-Eng' 
            }
          ]
        ]
      }
    });
  }

  async handleSelectDirection(ctx) {
    const direction = ctx.match[1];
    const telegramId = ctx.from.id;
    
    // Обновляем состояние пользователя
    const userData = await botService.initializeUser(telegramId);
    userData.translateDirection = direction;
    userData.state = USER_STATES.SELECTING_VOICE;
    
    await botService.saveUserState(telegramId, userData);
    
    await ctx.answerCbQuery(`Выбрано направление: ${direction}`);
    
    // Показываем выбор диктора
    await this.showVoiceSelection(ctx);
  }

  async showVoiceSelection(ctx) {
    await ctx.reply('🎤 Выберите голос диктора:', {
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: 'Мужской голос', 
              callback_data: 'select_voice_Male' 
            }
          ],
          [
            { 
              text: 'Женский голос', 
              callback_data: 'select_voice_Female' 
            }
          ]
        ]
      }
    });
  }

  async handleSelectVoice(ctx) {
    const voice = ctx.match[1];
    const telegramId = ctx.from.id;
    
    // Обновляем состояние пользователя
    const userData = await botService.initializeUser(telegramId);
    userData.voiceType = voice;
    userData.state = USER_STATES.SELECTING_PAUSE;
    
    await botService.saveUserState(telegramId, userData);
    
    await ctx.answerCbQuery(`Выбран голос: ${voice}`);
    
    // Показываем выбор паузы
    await this.showPauseSelection(ctx);
  }

  async showPauseSelection(ctx) {
    const pauseButtons = PAUSE_OPTIONS.map(pause => 
      [{ 
        text: `${pause} сек`, 
        callback_data: `select_pause_${pause}` 
      }]
    );

    await ctx.reply('⏱️ Выберите паузу между фразами:', {
      reply_markup: {
        inline_keyboard: pauseButtons
      }
    });
  }

  async handleSelectPause(ctx) {
    const pause = parseInt(ctx.match[1]);
    const telegramId = ctx.from.id;
    
    // Обновляем состояние пользователя
    const userData = await botService.initializeUser(telegramId);
    userData.pause = pause;
    userData.state = USER_STATES.READY_TO_START;
    
    await botService.saveUserState(telegramId, userData);
    
    await ctx.answerCbQuery(`Выбрана пауза: ${pause} сек`);
    
    // Показываем итоговое меню
    await this.showFinalMenu(ctx, userData);
  }

  async showFinalMenu(ctx, userData) {
    const menuText = botService.getMenuText(userData);
    
    await ctx.reply(menuText + '\n\n✅ Все настройки сохранены!', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Начать тренировку', callback_data: 'start_training' }],
          [{ text: '⚙️ Изменить настройки', callback_data: 'select_type_menu' }]
        ]
      }
    });
  }

  async handleStartTraining(ctx) {
    const telegramId = ctx.from.id;
    const userData = await botService.initializeUser(telegramId);
    
    // Проверяем, что все настройки выбраны
    if (!userData.selectedType || !userData.translateDirection || 
        !userData.voiceType || !userData.pause) {
      await ctx.answerCbQuery('Пожалуйста, завершите настройки перед началом!');
      await this.handleMenu(ctx);
      return;
    }
    
    // Генерируем параметры для Mini App
    const params = botService.generateMenuParams(userData);
    
    // Открываем Mini App
    await ctx.reply('Запуск тренажера...', {
      reply_markup: {
        inline_keyboard: [
          [{
            text: 'Открыть тренажер',
            web_app: { 
              url: `https://your-mini-app-url.com?${params}` 
            }
          }]
        ]
      }
    });
    
    await ctx.answerCbQuery();
  }

  async saveUser(ctx) {
    const userData = {
      source_id: ctx.from.id,
      source: 'telegram',
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
      username: ctx.from.username,
      language_code: ctx.from.language_code || 'ru'
    };

    await User.createOrUpdate(userData);
  }
}

module.exports = MenuHandler;