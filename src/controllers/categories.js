import {
    getAllCategories,
    getCategoryDetails,
    createCategory,
    updateCategory
} from '../models/categories.js';
import { getProjectsByCategoryId } from '../models/projects.js';
import { parseId } from './parseId.js';

const NAME_MIN = 3;
const NAME_MAX = 100;
const UNIQUE_VIOLATION = '23505'; // PostgreSQL error code

/**
 * Trims and validates a category name (server-side rules).
 * @param {unknown} rawName - Value from req.body.name.
 * @returns {{name: string, errors: string[]}}
 */
const validateCategoryName = (rawName) => {
    // Non-strings (e.g. repeated form fields parsed as arrays) count as missing
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    const errors = [];

    if (name.length === 0) {
        errors.push('Category name is required.');
    } else {
        if (name.length < NAME_MIN) {
            errors.push(`Category name must be at least ${NAME_MIN} characters.`);
        }
        if (name.length > NAME_MAX) {
            errors.push(`Category name must be ${NAME_MAX} characters or fewer.`);
        }
    }

    return { name, errors };
};

const showCategoriesPage = async (req, res, next) => {
    try {
        const categories = await getAllCategories();
        res.render('categories', { title: 'Categories', categories });
    } catch (err) {
        next(err);
    }
};

const showCategoryDetailsPage = async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (id === null) return next();

        const category = await getCategoryDetails(id);
        if (!category) return next();

        const projects = await getProjectsByCategoryId(id);
        res.render('category', { title: category.name, category, projects });
    } catch (err) {
        next(err);
    }
};

const showNewCategoryForm = (req, res) => {
    res.render('new-category', {
        title: 'New Category',
        formAction: '/new-category',
        submitLabel: 'Create Category',
        name: '',
        errors: []
    });
};

const processNewCategory = async (req, res, next) => {
    const { name, errors } = validateCategoryName(req.body?.name);

    const renderWithErrors = () => res.status(400).render('new-category', {
        title: 'New Category',
        formAction: '/new-category',
        submitLabel: 'Create Category',
        name,
        errors
    });

    if (errors.length > 0) {
        return renderWithErrors();
    }

    try {
        await createCategory(name);
        res.redirect('/categories');
    } catch (err) {
        if (err.code === UNIQUE_VIOLATION) {
            errors.push('A category with that name already exists.');
            return renderWithErrors();
        }
        next(err);
    }
};

const showEditCategoryForm = async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        const category = id === null ? null : await getCategoryDetails(id);

        // Calling next() with no error falls through to the 404 handler
        if (!category) return next();

        res.render('edit-category', {
            title: 'Edit Category',
            formAction: `/edit-category/${category.category_id}`,
            submitLabel: 'Save Changes',
            name: category.name,
            errors: []
        });
    } catch (err) {
        next(err);
    }
};

const processEditCategory = async (req, res, next) => {
    const id = parseId(req.params.id);
    if (id === null) return next();

    const { name, errors } = validateCategoryName(req.body?.name);

    const renderWithErrors = () => res.status(400).render('edit-category', {
        title: 'Edit Category',
        formAction: `/edit-category/${id}`,
        submitLabel: 'Save Changes',
        name,
        errors
    });

    if (errors.length > 0) {
        return renderWithErrors();
    }

    try {
        const updated = await updateCategory(id, name);
        if (!updated) return next(); // category no longer exists -> 404
        res.redirect('/categories');
    } catch (err) {
        if (err.code === UNIQUE_VIOLATION) {
            errors.push('A category with that name already exists.');
            return renderWithErrors();
        }
        next(err);
    }
};

export {
    showCategoriesPage,
    showCategoryDetailsPage,
    showNewCategoryForm,
    processNewCategory,
    showEditCategoryForm,
    processEditCategory
};