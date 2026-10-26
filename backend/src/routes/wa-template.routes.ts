import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listTemplates,
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplate,
  getVersionHistory,
  previewTemplate,
  useTemplate,
  syncMetaTemplate
} from '../controllers/wa-template.controller';

const router = Router();

router.use(requireAuth);

// Categories
router.get('/categories', listCategories);
router.post('/categories', requireRole(['TENANT_ADMIN']), createCategory);
router.patch('/categories/:id', requireRole(['TENANT_ADMIN']), updateCategory);
router.delete('/categories/:id', requireRole(['TENANT_ADMIN']), deleteCategory);

// Templates
router.get('/', listTemplates);
router.post('/', requireRole(['TENANT_ADMIN', 'TEAM_MANAGER']), createTemplate);
router.get('/:id', getTemplate);
router.patch('/:id', requireRole(['TENANT_ADMIN', 'TEAM_MANAGER']), updateTemplate);
router.delete('/:id', requireRole(['TENANT_ADMIN']), deleteTemplate);
router.patch('/:id/toggle', requireRole(['TENANT_ADMIN']), toggleTemplate);
router.get('/:id/versions', requireRole(['TENANT_ADMIN', 'TEAM_MANAGER']), getVersionHistory);
router.post('/:id/preview', previewTemplate);
router.post('/:id/send', useTemplate);
router.post('/:id/sync-meta', requireRole(['TENANT_ADMIN']), syncMetaTemplate);

export default router;
