import db from './db.js'

const getAllOrganizations = async() => {
    const query = `
        SELECT organization_id, name, description, contact_email, logo_filename
        FROM public.organization
        ORDER BY name;
    `;

    const result = await db.query(query);

    return result.rows;
}

/**
 * Retrieves one organization by id.
 * @param {number} id - organization_id
 * @returns {Promise<Object|null>} { organization_id, name, description, contact_email, logo_filename } or null
 */
const getOrganizationDetails = async (id) => {
    const query = `
        SELECT organization_id, name, description, contact_email, logo_filename
        FROM organization
        WHERE organization_id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] ?? null;
};

/**
 * Inserts a new organization.
 * @param {{name: string, description: string, contact_email: string, logo_filename: string}} values - Already validated.
 * @returns {Promise<{organization_id: number, name: string}>} The created organization.
 */
const createOrganization = async ({ name, description, contact_email, logo_filename }) => {
    const query = `
        INSERT INTO organization (name, description, contact_email, logo_filename)
        VALUES ($1, $2, $3, $4)
        RETURNING organization_id, name;
    `;
    const result = await db.query(query, [name, description, contact_email, logo_filename]);
    return result.rows[0];
};

/**
 * Updates an organization.
 * @param {number} id - The organization_id to update.
 * @param {{name: string, description: string, contact_email: string, logo_filename: string}} values - Already validated.
 * @returns {Promise<{organization_id: number, name: string}|null>} The updated organization, or null if not found.
 */
const updateOrganization = async (id, { name, description, contact_email, logo_filename }) => {
    const query = `
        UPDATE organization
        SET name = $1, description = $2, contact_email = $3, logo_filename = $4
        WHERE organization_id = $5
        RETURNING organization_id, name;
    `;
    const result = await db.query(query, [name, description, contact_email, logo_filename, id]);
    return result.rows[0] ?? null;
};

export {
    getAllOrganizations,
    getOrganizationDetails,
    createOrganization,
    updateOrganization
};