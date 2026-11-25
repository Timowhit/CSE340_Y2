import { Router } from 'express';
import { showHomePage } from '../controllers/index.js';
import {
    showOrganizationsPage,
    showOrganizationDetailsPage,
    showNewOrganizationForm,
    processNewOrganization,
    showEditOrganizationForm,
    processEditOrganization
} from '../controllers/organizations.js';
import {
    showProjectsPage,
    showProjectDetailsPage,
    showNewProjectForm,
    processNewProject,
    showEditProjectForm,
    processEditProject
} from '../controllers/projects.js';
import {
    showCategoriesPage,
    showCategoryDetailsPage,
    showNewCategoryForm,
    processNewCategory,
    showEditCategoryForm,
    processEditCategory
} from '../controllers/categories.js';

const router = Router();

router.get('/', showHomePage);
router.get('/organizations', showOrganizationsPage);
router.get('/organization/:id', showOrganizationDetailsPage);
router.get('/new-organization', showNewOrganizationForm);
router.post('/new-organization', processNewOrganization);
router.get('/edit-organization/:id', showEditOrganizationForm);
router.post('/edit-organization/:id', processEditOrganization);
router.get('/projects', showProjectsPage);
router.get('/project/:id', showProjectDetailsPage);
router.get('/new-project', showNewProjectForm);
router.post('/new-project', processNewProject);
router.get('/edit-project/:id', showEditProjectForm);
router.post('/edit-project/:id', processEditProject);
router.get('/categories', showCategoriesPage);
router.get('/category/:id', showCategoryDetailsPage);
router.get('/new-category', showNewCategoryForm);
router.post('/new-category', processNewCategory);
router.get('/edit-category/:id', showEditCategoryForm);
router.post('/edit-category/:id', processEditCategory);

export default router;