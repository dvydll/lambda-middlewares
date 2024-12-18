/**
 * @typedef {import('../../types/index.js').MiddlewareOrHandler} MiddlewareOrHandler
 * @typedef {import('zod').ZodError} ZodSchema
 */

import { ZodError } from 'zod';
import { badRequest, internalServerError } from '../net/response.js';

/**
 * Middleware para validar el payload de la solicitud utilizando un esquema Zod
 * @param {ZodSchema} schema
 * @returns {MiddlewareOrHandler}
 */
export const zodValidationMiddleware =
	(schema) => async (event, context, next) => {
		try {
			const { queryStringParameters, body } = event;
			const parsedBody = body && JSON.parse(body);
			const validatedPayload = schema.parse({
				...(body && { body: parsedBody }),
				...(queryStringParameters && { queryStringParameters }),
			});
			event.body = validatedPayload.body;
			event.queryStringParameters = validatedPayload.queryStringParameters;
			return await next();
		} catch (error) {
			console.error('[ValidationMiddleware]', error);
			if (error instanceof ZodError) {
				return badRequest({
					errors: error.issues.map(({ path, message }) => ({ path, message })),
					awsRequestId: context.awsRequestId,
				});
			}
			return internalServerError({
				errors: [
					{ path: 'unknown', message: error.message || 'Unknown error' },
				],
				awsRequestId: context.awsRequestId,
			});
		}
	};
