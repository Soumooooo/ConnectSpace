import { Router, Response } from 'express';
import crypto from 'crypto';
import { queryAll, queryOne, runQuery } from '../db';
import { optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

function generateRoomCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
}

router.post('/create', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, passphrase } = req.body;
    const roomId = generateRoomCode();
    const hostId = req.user?.id || `guest_${crypto.randomUUID().slice(0, 8)}`;
    const hostName = req.user?.name || req.body.hostName || 'Host';
    const roomTitle = (title && typeof title === 'string' && title.trim()) ? title.trim() : `Meeting ${roomId}`;
    const now = Date.now();

    runQuery(
      'INSERT INTO rooms (id, title, host_id, host_name, passphrase, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [roomId, roomTitle, hostId, hostName, passphrase || null, now]
    );

    return res.status(201).json({
      room: {
        id: roomId,
        title: roomTitle,
        hostId,
        hostName,
        hasPassphrase: Boolean(passphrase),
        createdAt: now
      }
    });
  } catch (err: any) {
    console.error('Room create error:', err);
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

router.get('/user/recent', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.json({ rooms: [] });
    }
    const rooms = queryAll(
      `SELECT r.id, r.title, r.host_id, r.host_name, r.created_at, r.is_active,
              (SELECT COUNT(*) FROM room_files WHERE room_id = r.id) as file_count
       FROM rooms r
       WHERE r.host_id = ?
       ORDER BY r.created_at DESC
       LIMIT 15`,
      [req.user.id]
    );
    return res.json({ rooms });
  } catch (err: any) {
    console.error('Fetch recent rooms error:', err);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.get('/:roomId', (req, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = queryOne<{
      id: string;
      title: string;
      host_id: string;
      host_name: string;
      passphrase: string | null;
      created_at: number;
      is_active: number;
    }>('SELECT id, title, host_id, host_name, passphrase, created_at, is_active FROM rooms WHERE id = ?', [roomId]);

    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    return res.json({
      room: {
        id: room.id,
        title: room.title,
        hostId: room.host_id,
        hostName: room.host_name,
        hasPassphrase: Boolean(room.passphrase),
        createdAt: room.created_at,
        isActive: Boolean(room.is_active)
      }
    });
  } catch (err: any) {
    console.error('Fetch room error:', err);
    return res.status(500).json({ error: 'Failed to fetch room' });
  }
});

export default router;
