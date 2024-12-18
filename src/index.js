/**
 * @typedef {import('../types/index.js').MiddlewareOrHandler} MiddlewareOrHandler
 * @typedef {import('zod').ZodSchema} ZodSchema
 * @typedef {import('aws-lambda')} AWSLambda
 * @typedef {AWSLambda.APIGatewayEvent} APIGatewayEvent
 * @typedef {AWSLambda.Context} Context
 * @typedef {import('../types/index.js').HandlerWithMiddlewaresBuilder} HandlerWithMiddlewaresBuilder
 */

/**
 * `createMiddleware` recibe un middleware y devuelve una función que acepta un handler.
 * Esto genera una "cadena" de ejecución entre middleware y el handler.
 * @param {MiddlewareOrHandler} middleware
 * @returns {(handler: MiddlewareOrHandler) => (event: APIGatewayEvent, context: Context) => Promise<any>}
 */
const createMiddleware =
	(middleware) =>
	/**
	 *
	 * @param {MiddlewareOrHandler} handler
	 * @returns {MiddlewareOrHandler}
	 */
	(handler) =>
	/**
	 *
	 * @param {APIGatewayEvent} event
	 * @param {Context} context
	 * @returns {Promise<any>}
	 */
	async (event, context) => {
		/**
		 * Dentro de la función retornada, el handler original se define como next.
		 * Esto permite al middleware decidir cuándo invocar el handler (si lo invoca).
		 * @returns
		 */
		const next = async () => handler(event, context);

		// Ejecuta el middleware
		return middleware(event, context, next);
	};

/**
 * `createHandler` recibe un handler y devuelve un builder con el patrón `.use`
 * para agregar middlewares y ejecutarlos dinámicamente en orden.
 * @param {MiddlewareOrHandler} handler
 * @returns {HandlerWithMiddlewaresBuilder}
 */
export const createHandler = (handler) => {
	const middlewares = [];

	/**
	 * Manejador final que construye dinámicamente la cadena de middlewares
	 * y ejecuta el handler.
	 * @param {APIGatewayEvent} event
	 * @param {Context} context
	 * @returns {Promise<any>}
	 */
	const finalHandler = async (event, context) => {
		// Construir la cadena de middlewares dinámicamente en cada invocación
		const composedHandler = middlewares.reduce(
			(wrapped, middleware) => createMiddleware(middleware)(wrapped),
			handler
		);

		return composedHandler(event, context);
	};

	/**
	 * Implementa patrón builder para agregar middlewares
	 * @param {MiddlewareOrHandler} middleware
	 * @returns {HandlerWithMiddlewaresBuilder}
	 */
	const addMiddleware = (middleware) => {
		middlewares.push(middleware);
		return finalHandler; // Permite encadenar `.use`
	};

	// Agregar el método `.use` al handler
	finalHandler.use = addMiddleware;

	return finalHandler;
};

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
