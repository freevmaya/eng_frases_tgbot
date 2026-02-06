class PhraseTypes {
    constructor(db) {
        this.db = db;
        this.TABLE_NAME = 'phrase_types';
    }
    
    async getActiveTypes() {
        const query = `
            SELECT * FROM ${this.TABLE_NAME} 
            WHERE is_active = 1 
            ORDER BY \`order\` ASC, type_name ASC
        `;
        
        try {
            const [rows] = await this.db.query(query);
            return rows;
        } catch (error) {
            console.error('Error getting active phrase types:', error);
            return [];
        }
    }
    
    async getTypeById(id) {
        const query = `SELECT * FROM ${this.TABLE_NAME} WHERE id = ? AND is_active = 1`;
        
        try {
            const [rows] = await this.db.query(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting phrase type by ID:', error);
            return null;
        }
    }
    
    async getTypeByName(typeName) {
        const query = `SELECT * FROM ${this.TABLE_NAME} WHERE type_name = ? AND is_active = 1`;
        
        try {
            const [rows] = await this.db.query(query, [typeName]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting phrase type by name:', error);
            return null;
        }
    }
}

module.exports = PhraseTypes;