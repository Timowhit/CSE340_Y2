/**
 * Parses a route id. Returns null unless it is a positive 32-bit integer,
 * which keeps bad input from ever reaching Postgres.
 */
const parseId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id >= 1 && id <= 2147483647 ? id : null;
};

export { parseId };