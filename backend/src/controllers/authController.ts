import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { users } from '../schema/index.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_market_mayhem_jwt_key_2026';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const userList = await db.select().from(users).where(eq(users.username, username.trim()));
    if (userList.length === 0) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const user = userList[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      teamName: user.teamName,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        teamName: user.teamName,
        cash: user.cash,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userList = await db.select().from(users).where(eq(users.id, req.user.id));
    if (userList.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userList[0];
    res.status(200).json({
      id: user.id,
      username: user.username,
      role: user.role,
      teamName: user.teamName,
      cash: user.cash,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error fetching user profile' });
  }
};
