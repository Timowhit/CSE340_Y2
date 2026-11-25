import { Router } from 'express';
import { showHomePage } from '../controllers/index.js';
import { showLoginForm, processLogin, processLogout } from '../controllers/auth.js';
import { requireRole } from '../middleware/auth.js';
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

// Every create/edit route (form and submit) is admin-only.
const requireAdmin = requireRole('admin');

router.get('/', showHomePage);
router.get('/login', showLoginForm);
router.post('/login', processLogin);
router.post('/logout', processLogout);
router.get('/organizations', showOrganizationsPage);
router.get('/organization/:id', showOrganizationDetailsPage);
router.get('/new-organization', requireAdmin, showNewOrganizationForm);
router.post('/new-organization', requireAdmin, processNewOrganization);
router.get('/edit-organization/:id', requireAdmin, showEditOrganizationForm);
router.post('/edit-organization/:id', requireAdmin, processEditOrganization);
router.get('/projects', showProjectsPage);
router.get('/project/:id', showProjectDetailsPage);
router.get('/new-project', requireAdmin, showNewProjectForm);
router.post('/new-project', requireAdmin, processNewProject);
router.get('/edit-project/:id', requireAdmin, showEditProjectForm);
router.post('/edit-project/:id', requireAdmin, processEditProject);
router.get('/categories', showCategoriesPage);
router.get('/category/:id', showCategoryDetailsPage);
router.get('/new-category', requireAdmin, showNewCategoryForm);
router.post('/new-category', requireAdmin, processNewCategory);
router.get('/edit-category/:id', requireAdmin, showEditCategoryForm);
router.post('/edit-category/:id', requireAdmin, processEditCategory);

export default router;