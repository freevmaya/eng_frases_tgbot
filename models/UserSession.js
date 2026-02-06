class UserSession {
    constructor(db) {
        this.db = db;
        this.TABLE_NAME = 'user_sessions';
    }
    
    async createSession(userId, currentStep) {
        const query = `
            INSERT INTO ${this.TABLE_NAME} 
            (user_id, current_step) 
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE 
            current_step = VALUES(current_step),
            updated_at = CURRENT_TIMESTAMP
        `;
        
        try {
            await this.db.query(query, [userId, currentStep]);
            return true;
        } catch (error) {
            console.error('Error creating session:', error);
            return false;
        }
    }
    
    async getSession(userId) {
        const query = `SELECT * FROM ${this.TABLE_NAME} WHERE user_id = ?`;
        
        try {
            const [rows] = await this.db.query(query, [userId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }
    
    async updateSession(userId, updates) {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                const dbKey = this.camelToSnake(key);
                fields.push(`${dbKey} = ?`);
                values.push(value);
            }
        }
        
        if (fields.length === 0) return false;
        
        values.push(userId);
        
        const query = `
            UPDATE ${this.TABLE_NAME} 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = ?
        `;
        
        try {
            await this.db.query(query, values);
            return true;
        } catch (error) {
            console.error('Error updating session:', error);
            return false;
        }
    }
    
    async clearSession(userId) {
        const query = `
            UPDATE ${this.TABLE_NAME} 
            SET 
                current_step = NULL,
                selected_type = NULL,
                translate_direct = NULL,
                voice = NULL,
                pause = NULL,
                session_data = NULL,
                updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = ?
        `;
        
        try {
            await this.db.query(query, [userId]);
            return true;
        } catch (error) {
            console.error('Error clearing session:', error);
            return false;
        }
    }
    
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}

module.exports = UserSession;