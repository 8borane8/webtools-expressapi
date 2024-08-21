/**
 * Enum representing the HTTP methods supported by the server.
 * @module HttpMethods
 */

/**
 * @enum {string} HttpMethods - Enum representing the HTTP methods supported by the server.
 * @property {string} GET - The HTTP GET method.
 * @property {string} POST - The HTTP POST method.
 * @property {string} PUT - The HTTP PUT method.
 * @property {string} PATCH - The HTTP PATCH method.
 * @property {string} DELETE - The HTTP DELETE method.
 */
export enum HttpMethods {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	PATCH = "PATCH",
	DELETE = "DELETE",
}
