const MenuHandler = require('./menuHandler');

class MainHandler {
  constructor(bot) {
    this.bot = bot;
    this.menuHandler = new MenuHandler(bot);
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      
      try {
        ctx.reply('Произошла ошибка. Пожалуйста, попробуйте еще раз или используйте команду /start');
      } catch (e) {
        console.error('Error while sending error message:', e);
      }
    });
  }

  setupBasicCommands() {
    this.bot.command('help', (ctx) => {
      ctx.reply(
        'Помощь по использованию бота:\n\n' +
        '/start - Начать работу с ботом\n' +
        '/menu - Открыть меню настроек\n' +
        '/help - Показать это сообщение\n\n' +
        'Бот поможет вам изучать английские фразы через интерактивный тренажер.'
      );
    });
  }
}

module.exports = MainHandler;