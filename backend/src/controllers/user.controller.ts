import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export const listUsers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        isOwner: true,
        _count: { select: { assignedLeads: true, calls: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const inviteUser = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { email, firstName, lastName, role, password } = req.body;

    if (!email || !firstName || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure role is either TEAM_MANAGER or TELECALLER
    if (role !== 'TEAM_MANAGER' && role !== 'TELECALLER') {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        tenantId: tenantId!,
        email,
        firstName,
        lastName,
        role,
        passwordHash,
        status: 'ACTIVE',
        invitedById: req.user?.userId
      },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true, status: true, createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = req.user?.tenantId;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await prisma.user.findUnique({ where: { id: id as string } });
    
    if (!user || user.tenantId !== tenantId) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isOwner) {
      return res.status(403).json({ error: 'Cannot modify the Business Owner' });
    }

    const updated = await prisma.user.update({
      where: { id: id as string },
      data: { status },
      select: { id: true, status: true }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
