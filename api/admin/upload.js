import { handleUpload } from '@vercel/blob/client';
import { requireAdmin } from '../../server/auth.js';
import { ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES } from '../../server/assets.js';
import { allowMethods, assertSameOrigin, handleError, json, readJson } from '../../server/http.js';

/**
 * Issues a short-lived token so the browser can upload straight to Vercel Blob.
 * Going direct keeps the file out of the function, which has a 4.5MB request
 * limit that a camera photo clears easily.
 */
export default async function handler(req, res) {
  try {
    allowMethods(req, ['POST']);
    assertSameOrigin(req);
    const body = await readJson(req);
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        // Runs before any token is minted, so an anonymous caller can never
        // obtain upload credentials for the store.
        await requireAdmin(req);
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
      },
      // The blob row is registered by the browser through /api/admin/assets once
      // the upload resolves. Vercel calls onUploadCompleted from its own
      // network, which cannot reach a protected preview or localhost, so it is
      // deliberately not the source of truth here.
      onUploadCompleted: async () => {},
    });
    return json(res, 200, result);
  } catch (error) {
    return handleError(res, error);
  }
}
