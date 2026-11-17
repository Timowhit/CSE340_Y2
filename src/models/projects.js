import db from './db.js';

/**
 * Next upcoming projects with their organization's name.
 * @param {number} [limit=5]
 * @returns {Promise<Object[]>} project_id, title, location, project_date (formatted),
 *                              organization_id, organization_name
 */
const getUpcomingProjects = async (limit = 5) => {
    const query = `
        SELECT p.project_id, p.title, p.location,
               to_char(p.project_date, 'FMMon FMDD, YYYY') AS project_date,
               o.organization_id, o.name AS organization_name
        FROM projects p
        JOIN organization o ON o.organization_id = p.organization_id
        WHERE p.project_date >= CURRENT_DATE
        ORDER BY p.project_date ASC, p.project_id ASC
        LIMIT $1;
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
};

/**
 * One project with its organization's name.
 * @param {number} id - project_id
 * @returns {Promise<Object|null>}
 */
const getProjectDetails = async (id) => {
    const query = `
        SELECT p.project_id, p.title, p.description, p.location,
               to_char(p.project_date, 'FMMon FMDD, YYYY') AS project_date,
               o.organization_id, o.name AS organization_name
        FROM projects p
        JOIN organization o ON o.organization_id = p.organization_id
        WHERE p.project_id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] ?? null;
};

/**
 * All projects for one organization, soonest first.
 * @param {number} organizationId
 * @returns {Promise<Object[]>} project_id, title, location, project_date
 */
const getProjectsByOrganizationId = async (organizationId) => {
    const query = `
        SELECT project_id, title, location,
               to_char(project_date, 'FMMon FMDD, YYYY') AS project_date
        FROM projects
        WHERE organization_id = $1
        ORDER BY projects.project_date ASC, project_id ASC;
    `;
    const result = await db.query(query, [organizationId]);
    return result.rows;
};

/**
 * All projects in one category (via the project_categories junction table).
 * @param {number} categoryId
 * @returns {Promise<Object[]>} project_id, title, location, project_date
 */
const getProjectsByCategoryId = async (categoryId) => {
    const query = `
        SELECT p.project_id, p.title, p.location,
               to_char(p.project_date, 'FMMon FMDD, YYYY') AS project_date
        FROM projects p
        JOIN project_categories pc ON pc.project_id = p.project_id
        WHERE pc.category_id = $1
        ORDER BY p.project_date ASC, p.project_id ASC;
    `;
    const result = await db.query(query, [categoryId]);
    return result.rows;
};

export {
    getUpcomingProjects,
    getProjectDetails,
    getProjectsByOrganizationId,
    getProjectsByCategoryId
};