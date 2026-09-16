import express from 'express';
import { ActividadesController } from '../controllers/actividadesController.js';

const subtareasRouter = express.Router();
const actividadesController = new ActividadesController();

// Define routes for subtasks related to activities
subtareasRouter.post('/:actividadId/subtareas', actividadesController.createSubtarea);
subtareasRouter.get('/:actividadId/subtareas', actividadesController.getSubtareas);
subtareasRouter.put('/:actividadId/subtareas/:subtareaId', actividadesController.updateSubtarea);
subtareasRouter.delete('/:actividadId/subtareas/:subtareaId', actividadesController.deleteSubtarea);

export default subtareasRouter;