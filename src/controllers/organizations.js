import { getAllOrganizations, getOrganizationDetails } from '../models/organizations.js';
import { getProjectsByOrganizationId } from '../models/projects.js';
import { parseId } from './parseId.js';

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

export { showOrganizationsPage, showOrganizationDetailsPage };