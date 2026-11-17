import db from './db.js';

/**
 * Retrieves all categories, ordered by name.
 * @returns {Promise<Array<{category_id: number, name: string}>>}
 */
const getAllCategories = async () => {
    const query = `
        SELECT category_id, name
        FROM public.categories
        ORDER BY name;
    `;
    const result = await db.query(query);
    return result.rows;
};

/**
 * Retrieves a single category by its ID.
 * @param {number} id - The category_id to look up.
 * @returns {Promise<{category_id: number, name: string}|null>} The category, or null if not found.
 */
const getCategoryDetails = async (id) => {
    const query = `
        SELECT category_id, name
        FROM public.categories
        WHERE category_id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] ?? null;
};

/**
 * All categories assigned to one project (via the project_categories junction table).
 * @param {number} projectId - The project_id to look up.
 * @returns {Promise<Array<{category_id: number, name: string}>>} Alphabetical by name.
 */
const getCategoriesByProjectId = async (projectId) => {
    const query = `
        SELECT c.category_id, c.name
        FROM public.categories c
        JOIN public.project_categories pc ON pc.category_id = c.category_id
        WHERE pc.project_id = $1
        ORDER BY c.name ASC;
    `;
    const result = await db.query(query, [projectId]);
    return result.rows;
};

/**
 * Inserts a new category.
 * @param {string} name - The (already validated) category name.
 * @returns {Promise<{category_id: number, name: string}>} The created category.
 */
const createCategory = async (name) => {
    const query = `
        INSERT INTO public.categories (name)
        VALUES ($1)
        RETURNING category_id, name;
    `;
    const result = await db.query(query, [name]);
    return result.rows[0];
};

/**
 * Updates a category's name.
 * @param {number} id - The category_id to update.
 * @param {string} name - The (already validated) new name.
 * @returns {Promise<{category_id: number, name: string}|null>} The updated category, or null if not found.
 */
const updateCategory = async (id, name) => {
    const query = `
        UPDATE public.categories
        SET name = $1
        WHERE category_id = $2
        RETURNING category_id, name;
    `;
    const result = await db.query(query, [name, id]);
    return result.rows[0] ?? null;
};

export {
    getAllCategories,
    getCategoryDetails,
    getCategoriesByProjectId,
    createCategory,
    updateCategory
};
