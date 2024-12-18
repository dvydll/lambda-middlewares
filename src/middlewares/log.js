/**
 * @typedef {import('../../types/index.js').MiddlewareOrHandler} MiddlewareOrHandler
 */

/**
 *
 * @param {Parameters<MiddlewareOrHandler>[0]} event
 * @param {Parameters<MiddlewareOrHandler>[1]} context
 * @param {Parameters<MiddlewareOrHandler>[2]} next
 * @returns
 */
export const logMiddleware = async (event, context, next) => {
	const { httpMethod, path, body, queryStringParameters } = event;
	const { functionName, awsRequestId } = context;
	const logMessage = `[${httpMethod}] [${path}] [${new Date().toISOString()}] [${awsRequestId}]`;

	let parsedBody;
	try {
		parsedBody = body ? JSON.parse(body) : null;
	} catch (e) {
		console.error('Error parsing body:', e);
		parsedBody = null;
	}

	console.log(`[LogMiddleware: ${functionName}] ${logMessage}`, {
		body: parsedBody,
		queryStringParameters,
	});
	const result = await next();
	console.log(`[LogMiddleware: ${functionName}] ${logMessage}`, { result });
	return result;
};
