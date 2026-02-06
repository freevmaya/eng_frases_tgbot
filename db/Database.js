const mysql = require('mysql2/promise');

class Database {
    constructor() {
        this.pool = null;
        this.connect();
    }
    
    connect() {
        try {
            const dbConfig = {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT) || 3306,
                user: process.env.DB_USER || 'root',
                database: process.env.DB_NAME || 'english_trainer',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            };
            
            // Добавляем пароль только если он установлен
            if (process.env.DB_PASSWORD_SET === 'yes' && process.env.DB_PASSWORD) {
                dbConfig.password = process.env.DB_PASSWORD;
                console.log('🔑 Используется пароль для подключения к БД');
            } else if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim() !== '') {
                dbConfig.password = process.env.DB_PASSWORD;
                console.log('🔑 Используется переданный пароль для подключения к БД');
            } else {
                console.log('🔓 Подключение к БД без пароля (локальная разработка)');
            }
            
            this.pool = mysql.createPool(dbConfig);
            
            console.log('✅ Подключение к базе данных установлено');
            
            // Тестируем подключение
            this.testConnection();
            
        } catch (error) {
            console.error('❌ Ошибка подключения к базе данных:', error);
            process.exit(1);
        }
    }
    
    async testConnection() {
        try {
            const [rows] = await this.pool.execute('SELECT 1 as test');
            console.log('✅ Тест подключения к БД выполнен успешно');
        } catch (error) {
            console.error('❌ Ошибка тестирования подключения к БД:', error.message);
            console.error('Проверьте настройки подключения к MySQL');
            process.exit(1);
        }
    }
    
    async query(sql, params = []) {
        try {
            const [results] = await this.pool.execute(sql, params);
            return [results];
        } catch (error) {
            console.error('❌ Ошибка выполнения запроса:', error.message);
            console.error('SQL:', sql);
            console.error('Параметры:', params);
            throw error;
        }
    }
    
    async saveUser(userData) {
        const query = `
            INSERT INTO users 
            (source_id, source, first_name, last_name, username, language_code, last_time) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            username = VALUES(username),
            language_code = VALUES(language_code),
            last_time = NOW()
        `;
        
        const params = [
            userData.source_id,
            userData.source,
            userData.first_name,
            userData.last_name,
            userData.username,
            userData.language_code
        ];
        
        try {
            await this.query(query, params);
            return true;
        } catch (error) {
            console.error('Error saving user:', error);
            return false;
        }
    }
    
    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Подключение к базе данных закрыто');
        }
    }
}

module.exports = Database;