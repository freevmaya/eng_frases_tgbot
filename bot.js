const { Telegraf, Markup, session } = require('telegraf');
const mysql = require('mysql2/promise');
require('dotenv').config();

const Database = require('./db/Database');
const UserSession = require('./models/UserSession');
const PhraseTypes = require('./models/PhraseTypes');

class EnglishTrainerBot {
    constructor() {
        this.bot = new Telegraf(process.env.BOT_TOKEN);
        this.db = new Database();
        this.userSession = new UserSession(this.db);
        this.phraseTypes = new PhraseTypes(this.db);
        
        this.STEPS = {
            MAIN: 'main',
            SELECT_TYPE: 'select_type',
            SELECT_DIRECTION: 'select_direction',
            SELECT_VOICE: 'select_voice',
            SELECT_PAUSE: 'select_pause',
            COMPLETE: 'complete'
        };
        
        this.init();
    }
    
    init() {
        this.setupMiddleware();
        this.setupCommands();
        this.setupActions();
        this.start();
    }
    
    setupMiddleware() {
        this.bot.use(session());
        this.bot.use(async (ctx, next) => {
            await this.saveUser(ctx);
            await this.loadSession(ctx);
            next();
        });
    }
    
    setupCommands() {
        this.bot.start(async (ctx) => {
            await this.showMainMenu(ctx);
        });
        
        this.bot.command('menu', async (ctx) => {
            await this.showMainMenu(ctx);
        });
    }
    
    setupActions() {
        this.bot.action('start_training', async (ctx) => {
            await this.showTypeSelection(ctx);
        });
        
        this.bot.action('back', async (ctx) => {
            await this.handleBack(ctx);
        });
        
        this.bot.action(/^type_(\d+)$/, async (ctx) => {
            const typeId = parseInt(ctx.match[1]);
            await this.handleTypeSelect(ctx, typeId);
        });
        
        this.bot.action(/^direction_(.+)$/, async (ctx) => {
            const direction = ctx.match[1];
            await this.handleDirectionSelect(ctx, direction);
        });
        
        this.bot.action(/^voice_(.+)$/, async (ctx) => {
            const voice = ctx.match[1];
            await this.handleVoiceSelect(ctx, voice);
        });
        
        this.bot.action(/^pause_(\d+)$/, async (ctx) => {
            const pause = parseInt(ctx.match[1]);
            await this.handlePauseSelect(ctx, pause);
        });
        
        this.bot.action('start_mini_app', async (ctx) => {
            await this.startMiniApp(ctx);
        });
    }
    
    async saveUser(ctx) {
        const from = ctx.from;
        if (!from) return;
        
        const userId = from.id;
        const userData = {
            source_id: userId,
            source: 'telegram',
            first_name: from.first_name,
            last_name: from.last_name,
            username: from.username,
            language_code: from.language_code || 'en'
        };
        
        await this.db.saveUser(userData);
    }
    
    async loadSession(ctx) {
        if (!ctx.session) {
            ctx.session = {};
        }
        
        const userId = ctx.from.id;
        const sessionData = await this.userSession.getSession(userId);
        
        if (sessionData) {
            ctx.session.currentStep = sessionData.current_step || this.STEPS.MAIN;
            ctx.session.selectedType = sessionData.selected_type;
            ctx.session.translateDirect = sessionData.translate_direct;
            ctx.session.voice = sessionData.voice;
            ctx.session.pause = sessionData.pause;
            ctx.session.sessionId = sessionData.id;
        } else {
            ctx.session.currentStep = this.STEPS.MAIN;
            await this.userSession.createSession(userId, this.STEPS.MAIN);
        }
    }
    
    async updateSession(ctx, updates) {
        const userId = ctx.from.id;
        await this.userSession.updateSession(userId, updates);
        
        if (updates.currentStep) {
            ctx.session.currentStep = updates.currentStep;
        }
        if (updates.selectedType !== undefined) {
            ctx.session.selectedType = updates.selectedType;
        }
        if (updates.translateDirect !== undefined) {
            ctx.session.translateDirect = updates.translateDirect;
        }
        if (updates.voice !== undefined) {
            ctx.session.voice = updates.voice;
        }
        if (updates.pause !== undefined) {
            ctx.session.pause = updates.pause;
        }
    }
    
    async showMainMenu(ctx) {
        const message = `🎓 *Тренажер английского языка*\n\nВыберите действие:`;
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('▶️ Начать тренировку', 'start_training')]
        ]);
        
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        }).catch(() => {
            return ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        });
        
        await this.updateSession(ctx, { currentStep: this.STEPS.MAIN });
    }
    
    async showTypeSelection(ctx) {
        const types = await this.phraseTypes.getActiveTypes();
        
        const buttons = types.map(type => 
            [Markup.button.callback(type.type_name, `type_${type.id}`)]
        );
        
        buttons.push([Markup.button.callback('« Назад', 'back')]);
        
        const keyboard = Markup.inlineKeyboard(buttons);
        
        const message = '📚 *Выберите тип фраз';
        
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        
        await this.updateSession(ctx, { currentStep: this.STEPS.SELECT_TYPE });
    }
    
    async showDirectionSelection(ctx) {
        const message = `🌐 *Выберите направление перевода:*`;
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🇬🇧 → 🇷🇺 Английский → Русский', 'direction_en-ru')],
            [Markup.button.callback('🇷🇺 → 🇬🇧 Русский → Английский', 'direction_ru-en')],
            [Markup.button.callback('« Назад', 'back')]
        ]);
        
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        
        await this.updateSession(ctx, { currentStep: this.STEPS.SELECT_DIRECTION });
    }
    
    async showVoiceSelection(ctx) {
        const message = `🎤 *Выберите голос диктора:*`;
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('👨 Мужской', 'voice_male')],
            [Markup.button.callback('👩 Женский', 'voice_female')],
            [Markup.button.callback('« Назад', 'back')]
        ]);
        
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        
        await this.updateSession(ctx, { currentStep: this.STEPS.SELECT_VOICE });
    }
    
    async showPauseSelection(ctx) {
        const message = `⏸️ *Выберите паузу между фразами:*\n\nОт 1 до 8 секунд`;
        
        const pauseButtons = [];
        for (let i = 1; i <= 8; i++) {
            pauseButtons.push(Markup.button.callback(`${i} сек`, `pause_${i}`));
        }
        
        const rows = [];
        for (let i = 0; i < pauseButtons.length; i += 4) {
            rows.push(pauseButtons.slice(i, i + 4));
        }
        rows.push([Markup.button.callback('« Назад', 'back')]);
        
        const keyboard = Markup.inlineKeyboard(rows);
        
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        
        await this.updateSession(ctx, { currentStep: this.STEPS.SELECT_PAUSE });
    }
    
    async showCompletion(ctx) {
        const session = ctx.session;
        const type = await this.phraseTypes.getTypeById(session.selectedType);
        
        const message = `✅ *Настройки завершены*\n\n` +
                       `📝 Тип фраз: ${type.type_name}\n` +
                       `🌐 Направление: ${session.translateDirect}\n` +
                       `🎤 Голос: ${session.voice === 'male' ? 'Мужской' : 'Женский'}\n` +
                       `⏸️ Пауза: ${session.pause} сек.\n\n` +
                       `Нажмите "Начать тренировку" для запуска Mini App`;

        const params = {
            type: type.type_name,
            type_id: session.selectedType,
            translate_direct: session.translateDirect,
            voice: session.voice,
            pause: session.pause,
            timestamp: Date.now(), // Добавляем timestamp для уникальности
            user_id: ctx.from.id
        };

        const paramsString = encodeURIComponent(JSON.stringify(params));
        let miniAppUrl = process.env.MINI_APP_URL || 'https://example.com/mini-app';
            
        // Создаем URL с параметрами
        const finalUrl = this.appendUrlParams(miniAppUrl, { params: paramsString });
        
        console.log('🔗 Сгенерированный Mini App URL:', finalUrl);

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Открыть тренажер', finalUrl)],
            [Markup.button.callback('« Назад', 'back')]
        ]);
        
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        
        await this.updateSession(ctx, { currentStep: this.STEPS.COMPLETE });
    }
    
    async handleTypeSelect(ctx, typeId) {
        await this.updateSession(ctx, { selectedType: typeId });
        await this.showDirectionSelection(ctx);
    }
    
    async handleDirectionSelect(ctx, direction) {
        await this.updateSession(ctx, { translateDirect: direction });
        await this.showVoiceSelection(ctx);
    }
    
    async handleVoiceSelect(ctx, voice) {
        await this.updateSession(ctx, { voice });
        await this.showPauseSelection(ctx);
    }
    
    async handlePauseSelect(ctx, pause) {
        await this.updateSession(ctx, { pause });
        await this.showCompletion(ctx);
    }
    
    async handleBack(ctx) {
        const currentStep = ctx.session.currentStep;
        
        switch (currentStep) {
            case this.STEPS.SELECT_TYPE:
                await this.showMainMenu(ctx);
                break;
            case this.STEPS.SELECT_DIRECTION:
                await this.showTypeSelection(ctx);
                break;
            case this.STEPS.SELECT_VOICE:
                await this.showDirectionSelection(ctx);
                break;
            case this.STEPS.SELECT_PAUSE:
                await this.showVoiceSelection(ctx);
                break;
            case this.STEPS.COMPLETE:
                await this.showPauseSelection(ctx);
                break;
            default:
                await this.showMainMenu(ctx);
        }
    }
    
    async startMiniApp(ctx) {
        try {
            const session = ctx.session;
            const type = await this.phraseTypes.getTypeById(session.selectedType);
            
            if (!type) {
                throw new Error('Тип фраз не найден');
            }
            
            // Проверяем, что все необходимые параметры установлены
            const requiredParams = ['selectedType', 'translateDirect', 'voice', 'pause'];
            const missingParams = requiredParams.filter(param => !session[param]);
            
            if (missingParams.length > 0) {
                console.error('❌ Отсутствуют необходимые параметры:', missingParams);
                await ctx.reply('❌ Ошибка: не все параметры настроены. Пожалуйста, начните заново.');
                await this.showMainMenu(ctx);
                return;
            }
            
            const params = {
                type: type.type_name,
                type_id: session.selectedType,
                translate_direct: session.translateDirect,
                voice: session.voice,
                pause: session.pause,
                timestamp: Date.now(), // Добавляем timestamp для уникальности
                user_id: ctx.from.id
            };
            
            // Кодируем параметры
            const paramsString = encodeURIComponent(JSON.stringify(params));
            
            let miniAppUrl = process.env.MINI_APP_URL || 'https://example.com/mini-app';
            
            // Удаляем возможные пробелы в начале/конце URL
            miniAppUrl = miniAppUrl.trim();
            
            // Проверяем валидность URL
            if (!this.isValidUrl(miniAppUrl)) {
                console.error('❌ Неверный формат MINI_APP_URL:', miniAppUrl);
                await ctx.reply('❌ Ошибка конфигурации Mini App. Обратитесь к администратору.');
                return;
            }
            
            // Создаем URL с параметрами
            const finalUrl = this.appendUrlParams(miniAppUrl, { params: paramsString });
            
            console.log('🔗 Сгенерированный Mini App URL:', finalUrl);
            
            const message = `🎮 *Запуск Mini App*\n\n` +
                           `Нажмите на кнопку ниже, чтобы открыть тренажер.\n\n` +
                           `📊 *Параметры тренировки:*\n` +
                           `• Тип: ${type.type_name}\n` +
                           `• Направление: ${session.translateDirect}\n` +
                           `• Голос: ${session.voice === 'male' ? '👨 Мужской' : '👩 Женский'}\n` +
                           `• Пауза: ${session.pause} сек.`;
            
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('🚀 Открыть тренажер', finalUrl)],
                [Markup.button.callback('« Назад к настройкам', 'back')],
                [Markup.button.callback('🏠 В главное меню', 'menu')]
            ]);
            
            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            
        } catch (error) {
            console.error('❌ Ошибка при запуске Mini App:', error);
            await ctx.reply('❌ Произошла ошибка при запуске тренажера. Попробуйте еще раз.');
            await this.showMainMenu(ctx);
        }
    }

    // Вспомогательные методы для работы с URL
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    appendUrlParams(baseUrl, params) {
        const url = new URL(baseUrl);
        
        // Добавляем или обновляем параметры
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        
        return url.toString();
    }
    
    start() {
        this.bot.launch()
            .then(() => {
                console.log('🤖 Бот запущен');
            })
            .catch((err) => {
                console.error('Ошибка запуска бота:', err);
            });
        
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

module.exports = EnglishTrainerBot;