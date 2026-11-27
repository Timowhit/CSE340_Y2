import {
    getAllOrganizations,
    getOrganizationDetails,
    createOrganization,
    updateOrganization
} from '../models/organizations.js';
import { getProjectsByOrganizationId } from '../models/projects.js';
import { parseId } from './parseId.js';
import { collectForm } from '../middleware/validation.js';

const FORM_FIELDS = ['name', 'description', 'contact_email', 'logo_filename'];

const EMPTY_VALUES = { name: '', description: '', contact_email: '', logo_filename: '' };

const showOrganizationsPage = async (req, res, next) => {
    try {
        const organizations = await getAllOrganizations();
        res.render('organizations', { title: 'Our Partner Organizations', organizations });
    } catch (err) {
        next(err);
    }
};

const showOrganizationDetailsPage = async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (id === null) return next(); // falls through to the 404 handler

        const organization = await getOrganizationDetails(id);
        if (!organization) return next();

        const projects = await getProjectsByOrganizationId(id);
        res.render('organization', { title: organization.name, organization, projects });
    } catch (err) {
        next(err);
    }
};

const showNewOrganizationForm = (req, res) => {
    res.render('new-organization', {
        title: 'New Organization',
        formAction: '/new-organization',
        submitLabel: 'Create Organization',
        cancelHref: '/organizations',
        values: EMPTY_VALUES,
        errors: []
    });
};

const processNewOrganization = async (req, res, next) => {
    try {
        // The rules live in validateOrganization (src/middleware/validation.js), run by the route.
        const { values, errors } = collectForm(req, FORM_FIELDS);

        if (errors.length === 0) {
            const organization = await createOrganization(values);
            req.session.flash = `Organization "${organization.name}" created.`;
            return res.redirect(`/organization/${organization.organization_id}`);
        }

        res.status(400).render('new-organization', {
            title: 'New Organization',
            formAction: '/new-organization',
            submitLabel: 'Create Organization',
            cancelHref: '/organizations',
            values,
            errors
        });
    } catch (err) {
        next(err);
    }
};

const showEditOrganizationForm = async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        const organization = id === null ? null : await getOrganizationDetails(id);
        if (!organization) return next();

        res.render('edit-organization', {
            title: 'Edit Organization',
            formAction: `/edit-organization/${organization.organization_id}`,
            submitLabel: 'Save Changes',
            cancelHref: `/organization/${organization.organization_id}`,
            values: {
                name: organization.name,
                description: organization.description,
                contact_email: organization.contact_email,
                logo_filename: organization.logo_filename
            },
            errors: []
        });
    } catch (err) {
        next(err);
    }
};

const processEditOrganization = async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (id === null) return next();

        const { values, errors } = collectForm(req, FORM_FIELDS);

        if (errors.length === 0) {
            const updated = await updateOrganization(id, values);
            if (!updated) return next(); // organization no longer exists -> 404
            req.session.flash = `Organization "${updated.name}" updated.`;
            return res.redirect(`/organization/${updated.organization_id}`);
        }

        res.status(400).render('edit-organization', {
            title: 'Edit Organization',
            formAction: `/edit-organization/${id}`,
            submitLabel: 'Save Changes',
            cancelHref: `/organization/${id}`,
            values,
            errors
        });
    } catch (err) {
        next(err);
    }
};

export {
    showOrganizationsPage,
    showOrganizationDetailsPage,
    showNewOrganizationForm,
    processNewOrganization,
    showEditOrganizationForm,
    processEditOrganization
};
