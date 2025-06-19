import { executeQuery } from '../database';

export interface ImageGeneration {
  id?: number;
  user_id: number;
  project_id?: number;
  prompt: string;
  refined_prompt?: string;
  artistic_style?: string;
  image_url?: string;
  thumbnail_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generation_params?: any;
  error_message?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class ImageGenerationModel {
  static async create(data: Omit<ImageGeneration, 'id' | 'created_at' | 'updated_at'>): Promise<ImageGeneration> {
    const query = `
      INSERT INTO image_generations (
        user_id, project_id, prompt, refined_prompt, artistic_style,
        image_url, thumbnail_url, status, generation_params, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result: any = await executeQuery(query, [
      data.user_id,
      data.project_id || null,
      data.prompt,
      data.refined_prompt || null,
      data.artistic_style || null,
      data.image_url || null,
      data.thumbnail_url || null,
      data.status,
      data.generation_params ? JSON.stringify(data.generation_params) : null,
      data.error_message || null
    ]);
    
    return this.findById(result.insertId);
  }

  static async findById(id: number): Promise<ImageGeneration | null> {
    const query = 'SELECT * FROM image_generations WHERE id = ?';
    const results: any = await executeQuery(query, [id]);
    if (results.length === 0) return null;
    
    const result = results[0];
    if (result.generation_params) {
      result.generation_params = JSON.parse(result.generation_params);
    }
    return result;
  }

  static async findByUserId(userId: number, limit: number = 50, offset: number = 0): Promise<ImageGeneration[]> {
    const query = `
      SELECT * FROM image_generations 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const results: any = await executeQuery(query, [userId, limit, offset]);
    
    return results.map((result: any) => {
      if (result.generation_params) {
        result.generation_params = JSON.parse(result.generation_params);
      }
      return result;
    });
  }

  static async findByProjectId(projectId: number, limit: number = 50, offset: number = 0): Promise<ImageGeneration[]> {
    const query = `
      SELECT * FROM image_generations 
      WHERE project_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const results: any = await executeQuery(query, [projectId, limit, offset]);
    
    return results.map((result: any) => {
      if (result.generation_params) {
        result.generation_params = JSON.parse(result.generation_params);
      }
      return result;
    });
  }

  static async updateStatus(id: number, status: ImageGeneration['status'], errorMessage?: string): Promise<ImageGeneration | null> {
    const query = `
      UPDATE image_generations 
      SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await executeQuery(query, [status, errorMessage || null, id]);
    return this.findById(id);
  }

  static async updateImageUrls(id: number, imageUrl: string, thumbnailUrl?: string): Promise<ImageGeneration | null> {
    const query = `
      UPDATE image_generations 
      SET image_url = ?, thumbnail_url = ?, status = 'completed', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await executeQuery(query, [imageUrl, thumbnailUrl || null, id]);
    return this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM image_generations WHERE id = ?';
    const result: any = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  }

  static async getByStatus(status: ImageGeneration['status'], limit: number = 50): Promise<ImageGeneration[]> {
    const query = `
      SELECT * FROM image_generations 
      WHERE status = ? 
      ORDER BY created_at ASC 
      LIMIT ?
    `;
    const results: any = await executeQuery(query, [status, limit]);
    
    return results.map((result: any) => {
      if (result.generation_params) {
        result.generation_params = JSON.parse(result.generation_params);
      }
      return result;
    });
  }
}
