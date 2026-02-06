const EnglishTrainerBot = require('./bot');
require('dotenv').config();

const REQUIRED_ENV_VARS = [
    'BOT_TOKEN',
    'DB_HOST',
    'DB_NAME',
    'DB_USER'
    // DB_PASSWORD больше не обязательна
];

const OPTIONAL_ENV_VARS = [
    'DB_PORT',
    'DB_PASSWORD',
    'DB_PASSWORD_SET',
    'MINI_APP_URL'
];

function checkEnvVariables() {
    console.log('🔍 Проверка переменных окружения...');
    
    // Проверяем обязательные переменные
    const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ Отсутствуют необходимые переменные окружения:');
        missingVars.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\n⚠️ Пожалуйста, создайте файл .env на основе .env.example');
        process.exit(1);
    }
    
    // Выводим информацию о необязательных переменных
    const missingOptionalVars = OPTIONAL_ENV_VARS.filter(varName => !process.env[varName]);
    if (missingOptionalVars.length > 0) {
        console.warn('⚠️ Не установлены необязательные переменные:');
        missingOptionalVars.forEach(varName => {
            console.warn(`   - ${varName} (будет использовано значение по умолчанию)`);
        });
    }
    
    // Выводим текущие настройки подключения к БД
    console.log('\n📊 Настройки подключения к БД:');
    console.log(`   Хост: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Порт: ${process.env.DB_PORT || 3306}`);
    console.log(`   База данных: ${process.env.DB_NAME || 'english_trainer'}`);
    console.log(`   Пользователь: ${process.env.DB_USER || 'root'}`);
    
    if (process.env.DB_PASSWORD_SET === 'yes' && process.env.DB_PASSWORD) {
        console.log(`   Используется пароль: Да`);
    } else if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim() !== '') {
        console.log(`   Используется переданный пароль: Да`);
    } else {
        console.log(`   Используется пароль: Нет (локальная разработка)`);
    }
    
    if (process.env.MINI_APP_URL) {
        console.log('🌐 Mini App URL: Настроен');
    } else {
        console.warn('🌐 Mini App URL: Не настроен (функция Mini App будет использовать заглушку)');
    }
    
    console.log('\n✅ Проверка переменных окружения завершена\n');
}

function main() {
    try {
        console.log('🚀 Запуск Тренажера английского языка...\n');
        
        checkEnvVariables();
        
        const bot = new EnglishTrainerBot();
        
        // Обработка ошибок
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Необработанный rejection:');
            console.error('Причина:', reason);
            console.error('Промис:', promise);
        });
        
        process.on('uncaughtException', (error) => {
            console.error('❌ Необработанное исключение:');
            console.error('Ошибка:', error.message);
            console.error('Стек:', error.stack);
            
            // Не завершаем процесс при некритических ошибках
            if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                console.error('⚠️ Ошибка доступа к БД. Проверьте логин и пароль');
            }
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('\n🛑 Получен сигнал SIGTERM, завершение работы...');
            process.exit(0);
        });
        
        process.on('SIGINT', () => {
            console.log('\n🛑 Получен сигнал SIGINT, завершение работы...');
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Фатальная ошибка при запуске:');
        console.error('Сообщение:', error.message);
        console.error('Стек:', error.stack);
        process.exit(1);
    }
}

main();