import { getAllCategories, getCategoryDetails } from '../models/categories.js';
import { getProjectsByCategoryId } from '../models/projects.js';
import { parseId } from './parseId.js';

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

export { showCategoriesPage, showCategoryDetailsPage };