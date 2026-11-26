import { getAllUsers, createUser } from '../models/users.js';
import { hashPassword } from '../utils/password.js';

const NAME_MAX = 100;
const EMAIL_MAX = 255;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200; // stops absurdly long passwords from tying up the hasher
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNIQUE_VIOLATION = '23505'; // PostgreSQL error code for a duplicate unique value

// Form fields can arrive as arrays or objects (extended urlencoded parsing), so anything
// that is not a string is treated as empty.
const readText = (value) => (typeof value === 'string' ? value : '');

const renderRegister = (res, status, values, errors) =>
    res.status(status).render('register', { title: 'Register', values, errors });

/**
 * Checks the registration form. The role is deliberately not read: new accounts are volunteers.
 * @param {object} body - req.body from the form.
 * @returns {{values: {name: string, email: string}, password: string, errors: Array<{field: string, message: string}>}}
 *          Cleaned values to show again on error (never the password) plus the password itself.
 */
const validateRegistration = (body) => {
    const values = {
        name: readText(body.name).trim(),
        email: readText(body.email).trim().toLowerCase()
    };
    const password = readText(body.password);
    const confirmation = readText(body.confirm_password);
    const errors = [];

    if (values.name.length === 0) errors.push({ field: 'name', message: 'Name is required.' });
    else if (values.name.length > NAME_MAX) errors.push({ field: 'name', message: `Name must be ${NAME_MAX} characters or fewer.` });

    if (values.email.length === 0) errors.push({ field: 'email', message: 'Email is required.' });
    else if (values.email.length > EMAIL_MAX) errors.push({ field: 'email', message: 'Email is too long.' });
    else if (!EMAIL_PATTERN.test(values.email)) errors.push({ field: 'email', message: 'Enter a valid email address.' });

    if (password.length < PASSWORD_MIN) errors.push({ field: 'password', message: `Password must be at least ${PASSWORD_MIN} characters.` });
    else if (password.length > PASSWORD_MAX) errors.push({ field: 'password', message: 'Password is too long.' });

    if (password !== confirmation) errors.push({ field: 'confirm_password', message: 'Passwords do not match.' });

    return { values, password, errors };
};

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

        // req.body is undefined when the request is not a urlencoded form (e.g. a script posting JSON).
        const { values, password, errors } = validateRegistration(req.body ?? {});
        if (errors.length > 0) return renderRegister(res, 400, values, errors);

        const passwordHash = await hashPassword(password);

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
