import { AUTH_ROUTES } from '../../server/authRoutes.js';
import { handleError, HttpError, text } from '../../server/http.js';

export default async function handler(req, res) {
  try {
    const route = AUTH_ROUTES[text(req.query.action, 40)];
    if (!route) throw new HttpError(404, 'Unknown account route.');
    return await route(req, res);
  } catch (error) {
    // signup reports a unique-violation race as a friendly conflict.
    if (error.code === '23505') {
      return handleError(res, new HttpError(409, 'An account already exists for this email address.'));
    }
    return handleError(res, error);
  }
}
