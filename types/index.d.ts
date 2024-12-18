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
	next?: () => Promise<U>
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