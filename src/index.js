/**
 * @typedef {import('../types/index.js').MiddlewareOrHandler} MiddlewareOrHandler
 * @typedef {import('aws-lambda')} AWSLambda
 * @typedef {AWSLambda.APIGatewayEvent} APIGatewayEvent
 * @typedef {AWSLambda.Context} Context
 * @typedef {import('../types/index.js').HandlerWithMiddlewaresBuilder} HandlerWithMiddlewaresBuilder
 */

import { styleText } from 'node:util';

/**
 * Envuelve una función síncrona en una promesa.
 * @template T
 * @param {<T>(...) => T} fn
 * @returns {<T>(...) => Promise<T>}
 */
export const ensureAsync =
	(fn) =>
	async (...args) =>
		Promise.resolve(fn(...args));

/**
 * `createMiddleware` recibe un middleware y devuelve una función que acepta un handler.
 * Esto genera una "cadena" de ejecución entre middleware y el handler.
 * @param {MiddlewareOrHandler} middleware
 * @param {MiddlewareOrHandler} handler
 * @returns {MiddlewareOrHandler}
 */
export const createMiddleware =
	(middleware, handler) =>
	/**
	 * Ejecuta un middleware y pasa el control al siguiente en la cadena.
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
		const next = async () => ensureAsync(handler)(event, context);

		// Ejecuta el middleware
		try {
			return await ensureAsync(middleware)(event, context, next);
		} catch (error) {
			const timestamp =
				styleText?.(['dim', 'gray'], new Date().toISOString()) ??
				new Date().toISOString();
			const errorText = styleText?.(['red'], 'ERROR') ?? 'ERROR';
			console.error(`[${timestamp}] [${errorText}]`, error);
			throw error;
		}
	};

/**
 * `createHandler` recibe un handler y devuelve un builder con el patrón `.use`
 * para agregar middlewares y ejecutarlos dinámicamente en orden.
 *
 * @param {MiddlewareOrHandler} handler
 * @param {Object} [options]
 * @param {boolean} [options.staticCompose=false] decide si se debe construir la cadena de middlewares en cada invocación o solo la primera vez que se llama a la función (por defecto `false`).
 * @returns {HandlerWithMiddlewaresBuilder}
 */
export const createHandler = (
	handler,
	{ staticCompose } = { staticCompose: false }
) => {
	/**
	 * Almacena los middlewares que se van agregando.
	 * @type {MiddlewareOrHandler[]}
	 */
	const middlewareChain = [];
	/**
	 * Handler envuelto con los middlewares.
	 * @type {MiddlewareOrHandler}
	 */
	let composedHandler = null;

	/**
	 * Manejador final que construye dinámicamente la cadena de middlewares y ejecuta el handler resultante.
	 *
	 * La construcción de la cadena de middlewares se realizará dinámicamente en cada invocación o una sola vez en funcion de `staticCompose`.
	 * @param {APIGatewayEvent} event
	 * @param {Context} context
	 * @returns {Promise<any>}
	 */
	const finalHandler = async (event, context) => {
		if (!composedHandler || !staticCompose) {
			composedHandler = middlewareChain.reduce(
				(wrappedHandler, nextMiddleware) =>
					createMiddleware(nextMiddleware, wrappedHandler),
				handler
			);
		}

		return composedHandler(event, context);
	};

	/**
	 * Implementa patrón builder para agregar middlewares
	 * @param {MiddlewareOrHandler} middleware
	 * @returns {HandlerWithMiddlewaresBuilder}
	 */
	const addMiddleware = (middleware) => {
		if (typeof middleware !== 'function')
			throw new TypeError('El parametro `middleware` debe ser una función.');

		if (staticCompose && composedHandler)
			throw new Error('Cannot add middleware after handler has been invoked.');

		middlewareChain.push(middleware);
		return finalHandler; // Permite encadenar `.use`
	};

	// Agregar el método `.use` al handler
	finalHandler.use = addMiddleware;

	return finalHandler;
};
