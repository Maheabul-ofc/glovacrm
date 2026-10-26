import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { provisionTenant } from '../services/provisioning.service';

/**
 * POST /api/auth/register — Self-service company registration (free trial)
 */
export const registerTenant = async (req: Request, res: Response) => {
  try {
    const { companyName, industry, country, email, password, firstName, lastName } = req.body;

    if (!companyName || !email || !password || !firstName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();

    const result = await provisionTenant({
      companyName,
      industry,
      country,
      ownerEmail: normalizedEmail,
      ownerPassword: password,
      ownerFirstName: firstName,
      ownerLastName: lastName,
      plan: 'TRIAL',
      trialDays: 7,
    });

    // Set refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'Registration successful! Your 7-day free trial has started.',
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error: any) {
    console.error(error);
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: { tenant: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    // Allow SUPER_ADMIN even if tenant is suspended or null
    if (user.role !== 'SUPER_ADMIN' && user.tenant?.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Your organization has been suspended. Contact support.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    // Set HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Check trial status
    let trialInfo = null;
    if (user.tenant.plan === 'TRIAL' && user.tenant.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(user.tenant.trialEndsAt);
      const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      trialInfo = {
        isTrialActive: daysLeft > 0,
        daysLeft,
        trialEndsAt: user.tenant.trialEndsAt,
      };
    }

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        isOwner: user.isOwner,
        tenantName: user.tenant?.name || 'System Admin',
        tenantPlan: user.tenant?.plan || 'ENTERPRISE',
      },
      trialInfo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/auth/me — Get current user profile
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: { select: { id: true, name: true, plan: true, trialEndsAt: true, status: true } } },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    let trialInfo = null;
    if (user.tenant?.plan === 'TRIAL' && user.tenant?.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(user.tenant.trialEndsAt);
      const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      trialInfo = { isTrialActive: daysLeft > 0, daysLeft, trialEndsAt: user.tenant.trialEndsAt };
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        isOwner: user.isOwner,
        tenantName: user.tenant?.name || 'Workspace',
        tenantPlan: user.tenant?.plan || 'PRO',
      },
      trialInfo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/auth/change-password
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
