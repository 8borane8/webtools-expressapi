/**
 * Interface pour définir une route.
 * @module Route
 */

import type { RequestListener } from "./RequestListener.ts";
import type { HttpMethods } from "./HttpMethods.ts";

/**
 * Interface pour définir une route.
 * @interface Route
 * @property {string} url - L'URL de la route.
 * @property {HttpMethods} method - La méthode HTTP de la route.
 * @property {RequestListener[]} middlewares - Les middlewares à appliquer à la route.
 * @property {RequestListener} requestListener - Le listener à appeler lorsque la route est appelée.
 */
export interface Route {
	url: string;
	method: HttpMethods;
	middlewares: RequestListener[];
	requestListener: RequestListener;
}
