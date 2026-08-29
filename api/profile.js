import { publicUser, requireUser } from '../server/auth.js';
import { db } from '../server/db.js';
import { allowMethods, assertSameOrigin, handleError, HttpError, json, readJson, text } from '../server/http.js';
import { canonicalNigeriaState } from '../src/data/delivery.js';

export default async function handler(req, res) {
  try {
    allowMethods(req, ['PUT']);
    assertSameOrigin(req);
    const user = await requireUser(req);
    const body = await readJson(req);
    const firstName = text(body.firstName, 80);
    const lastName = text(body.lastName, 80);
    const phone = text(body.phone, 40);
    if (!firstName || !lastName || !phone) throw new HttpError(400, 'Name and phone number are required.');
    const state = text(body.state, 100);
    const canonicalState = state ? canonicalNigeriaState(state) : null;
    if (state && !canonicalState) throw new HttpError(400, 'Choose a valid Nigerian state or FCT.');
    const [updated] = await db()`
      UPDATE users SET
        first_name = ${firstName}, last_name = ${lastName}, phone = ${phone},
        address_line1 = ${text(body.addressLine1, 240) || null},
        address_line2 = ${text(body.addressLine2, 240) || null},
        city = ${text(body.city, 100) || null}, state = ${canonicalState},
        landmark = ${text(body.landmark, 240) || null}, updated_at = NOW()
      WHERE id = ${user.id}
      RETURNING id, email, role, first_name, last_name, phone, address_line1,
                address_line2, city, state, landmark
    `;
    return json(res, 200, { user: publicUser(updated) });
  } catch (error) {
    return handleError(res, error);
  }
}
