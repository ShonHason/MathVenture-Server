import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';
import userModel from '../modules/userModel';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/profile-images');
fs.ensureDirSync(uploadDir);

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Create unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    // Accept only jpeg and png
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG files are allowed'));
    }
  }
}).single('profileImage');

// Handle the upload request
const uploadProfileImage = (req: Request, res: Response) => {
  upload(req as any , res as any, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      // Resize image to a reasonable size for profile pictures
      const resizedFilename = 'resized-' + req.file.filename;
      const resizedPath = path.join(uploadDir, resizedFilename);
      
      await sharp(req.file.path)
        .resize(300, 300, { fit: 'cover' }) // Resize to standard profile picture size
        .jpeg({ quality: 80 }) // Compress with reasonable quality
        .toFile(resizedPath);
        
      // Remove original file to save space
      await fs.remove(req.file.path);
      
      // Generate URL for the image
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/profile-images/${resizedFilename}`;
      
      // If user ID is provided, update user's profile image
      const userId = req.query.userId || req.body.userId;
      if (userId) {
        await userModel.findByIdAndUpdate(userId, { imageUrl });
      }
      
      // Return success with image URL
      res.json({ 
        success: true, 
        imageUrl: imageUrl
      });
    } catch (error) {
      console.error('Image processing error:', error);
      res.status(500).json({ error: 'Failed to process image' });
    }
  });
};

export default { uploadProfileImage };