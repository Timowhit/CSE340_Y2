import {
    getUpcomingProjects,
    getProjectDetails,
    createProject,
    updateProject
} from '../models/projects.js';
import { getCategoriesByProjectId } from '../models/categories.js';
import { getAllOrganizations } from '../models/organizations.js';
import { parseId } from './parseId.js';

const TITLE_MIN = 3;
const TITLE_MAX = 150;
const DESCRIPTION_MAX = 2000;
const LOCATION_MAX = 200;
const YEAR_MIN = 1900; // keeps dates inside what PostgreSQL and the date picker handle sanely
const YEAR_MAX = 2100;
const FOREIGN_KEY_VIOLATION = '23503'; // PostgreSQL error code

const EMPTY_VALUES = { title: '', description: '', location: '', project_date: '', organization_id: '' };

/** Non-strings (e.g. repeated form fields parsed as arrays) count as missing. */
const readText = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * True only for a real calendar date written as YYYY-MM-DD.
 * Round-tripping through Date rejects things like 2026-02-30.
 */
const isValidDate = (text) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const year = Number(text.slice(0, 4));
    if (year < YEAR_MIN || year > YEAR_MAX) return false;
    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
};

/**
 * Trims and validates the project form (server-side rules).
 * `values.organization_id` stays a string so the <select> can re-select it;
 * the model receives a number via `data`.
 * @param {Object} [body] - req.body
 * @returns {{values: Object, data: Object, errors: Array<{field: string, message: string}>}}
 */
const validateProject = (body = {}) => {
    const values = {
        title: readText(body.title),
        description: readText(body.description),
        location: readText(body.location),
        project_date: readText(body.project_date),
        organization_id: readText(body.organization_id)
    };
    const errors = [];
    const fail = (field, message) => errors.push({ field, message });

    if (values.title.length === 0) {
        fail('title', 'Project title is required.');
    } else if (values.title.length < TITLE_MIN) {
        fail('title', `Project title must be at least ${TITLE_MIN} characters.`);
    } else if (values.title.length > TITLE_MAX) {
        fail('title', `Project title must be ${TITLE_MAX} characters or fewer.`);
    }

    if (values.description.length === 0) {
        fail('description', 'Description is required.');
    } else if (values.description.length > DESCRIPTION_MAX) {
        fail('description', `Description must be ${DESCRIPTION_MAX} characters or fewer.`);
    }

    if (values.location.length === 0) {
        fail('location', 'Location is required.');
    } else if (values.location.length > LOCATION_MAX) {
        fail('location', `Location must be ${LOCATION_MAX} characters or fewer.`);
    }

    if (values.project_date.length === 0) {
        fail('project_date', 'Project date is required.');
    } else if (!isValidDate(values.project_date)) {
        fail('project_date', `Enter a real date between ${YEAR_MIN} and ${YEAR_MAX} (YYYY-MM-DD).`);
    }

    const organizationId = parseId(values.organization_id);
    if (organizationId === null) {
        fail('organization_id', 'Choose an organization.');
    }

    return { values, data: { ...values, organization_id: organizationId }, errors };
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
        const { values, data, errors } = validateProject(req.body);

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

        const { values, data, errors } = validateProject(req.body);

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
