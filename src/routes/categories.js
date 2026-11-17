import { Router } from 'express';
import {
    showCategories,
    showNewCategoryForm,
    processNewCategory,
    showEditCategoryForm,
    processEditCategory
} from '../controllers/categories.js';

const router = Router();

router.get('/categories', showCategories);
router.get('/new-category', showNewCategoryForm);
router.post('/new-category', processNewCategory);
router.get('/edit-category/:id', showEditCategoryForm);
router.post('/edit-category/:id', processEditCategory);

export default router;