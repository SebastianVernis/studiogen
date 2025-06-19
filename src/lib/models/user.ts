import { executeQuery } from '../database';

export interface User {
  id?: number;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class UserModel {
  static async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const query = `
      INSERT INTO users (email, name, avatar_url)
      VALUES (?, ?, ?)
    `;
    const result: any = await executeQuery(query, [
      userData.email,
      userData.name || null,
      userData.avatar_url || null
    ]);
    
    return this.findById(result.insertId);
  }

  static async findById(id: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = ?';
    const results: any = await executeQuery(query, [id]);
    return results.length > 0 ? results[0] : null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = ?';
    const results: any = await executeQuery(query, [email]);
    return results.length > 0 ? results[0] : null;
  }

  static async update(id: number, userData: Partial<User>): Promise<User | null> {
    const fields = [];
    const values = [];
    
    if (userData.name !== undefined) {
      fields.push('name = ?');
      values.push(userData.name);
    }
    if (userData.avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      values.push(userData.avatar_url);
    }
    
    if (fields.length === 0) return this.findById(id);
    
    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await executeQuery(query, values);
    
    return this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = ?';
    const result: any = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  }

  static async list(limit: number = 50, offset: number = 0): Promise<User[]> {
    const query = 'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const results: any = await executeQuery(query, [limit, offset]);
    return results;
  }
}
