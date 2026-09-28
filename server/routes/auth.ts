import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { queryOne, runQuery } from '../db';
import { signToken, authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const now = Date.now();

    runQuery(
      'INSERT INTO users (id, email, name, password, created_at) VALUES (?, ?, ?, ?, ?)',
      [userId, cleanEmail, name.trim(), hashedPassword, now]
    );

    const userPayload = { id: userId, email: cleanEmail, name: name.trim() };
    const token = signToken(userPayload);

    return res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: userPayload
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = (email as string).toLowerCase().trim();
    const user = queryOne<{ id: string; email: string; name: string; password: string }>(
      'SELECT id, email, name, password FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userPayload = { id: user.id, email: user.email, name: user.name };
    const token = signToken(userPayload);

    return res.json({
      message: 'Logged in successfully',
      token,
      user: userPayload
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to log in. Please try again.' });
  }
});

router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = queryOne<{ id: string; email: string; name: string; created_at: number }>(
    'SELECT id, email, name, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user });
});

export default router;
