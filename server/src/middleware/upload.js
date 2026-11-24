import multer from 'multer';
import { config } from '../config.js';

// Keeps the uploaded PDF in memory (one file, max 15 MB) so we can check it before saving it.
export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxPdfBytes, files: 1 },
}).single('file');
