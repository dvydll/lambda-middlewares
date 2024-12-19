/**
 * @typedef {import('../types/index.js').AnySyncFn} AnySyncFn
 * @typedef {import('../types/index.js').AnyAsyncFn} AnyAsyncFn
 * @typedef {import('../types/index.js').MiddlewareOrHandler} MiddlewareOrHandler
 * @typedef {import('aws-lambda')} AWSLambda
 * @typedef {AWSLambda.APIGatewayEvent} APIGatewayEvent
 * @typedef {AWSLambda.Context} Context
 * @typedef {import('../types/index.js').HandlerWithMiddlewaresBuilder} HandlerWithMiddlewaresBuilder
 */

import { styleText } from 'node:util';

/**
 * Envuelve una función síncrona en una promesa.
 * @param {AnySyncFn} fn
 * @returns {AnyAsyncFn}
 */
export const ensureAsync =
	(fn) =>
	async (...args) =>
		Promise.resolve(fn(...args));

/**
 * `createMiddleware` recibe un _middleware_ y devuelve una función que acepta un _handler_.
 * Esto genera una "cadena" de ejecución entre _middleware_ y el _handler_.
 * @param {MiddlewareOrHandler} middleware
 * @param {MiddlewareOrHandler} handler
 * @returns {MiddlewareOrHandler}
 */
export const createMiddleware =
	(middleware, handler) =>
	/**
	 * Ejecuta un _middleware_ y pasa el control al siguiente en la cadena.
	 * @param {APIGatewayEvent} event
	 * @param {Context} context
	 * @returns {Promise<any>}
	 */
	async (event, context) => {
		/**
		 * Dentro de la función retornada, el _handler_ original se define como `next`.
		 * Esto permite al _middleware_ decidir cuándo invocar el _handler_ (si lo invoca).
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
 * `createHandler` recibe un _handler_ y devuelve un _builder_ con el patrón `.use`
 * para agregar _middlewares_ y ejecutarlos dinámicamente en orden.
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
	 * Almacena los _middlewares_ que se van agregando.
	 * @type {MiddlewareOrHandler[]}
	 */
	const middlewareChain = [];
	/**
	 * _Handler_ envuelto con los _middlewares_.
	 * @type {MiddlewareOrHandler}
	 */
	let composedHandler = null;

	/**
	 * Manejador final que construye dinámicamente la cadena de _middlewares_ y ejecuta el _handler_ resultante.
	 *
	 * La construcción de la cadena de _middlewares_ se realizará dinámicamente en cada invocación o una sola vez en funcion de `staticCompose`.
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
	 * Implementa patrón _builder_ para agregar _middlewares_
	 * @param {MiddlewareOrHandler} middleware
	 * @returns {HandlerWithMiddlewaresBuilder}
	 */
	const addMiddleware = (middleware) => {
		if (typeof middleware !== 'function')
			throw new TypeError('El parametro `middleware` debe ser una función.');

		if (staticCompose && composedHandler)
			throw new Error(
				'Cannot add middleware after handler has been invoked when `staticCompose` is `true`.'
			);

		middlewareChain.push(middleware);
		return finalHandler; // Permite encadenar `.use`
	};

	// Agregar el método `.use` al handler
	finalHandler.use = addMiddleware;

	return finalHandler;
};
