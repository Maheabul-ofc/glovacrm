import { getTenantPrisma } from '../lib/prisma';

export const assignLeadManual = async (tenantId: string, leadId: string, assignedToId: string, assignedById: string) => {
  const prisma = getTenantPrisma(tenantId);
  
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { assignedToId }
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      tenantId,
      userId: assignedById,
      type: 'STATUS_CHANGE',
      description: `Lead manually assigned`
    }
  });

  return lead;
};

export const assignLeadRoundRobin = async (tenantId: string, leadId: string) => {
  const prisma = getTenantPrisma(tenantId);
  
  // Find all active telecallers for this tenant
  const telecallers = await prisma.user.findMany({
    where: { tenantId, role: 'TELECALLER', status: 'ACTIVE' },
    orderBy: { id: 'asc' }
  });

  if (telecallers.length === 0) {
    // Fallback to Tenant Admin
    const admin = await prisma.user.findFirst({
      where: { tenantId, role: 'TENANT_ADMIN', status: 'ACTIVE' }
    });
    if (!admin) {
      throw new Error('No active telecallers or admins found in this tenant');
    }
    telecallers.push(admin);
  }

  // Find the last assigned telecaller
  const lastAssignment = await prisma.leadActivity.findFirst({
    where: { tenantId, type: 'STATUS_CHANGE', description: { startsWith: 'Lead assigned via Round Robin' } },
    orderBy: { createdAt: 'desc' }
  });

  let nextUserId = telecallers[0].id;

  if (lastAssignment && lastAssignment.metadata && typeof lastAssignment.metadata === 'object') {
    const meta = lastAssignment.metadata as { assignedToId?: string };
    if (meta.assignedToId) {
      const lastIndex = telecallers.findIndex(t => t.id === meta.assignedToId);
      if (lastIndex !== -1 && lastIndex + 1 < telecallers.length) {
        nextUserId = telecallers[lastIndex + 1].id;
      }
    }
  }

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { assignedToId: nextUserId }
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      tenantId,
      type: 'STATUS_CHANGE',
      description: `Lead assigned via Round Robin`,
      metadata: { assignedToId: nextUserId, method: 'ROUND_ROBIN' }
    }
  });

  return lead;
};
