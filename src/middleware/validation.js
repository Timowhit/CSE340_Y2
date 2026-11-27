import { body, matchedData, validationResult } from 'express-validator';

// Server-side validation for every form. Each exported `validate...` value is an array of
// express-validator chains, used as route middleware:
//     router.post('/login', loginLimiter, validateLogin, processLogin);
// The chains only record problems; the controller then calls collectForm(req, fields) and
// decides which view to re-render. Browser attributes like `required` and `maxlength` are a
// convenience, never the real check: anyone can send a POST without using the form.

const NAME_MAX = 100;
const EMAIL_MAX = 255;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200; // stops absurdly long passwords from tying up the hasher
const ORG_NAME_MIN = 3;
const ORG_NAME_MAX = 150;
const ORG_DESCRIPTION_MAX = 1000;
const LOGO_MAX = 255;
const PROJECT_TITLE_MIN = 3;
const PROJECT_TITLE_MAX = 150;
const PROJECT_DESCRIPTION_MAX = 2000;
const LOCATION_MAX = 200;
const CATEGORY_NAME_MIN = 3;
const CATEGORY_NAME_MAX = 100;
const YEAR_MIN = 1900; // keeps dates inside what PostgreSQL and the date picker handle sanely
const YEAR_MAX = 2100;
const MAX_ID = 2147483647; // largest value of a PostgreSQL INTEGER column

// A bare file name (no slashes), because it is used as /images/<logo_filename>.
const LOGO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|gif|svg|webp)$/i;

/**
 * A required, trimmed text field with a length range.
 * isString() runs first because extended urlencoded parsing turns repeated or bracketed
 * fields (name[]=a&name[]=b) into arrays and objects; those count as missing, not as text.
 * `.bail()` stops the chain at the first failure so each field reports one clear message.
 * @param {string} field - Name of the form field.
 * @param {string} label - Human-readable name used in error messages.
 * @param {{min?: number, max: number, lowercase?: boolean}} options
 */
const requiredText = (field, label, { min = 1, max, lowercase = false }) => {
    const chain = body(field)
        .isString().withMessage(`${label} is required.`).bail()
        .trim();

    if (lowercase) chain.toLowerCase();

    chain.notEmpty().withMessage(`${label} is required.`).bail();

    if (min > 1) {
        chain.isLength({ min }).withMessage(`${label} must be at least ${min} characters.`).bail();
    }

    return chain.isLength({ max }).withMessage(`${label} must be ${max} characters or fewer.`);
};

/** A required, trimmed email field. Pass `lowercase` for login and registration emails. */
const requiredEmail = (field, label, options = {}) =>
    requiredText(field, label, { max: EMAIL_MAX, ...options })
        .bail()
        .isEmail().withMessage('Enter a valid email address, like name@example.org.');

// Passwords are never trimmed: leading and trailing spaces are part of the password.
const passwordField = (field) =>
    body(field)
        .isString().withMessage('Password is required.').bail()
        .notEmpty().withMessage('Password is required.').bail();

const validateLogin = [
    requiredEmail('email', 'Email', { lowercase: true }),
    passwordField('password')
        .isLength({ max: PASSWORD_MAX }).withMessage('Password is too long.')
];

// The role is deliberately not validated or read: new accounts are always volunteers.
const validateRegistration = [
    requiredText('name', 'Name', { max: NAME_MAX }),
    requiredEmail('email', 'Email', { lowercase: true }),
    passwordField('password')
        .isLength({ min: PASSWORD_MIN }).withMessage(`Password must be at least ${PASSWORD_MIN} characters.`).bail()
        .isLength({ max: PASSWORD_MAX }).withMessage('Password is too long.'),
    body('confirm_password')
        .custom((value, { req }) => value === req.body?.password)
        .withMessage('Passwords do not match.')
];

const validateOrganization = [
    requiredText('name', 'Organization name', { min: ORG_NAME_MIN, max: ORG_NAME_MAX }),
    requiredText('description', 'Description', { max: ORG_DESCRIPTION_MAX }),
    requiredEmail('contact_email', 'Contact email'),
    requiredText('logo_filename', 'Logo file name', { max: LOGO_MAX })
        .bail()
        .matches(LOGO_PATTERN)
        .withMessage('Logo file name must be a plain image file name ending in .png, .jpg, .jpeg, .gif, .svg or .webp.')
];

const validateProject = [
    requiredText('title', 'Project title', { min: PROJECT_TITLE_MIN, max: PROJECT_TITLE_MAX }),
    requiredText('description', 'Description', { max: PROJECT_DESCRIPTION_MAX }),
    requiredText('location', 'Location', { max: LOCATION_MAX }),
    requiredText('project_date', 'Project date', { max: 10 })
        .bail()
        .isDate({ format: 'YYYY-MM-DD', strictMode: true })
        .withMessage(`Enter a real date between ${YEAR_MIN} and ${YEAR_MAX} (YYYY-MM-DD).`)
        .bail()
        .custom((value) => {
            const year = Number(value.slice(0, 4));
            return year >= YEAR_MIN && year <= YEAR_MAX;
        })
        .withMessage(`Enter a real date between ${YEAR_MIN} and ${YEAR_MAX} (YYYY-MM-DD).`),
    body('organization_id')
        .isString().withMessage('Choose an organization.').bail()
        .trim()
        .isInt({ min: 1, max: MAX_ID }).withMessage('Choose an organization.')
];

const validateCategory = [
    requiredText('name', 'Category name', { min: CATEGORY_NAME_MIN, max: CATEGORY_NAME_MAX })
];

/**
 * Reads the outcome of the validation chains that ran before the controller.
 * @param {import('express').Request} req
 * @param {string[]} fields - Fields to hand back so the form can show them again. Leave out
 *        passwords: they must never be sent back to the browser.
 * @returns {{
 *   values: Object<string, string>,
 *   data: Object,
 *   errors: Array<{field: string, message: string}>
 * }} `values` are the trimmed fields (even invalid ones) for re-rendering the form;
 *    `data` holds only fields that passed validation; `errors` has at most one message per field.
 */
const collectForm = (req, fields) => {
    const cleaned = matchedData(req, { locations: ['body'], onlyValidData: false });
    const values = Object.fromEntries(
        fields.map((field) => [field, typeof cleaned[field] === 'string' ? cleaned[field] : ''])
    );
    const data = matchedData(req, { locations: ['body'] });
    const errors = validationResult(req)
        .array({ onlyFirstError: true })
        .map((error) => ({ field: error.path, message: error.msg }));

    return { values, data, errors };
};

export {
    validateLogin,
    validateRegistration,
    validateOrganization,
    validateProject,
    validateCategory,
    collectForm
};
