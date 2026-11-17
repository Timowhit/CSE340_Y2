import { getUpcomingProjects, getProjectDetails } from '../models/projects.js';
import { getCategoriesByProjectId } from '../models/categories.js';
import { parseId } from './parseId.js';

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

export { showProjectsPage, showProjectDetailsPage };