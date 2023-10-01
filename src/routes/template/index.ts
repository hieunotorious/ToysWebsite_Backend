import { Router } from 'express';

import { templateController } from 'src/controller';
import { ValidateJoi, ValidateJoiParam } from 'src/middleware/Joi';
import { validateAdmin, validateToken } from 'src/middleware/validate';
import { ParamsSchema, TemplateSchema } from 'src/middleware/validationSchemas';
const router = Router();

router.get('/current', templateController.currentTemplate);

router.get('/all', validateToken, validateAdmin, templateController.getAllTemplates);

router.get(
  '/get/:id',
  validateToken,
  validateAdmin,
  ValidateJoiParam(ParamsSchema.common),
  templateController.getTemplate
);

router.post(
  '/create',
  validateToken,
  validateAdmin,
  ValidateJoi(TemplateSchema.create),
  templateController.createTemplate
);

router.patch(
  '/update/:id',
  validateToken,
  validateAdmin,
  ValidateJoiParam(ParamsSchema.common),
  ValidateJoi(TemplateSchema.update),
  templateController.updateTemplate
);

router.post(
  '/active/:id',
  validateToken,
  validateAdmin,
  ValidateJoiParam(ParamsSchema.common),
  templateController.activeTemplate
);

router.delete(
  '/delete/:id',
  validateToken,
  validateAdmin,
  ValidateJoiParam(ParamsSchema.common),
  templateController.deleteTemplate
);

export default router;
