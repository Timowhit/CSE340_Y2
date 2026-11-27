import { Router } from 'express';
import { showHomePage } from '../controllers/index.js';
import { showLoginForm, processLogin, processLogout } from '../controllers/auth.js';
import { showDashboard, showUsersPage, showRegisterForm, processRegister } from '../controllers/users.js';
import { requireLogin, requireRole } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import {
    validateLogin,
    validateRegistration,
    validateOrganization,
    validateProject,
    validateCategory
} from '../middleware/validation.js';
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
router.post('/login', loginLimiter, validateLogin, processLogin);
router.post('/logout', processLogout);
router.get('/register', showRegisterForm);
router.post('/register', registerLimiter, validateRegistration, processRegister);
router.get('/dashboard', requireLogin, showDashboard);
router.get('/users', requireAdmin, showUsersPage);
router.get('/organizations', showOrganizationsPage);
router.get('/organization/:id', showOrganizationDetailsPage);
router.get('/new-organization', requireAdmin, showNewOrganizationForm);
router.post('/new-organization', requireAdmin, validateOrganization, processNewOrganization);
router.get('/edit-organization/:id', requireAdmin, showEditOrganizationForm);
router.post('/edit-organization/:id', requireAdmin, validateOrganization, processEditOrganization);
router.get('/projects', showProjectsPage);
router.get('/project/:id', showProjectDetailsPage);
router.get('/new-project', requireAdmin, showNewProjectForm);
router.post('/new-project', requireAdmin, validateProject, processNewProject);
router.get('/edit-project/:id', requireAdmin, showEditProjectForm);
router.post('/edit-project/:id', requireAdmin, validateProject, processEditProject);
router.get('/categories', showCategoriesPage);
router.get('/category/:id', showCategoryDetailsPage);
router.get('/new-category', requireAdmin, showNewCategoryForm);
router.post('/new-category', requireAdmin, validateCategory, processNewCategory);
router.get('/edit-category/:id', requireAdmin, showEditCategoryForm);
router.post('/edit-category/:id', requireAdmin, validateCategory, processEditCategory);

export default router;
