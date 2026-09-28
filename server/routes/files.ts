import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { queryAll, queryOne, runQuery } from '../db';

const router = Router();
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const sanitizedExt = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
    cb(null, `file-${uniqueSuffix}${sanitizedExt}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

router.post('/upload', upload.single('file'), (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { roomId, uploaderId, uploaderName } = req.body;
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    const fileId = crypto.randomUUID();
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const filePath = req.file.filename;
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const now = Date.now();

    runQuery(
      `INSERT INTO room_files (id, room_id, file_name, file_size, file_path, mime_type, uploader_id, uploader_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fileId, roomId, fileName, fileSize, filePath, mimeType, uploaderId || 'anonymous', uploaderName || 'Anonymous', now]
    );

    const fileRecord = {
      id: fileId,
      roomId,
      fileName,
      fileSize,
      mimeType,
      uploaderId: uploaderId || 'anonymous',
      uploaderName: uploaderName || 'Anonymous',
      createdAt: now,
      downloadUrl: `/api/files/download/${fileId}`
    };

    return res.status(201).json({
      message: 'File uploaded successfully',
      file: fileRecord
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.get('/room/:roomId', (req, res: Response) => {
  try {
    const { roomId } = req.params;
    const rows = queryAll<{
      id: string;
      room_id: string;
      file_name: string;
      file_size: number;
      file_path: string;
      mime_type: string;
      uploader_id: string;
      uploader_name: string;
      created_at: number;
    }>('SELECT * FROM room_files WHERE room_id = ? ORDER BY created_at DESC', [roomId]);

    const files = rows.map(r => ({
      id: r.id,
      roomId: r.room_id,
      fileName: r.file_name,
      fileSize: r.file_size,
      mimeType: r.mime_type,
      uploaderId: r.uploader_id,
      uploaderName: r.uploader_name,
      createdAt: r.created_at,
      downloadUrl: `/api/files/download/${r.id}`
    }));

    return res.json({ files });
  } catch (err: any) {
    console.error('Fetch room files error:', err);
    return res.status(500).json({ error: 'Failed to fetch files' });
  }
});

router.get('/download/:fileId', (req, res: Response) => {
  try {
    const { fileId } = req.params;
    const file = queryOne<{
      id: string;
      file_name: string;
      file_path: string;
      mime_type: string;
    }>('SELECT * FROM room_files WHERE id = ?', [fileId]);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fullDiskPath = path.join(UPLOADS_DIR, file.file_path);
    if (!fs.existsSync(fullDiskPath)) {
      return res.status(404).json({ error: 'File data not found on disk' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
    res.setHeader('Content-Type', file.mime_type);
    return res.sendFile(fullDiskPath);
  } catch (err: any) {
    console.error('Download error:', err);
    return res.status(500).json({ error: 'Failed to download file' });
  }
});

export default router;
