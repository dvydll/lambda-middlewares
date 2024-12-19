/**
 * Tipo para middlewares y handlers.
 *
 * - `T` es el tipo de resultado esperado (valor devuelto).
 * - `U` es el tipo devuelto por la llamada a `next` (si el middleware lo requiere).
 * - Los handlers no usan `next`, mientras que los middlewares sí.
 */
export type MiddlewareOrHandler<T = unknown, U = unknown> = (
	event: import('aws-lambda').APIGatewayProxyEvent,
	context: import('aws-lambda').Context,
	next?: () => U
) => Promise<T>;

/**
 * Tipo que extiende un handler con la capacidad de agregar middlewares
 * usando el patrón builder mediante el método `.use`.
 */
export type HandlerWithMiddlewaresBuilder<
	T = unknown,
	U = unknown
> = MiddlewareOrHandler<T, U> & {
	use: (
		middleware: MiddlewareOrHandler<any, any>
	) => HandlerWithMiddlewaresBuilder<T, U>;
};

/**
 * Una función síncrona cualquiera.
 */
export declare type AnySyncFn<T = unknown> = (...args: any[]) => T;

/**
 * Una función asíncrona cualquiera.
 */
export declare type AnyAsyncFn<T = unknown> = (...args: any[]) => Promise<T>;

/**
 * Envuelve una función síncrona cualquiera en una promesa para convertirla en asíncrona.
 */
export declare type EnsureAsyncFn<T = unknown> = (
	syncFn: AnySyncFn<T>
) => AnyAsyncFn<T>;
