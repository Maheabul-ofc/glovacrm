import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    // 1. Total Leads
    const totalLeads = await prisma.lead.count();

    // 2. Active Calls today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const activeCalls = await prisma.call.count({
      where: {
        createdAt: { gte: startOfDay }
      }
    });

    // 3. Conversion Rate (Leads in specific "WON" stage) - simplified
    // In reality, this would require querying specific pipeline stages
    const convertedLeads = await prisma.leadActivity.count({
      where: { type: 'STATUS_CHANGE', description: { contains: 'Won' } }
    });
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    // 4. Telecaller Leaderboard
    const leaderboardRaw = await prisma.leadActivity.groupBy({
      by: ['userId'],
      _count: {
        id: true
      },
      where: {
        type: 'CALL',
        createdAt: { gte: startOfDay }
      },
      orderBy: {
        _count: { id: 'desc' }
      },
      take: 5
    });

    // Fetch user details for leaderboard
    const userIds = leaderboardRaw.map(l => l.userId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true }
    });

    const leaderboard = leaderboardRaw.map(l => {
      const user = users.find(u => u.id === l.userId);
      return {
        user,
        callsMade: l._count.id
      };
    }).filter(l => l.user);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaysFollowUps = await prisma.lead.count({
      where: {
        nextFollowUpAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const missedFollowUps = await prisma.lead.count({
      where: {
        nextFollowUpAt: {
          lt: startOfDay
        },
        status: {
          notIn: ['CONVERTED', 'CLOSED']
        }
      }
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyConversions = await prisma.lead.count({
      where: {
        status: 'CONVERTED',
        updatedAt: {
          gte: startOfMonth
        }
      }
    });

    const campaignRevenueRaw = await prisma.lead.groupBy({
      by: ['campaignId', 'source'],
      _sum: {
        revenueAmount: true
      },
      where: {
        status: 'CONVERTED',
        updatedAt: {
          gte: startOfMonth
        }
      }
    });

    const campaignRevenue = campaignRevenueRaw.map(cr => ({
      campaignId: cr.campaignId,
      source: cr.source,
      revenue: cr._sum.revenueAmount || 0
    }));

    res.json({
      metrics: {
        totalLeads,
        activeCallsToday: activeCalls,
        conversionRate: `${conversionRate}%`,
        tasksDue: 8, // Mock
        todaysFollowUps,
        missedFollowUps,
        monthlyConversions,
        campaignRevenue
      },
      leaderboard
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFullAnalytics = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    // 1. Core Metrics
    const totalLeads = await prisma.lead.count();
    
    const convertedLeads = await prisma.leadActivity.count({
      where: { type: 'STATUS_CHANGE', description: { contains: 'Won' } }
    });
    
    const lostLeads = await prisma.leadActivity.count({
      where: { type: 'STATUS_CHANGE', description: { contains: 'Lost' } }
    });
    
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    // 2. Lead Source Distribution
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      _count: { id: true },
      where: { source: { not: null } }
    });
    
    // 3. Campaign Performance (basic aggregate)
    const campaigns = await prisma.campaign.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });

    res.json({
      overview: {
        totalLeads,
        convertedLeads,
        lostLeads,
        conversionRate: `${conversionRate}%`,
        revenue: '₹0' // Placeholder until revenue tracking is implemented
      },
      sourceDistribution: leadsBySource.map(s => ({
        name: s.source || 'Unknown',
        value: s._count.id
      })),
      campaigns: campaigns.map(c => ({
        name: c.name,
        leads: c._count.leads,
        status: c.status
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReportsData = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    // 1. KPIs
    const totalLeads = await prisma.lead.count();
    const convertedLeads = await prisma.lead.count({ where: { status: 'CONVERTED' } });
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    // 2. Monthly Revenue (group by week - simulated for now using last 4 weeks)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentConvertedLeads = await prisma.lead.findMany({
      where: { status: 'CONVERTED', updatedAt: { gte: thirtyDaysAgo } },
      select: { revenueAmount: true, updatedAt: true }
    });

    const monthlyRevenue = [
      { name: 'Week 1', revenue: 0 },
      { name: 'Week 2', revenue: 0 },
      { name: 'Week 3', revenue: 0 },
      { name: 'Week 4', revenue: 0 }
    ];

    recentConvertedLeads.forEach(lead => {
      const daysAgo = Math.floor((new Date().getTime() - lead.updatedAt.getTime()) / (1000 * 3600 * 24));
      const weekIndex = 3 - Math.min(3, Math.floor(daysAgo / 7)); // 0 = oldest week, 3 = this week
      monthlyRevenue[weekIndex].revenue += (lead.revenueAmount || 0);
    });

    // 3. Campaign Performance
    const campaigns = await prisma.campaign.findMany({
      where: { tenantId },
      include: { _count: { select: { leads: true } } },
      orderBy: { leads: { _count: 'desc' } },
      take: 5
    });

    // Handle leads without campaign (fallback to source)
    const manualLeads = await prisma.lead.count({ where: { campaignId: null, source: 'MANUAL' } });

    const campaignPerformance = campaigns.map(c => ({
      name: c.name,
      value: c._count.leads
    }));
    if (manualLeads > 0) campaignPerformance.push({ name: 'Manual Entry', value: manualLeads });

    // 4. Lead Status Distribution
    const statusCounts = await prisma.lead.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    
    const leadStatusDistribution = statusCounts.map(s => ({
      name: s.status,
      value: s._count.id
    }));

    // 5. Cancellation Analysis
    const closedLeadsCount = await prisma.lead.count({ where: { status: { in: ['CLOSED', 'NOT_INTERESTED'] } } });
    const cancelReasons = await prisma.lead.groupBy({
      by: ['cancelReason'],
      _count: { id: true },
      where: { status: { in: ['CLOSED', 'NOT_INTERESTED'] } }
    });

    const cancellationAnalysis = cancelReasons
      .filter(c => c.cancelReason)
      .map(c => ({
        reason: c.cancelReason,
        percentage: closedLeadsCount > 0 ? Math.round((c._count.id / closedLeadsCount) * 100) : 0
      }))
      .sort((a, b) => b.percentage - a.percentage);

    res.json({
      kpis: {
        totalLeads,
        convertedLeads,
        conversionRate
      },
      monthlyRevenue,
      campaignPerformance,
      leadStatusDistribution,
      cancellationAnalysis
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
