import { getAllUsers, createUser } from '../models/users.js';
import { hashPassword } from '../utils/password.js';
import { collectForm } from '../middleware/validation.js';

const UNIQUE_VIOLATION = '23505'; // PostgreSQL error code for a duplicate unique value

const renderRegister = (res, status, values, errors) =>
    res.status(status).render('register', { title: 'Register', values, errors });

const showDashboard = (req, res) => {
    const { name, email } = req.session.user;
    res.render('dashboard', { title: 'Dashboard', name, email });
};

const showUsersPage = async (req, res, next) => {
    try {
        const users = await getAllUsers();
        res.render('users', { title: 'Registered Users', users });
    } catch (err) {
        next(err);
    }
};

const showRegisterForm = (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    renderRegister(res, 200, { name: '', email: '' }, []);
};

const processRegister = async (req, res, next) => {
    try {
        if (req.session.user) return res.redirect('/dashboard');

        // The rules live in validateRegistration (src/middleware/validation.js). The role is
        // deliberately not read: new accounts are volunteers.
        const { values, data, errors } = collectForm(req, ['name', 'email']);
        if (errors.length > 0) return renderRegister(res, 400, values, errors);

        const passwordHash = await hashPassword(data.password);

        try {
            await createUser({ name: values.name, email: values.email, passwordHash });
        } catch (err) {
            // The email column is UNIQUE, so the database is the final judge even if two
            // people register the same address at the same moment.
            if (err.code !== UNIQUE_VIOLATION) throw err;
            return renderRegister(res, 409, values, [{ field: 'email', message: 'That email is already registered.' }]);
        }

        // A page remembered from an earlier blocked visit (e.g. an admin page) must not follow
        // a brand-new volunteer into their first login.
        delete req.session.returnTo;
        req.session.flash = 'Account created. Please log in.';
        res.redirect('/login');
    } catch (err) {
        next(err);
    }
};

export { showDashboard, showUsersPage, showRegisterForm, processRegister };
