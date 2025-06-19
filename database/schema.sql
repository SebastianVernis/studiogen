-- ArtBot Database Schema for MariaDB
-- This schema supports the AI image generation application

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Image generations table
CREATE TABLE IF NOT EXISTS image_generations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  project_id INT,
  prompt TEXT NOT NULL,
  refined_prompt TEXT,
  artistic_style VARCHAR(255),
  image_url TEXT,
  thumbnail_url TEXT,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  generation_params JSON,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Artistic styles table
CREATE TABLE IF NOT EXISTS artistic_styles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  style_prompt TEXT,
  preview_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_active (is_active)
);

-- User sessions table (for authentication)
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_token (session_token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);

-- Image collections/batches table
CREATE TABLE IF NOT EXISTS image_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  project_id INT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  batch_size INT DEFAULT 1,
  completed_count INT DEFAULT 0,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_status (status)
);

-- Batch images relationship table
CREATE TABLE IF NOT EXISTS batch_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  image_generation_id INT NOT NULL,
  position_in_batch INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES image_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (image_generation_id) REFERENCES image_generations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_batch_image (batch_id, image_generation_id),
  INDEX idx_batch_id (batch_id),
  INDEX idx_image_generation_id (image_generation_id)
);

-- Insert default artistic styles
INSERT IGNORE INTO artistic_styles (name, description, style_prompt) VALUES
('Photorealistic', 'High-quality photorealistic style', 'photorealistic, high quality, detailed, professional photography'),
('Digital Art', 'Modern digital art style', 'digital art, concept art, trending on artstation'),
('Oil Painting', 'Classic oil painting style', 'oil painting, classical art, fine art, museum quality'),
('Watercolor', 'Soft watercolor painting style', 'watercolor painting, soft colors, artistic, flowing'),
('Anime/Manga', 'Japanese anime and manga style', 'anime style, manga art, japanese animation'),
('Cyberpunk', 'Futuristic cyberpunk aesthetic', 'cyberpunk, neon lights, futuristic, sci-fi, dystopian'),
('Fantasy', 'Fantasy art style', 'fantasy art, magical, mystical, epic fantasy'),
('Minimalist', 'Clean minimalist style', 'minimalist, clean, simple, modern design'),
('Vintage', 'Retro vintage style', 'vintage, retro, classic, nostalgic'),
('Abstract', 'Abstract artistic style', 'abstract art, modern art, contemporary, artistic expression');
