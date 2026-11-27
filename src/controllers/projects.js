import {
    getUpcomingProjects,
    getProjectDetails,
    createProject,
    updateProject
} from '../models/projects.js';
import { getCategoriesByProjectId } from '../models/categories.js';
import { getAllOrganizations } from '../models/organizations.js';
import { parseId } from './parseId.js';
import { collectForm } from '../middleware/validation.js';

const FOREIGN_KEY_VIOLATION = '23503'; // PostgreSQL error code

const FORM_FIELDS = ['title', 'description', 'location', 'project_date', 'organization_id'];
const EMPTY_VALUES = { title: '', description: '', location: '', project_date: '', organization_id: '' };

/**
 * Reads the validated project form (rules live in validateProject, run by the route).
 * `values.organization_id` stays a string so the <select> can re-select it;
 * the model receives a number via `data`.
 */
const readProjectForm = (req) => {
    const { values, errors } = collectForm(req, FORM_FIELDS);
    return { values, data: { ...values, organization_id: parseId(values.organization_id) }, errors };
};

/**
 * Renders a project form view. Every form render needs the organization list for
 * the <select>, so it is fetched here instead of in each handler.
 */
const renderProjectForm = async (res, view, options) => {
    const organizations = await getAllOrganizations();
    res.status(options.status ?? 200).render(view, {
        title: options.title,
        formAction: options.formAction,
        submitLabel: options.submitLabel,
        cancelHref: options.cancelHref,
        values: options.values,
        errors: options.errors ?? [],
        organizations
    });
};

const showProjectsPage = async (req, res, next) => {
    try {
        const projects = await getUpcomingProjects(5);
        res.render('projects', { title: 'Service Projects', projects });
    } catch (err) {
        next(err);
    }
};

const showProjectDetailsPage = async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (id === null) return next();

        const project = await getProjectDetails(id);
        if (!project) return next();

        const categories = await getCategoriesByProjectId(id);
        res.render('project', { title: project.title, project, categories });
    } catch (err) {
        next(err);
    }
};

const showNewProjectForm = async (req, res, next) => {
    try {
        await renderProjectForm(res, 'new-project', {
            title: 'New Project',
            formAction: '/new-project',
            submitLabel: 'Create Project',
            cancelHref: '/projects',
            values: EMPTY_VALUES
        });
    } catch (err) {
        next(err);
    }
};

const processNewProject = async (req, res, next) => {
    try {
        const { values, data, errors } = readProjectForm(req);

        if (errors.length === 0) {
            try {
                const project = await createProject(data);
                req.session.flash = `Project "${project.title}" created.`;
                return res.redirect(`/project/${project.project_id}`);
            } catch (err) {
                // The organization was deleted after the form loaded.
                if (err.code !== FOREIGN_KEY_VIOLATION) throw err;
                errors.push({ field: 'organization_id', message: 'That organization no longer exists. Choose another.' });
            }
        }

        await renderProjectForm(res, 'new-project', {
            status: 400,
            title: 'New Project',
            formAction: '/new-project',
            submitLabel: 'Create Project',
            cancelHref: '/projects',
            values,
            errors
        });
    } catch (err) {
        next(err);
    }
};

const showEditProjectForm = async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        const project = id === null ? null : await getProjectDetails(id);
        if (!project) return next();

        await renderProjectForm(res, 'edit-project', {
            title: 'Edit Project',
            formAction: `/edit-project/${project.project_id}`,
            submitLabel: 'Save Changes',
            cancelHref: `/project/${project.project_id}`,
            values: {
                title: project.title,
                description: project.description ?? '',
                location: project.location ?? '',
                project_date: project.project_date_iso ?? '',
                organization_id: String(project.organization_id)
            }
        });
    } catch (err) {
        next(err);
    }
};

const processEditProject = async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (id === null) return next();

        const { values, data, errors } = readProjectForm(req);

        if (errors.length === 0) {
            try {
                const updated = await updateProject(id, data);
                if (!updated) return next(); // project no longer exists -> 404
                req.session.flash = `Project "${updated.title}" updated.`;
                return res.redirect(`/project/${updated.project_id}`);
            } catch (err) {
                if (err.code !== FOREIGN_KEY_VIOLATION) throw err;
                errors.push({ field: 'organization_id', message: 'That organization no longer exists. Choose another.' });
            }
        }

        await renderProjectForm(res, 'edit-project', {
            status: 400,
            title: 'Edit Project',
            formAction: `/edit-project/${id}`,
            submitLabel: 'Save Changes',
            cancelHref: `/project/${id}`,
            values,
            errors
        });
    } catch (err) {
        next(err);
    }
};

export {
    showProjectsPage,
    showProjectDetailsPage,
    showNewProjectForm,
    processNewProject,
    showEditProjectForm,
    processEditProject
};
