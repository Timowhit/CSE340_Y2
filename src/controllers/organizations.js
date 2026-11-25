import {
    getAllOrganizations,
    getOrganizationDetails,
    createOrganization,
    updateOrganization
} from '../models/organizations.js';
import { getProjectsByOrganizationId } from '../models/projects.js';
import { parseId } from './parseId.js';

const NAME_MIN = 3;
const NAME_MAX = 150;
const DESCRIPTION_MAX = 1000;
const EMAIL_MAX = 255;
const LOGO_MAX = 255;
// Deliberately simple: one "@", no spaces, a dot in the domain.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A bare file name (no slashes), because it is used as /images/<logo_filename>.
const LOGO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|gif|svg|webp)$/i;

const EMPTY_VALUES = { name: '', description: '', contact_email: '', logo_filename: '' };

/** Non-strings (e.g. repeated form fields parsed as arrays) count as missing. */
const readText = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Trims and validates the organization form (server-side rules).
 * @param {Object} [body] - req.body
 * @returns {{values: Object, errors: Array<{field: string, message: string}>}}
 */
const validateOrganization = (body = {}) => {
    const values = {
        name: readText(body.name),
        description: readText(body.description),
        contact_email: readText(body.contact_email),
        logo_filename: readText(body.logo_filename)
    };
    const errors = [];
    const fail = (field, message) => errors.push({ field, message });

    if (values.name.length === 0) {
        fail('name', 'Organization name is required.');
    } else if (values.name.length < NAME_MIN) {
        fail('name', `Organization name must be at least ${NAME_MIN} characters.`);
    } else if (values.name.length > NAME_MAX) {
        fail('name', `Organization name must be ${NAME_MAX} characters or fewer.`);
    }

    if (values.description.length === 0) {
        fail('description', 'Description is required.');
    } else if (values.description.length > DESCRIPTION_MAX) {
        fail('description', `Description must be ${DESCRIPTION_MAX} characters or fewer.`);
    }

    if (values.contact_email.length === 0) {
        fail('contact_email', 'Contact email is required.');
    } else if (values.contact_email.length > EMAIL_MAX) {
        fail('contact_email', `Contact email must be ${EMAIL_MAX} characters or fewer.`);
    } else if (!EMAIL_PATTERN.test(values.contact_email)) {
        fail('contact_email', 'Enter a valid email address, like name@example.org.');
    }

    if (values.logo_filename.length === 0) {
        fail('logo_filename', 'Logo file name is required.');
    } else if (values.logo_filename.length > LOGO_MAX) {
        fail('logo_filename', `Logo file name must be ${LOGO_MAX} characters or fewer.`);
    } else if (!LOGO_PATTERN.test(values.logo_filename)) {
        fail('logo_filename', 'Logo file name must be a plain image file name ending in .png, .jpg, .jpeg, .gif, .svg or .webp.');
    }

    return { values, errors };
};

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
        const { values, errors } = validateOrganization(req.body);

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

        const { values, errors } = validateOrganization(req.body);

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
