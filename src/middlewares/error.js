/**
 * @typedef {import('../../types/index.js').MiddlewareOrHandler} MiddlewareOrHandler
 */

import { internalServerError } from '../net/response.js';

/**
 * Middleware para manejar errores y devolver una respuesta adecuada
 * @param {MiddlewareOrHandler} handler
 * @returns {MiddlewareOrHandler}
 */
export const errorMiddleware = (handler) => async (event, context, next) => {
	try {
		return await handler(event, context, next);
	} catch (error) {
		console.error('[ErrorMiddleware]', error);
		return internalServerError({
			errors: [{ path: 'unknown', message: error.message || 'Unknown error' }],
			awsRequestId: context.awsRequestId,
		});
	}
};
