import db from './db.js'

const getAllCategories = async() => {
    const query = `
        SELECT category_id, name
      FROM public.categories;
    `;

    const result = await db.query(query);

    return result.rows;
}

/**
 * @param {number} id - category_id
 * @returns {Promise<Object|null>} { category_id, name } or null
 */
const getCategoryDetails = async (id) => {
    const query = `
        SELECT category_id, name
        FROM categories
        WHERE category_id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] ?? null;
};

/**
 * All categories assigned to one project.
 * @param {number} projectId
 * @returns {Promise<Object[]>} { category_id, name }, alphabetical
 */
const getCategoriesByProjectId = async (projectId) => {
    const query = `
        SELECT c.category_id, c.name
        FROM categories c
        JOIN project_categories pc ON pc.category_id = c.category_id
        WHERE pc.project_id = $1
        ORDER BY c.name ASC;
    `;
    const result = await db.query(query, [projectId]);
    return result.rows;
};

export { getAllCategories, getCategoryDetails, getCategoriesByProjectId };