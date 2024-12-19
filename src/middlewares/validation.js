/**
 * @typedef {import('../../types/index.js').MiddlewareOrHandler} MiddlewareOrHandler
 * @typedef {import('zod').ZodError} ZodSchema
 */

import { ZodError } from 'zod';
import { badRequest, internalServerError } from '../net/response.js';

/**
 * _Middleware_ para validar el _payload_ de la solicitud utilizando un esquema Zod
 * @param {ZodSchema} schema
 * @returns {MiddlewareOrHandler}
 */
export const zodValidationMiddleware =
	(schema) => async (event, context, next) => {
		try {
			const { queryStringParameters, body } = event;
			let parsedBody;
			try {
				parsedBody = JSON.parse(body || '{}');
			} catch (error) {
				console.warn('[ValidationMiddleware]', error);
				parsedBody = null;
			}
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
					message: error.message || 'Invalid payload',
					details: {
						issues: error.issues.map(({ path, message }) => ({
							message,
							path,
						})),
					},
					awsRequestId: context.awsRequestId,
				});
			}
			return internalServerError({
				message: error.message || 'Unknown error',
				details: error,
				awsRequestId: context.awsRequestId,
			});
		}
	};
