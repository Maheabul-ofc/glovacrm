import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    // Express 5 types req.params as string | string[], so we cast to string
    const notifId = Array.isArray(id) ? id[0] : id;

    await prisma.notification.deleteMany({
      where: { id: notifId as string, userId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
