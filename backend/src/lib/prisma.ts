import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// List of models that have a tenantId column
const TENANT_MODELS = [
  'User', 
  'AuditLog', 
  'PipelineStage', 
  'CustomFieldConfig', 
  'Tag', 
  'Lead', 
  'LeadActivity',
  'IntegrationConfig',
  'Call',
  'WhatsAppMessage',
  'Campaign',
  'WhatsAppTemplate',
  'WhatsAppTemplateCategory',
  'WhatsAppTemplateVersion'
];

export const getTenantPrisma = (tenantId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model && TENANT_MODELS.includes(model)) {
            
            const a = args as any;
            // For reads, updates, deletes: inject tenantId into the where clause
            if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              a.where = { ...a.where, tenantId };
            }
            
            // For creates: inject tenantId into the data payload
            if (operation === 'create') {
              a.data = { ...a.data, tenantId };
            }
            if (operation === 'createMany') {
              if (Array.isArray(a.data)) {
                a.data = a.data.map((d: any) => ({ ...d, tenantId }));
              } else {
                a.data = { ...a.data, tenantId };
              }
            }
            // For upserts: inject tenantId into where, create, and update
            if (operation === 'upsert') {
              a.where = { ...a.where, tenantId };
              a.create = { ...a.create, tenantId };
              // We usually don't strictly need it in update, but good for consistency
              a.update = { ...a.update, tenantId };
            }
          }
          return query(args);
        },
      },
    },
  });
};
