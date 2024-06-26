/**
 * A module containing the Environment class.
 * @module Environment
 */

/**
 * A class for managing environment variables.
 * @class Environment
 */
export  class Environment {
	/**
	 * Load environment variables from a file.
	 * @method load
	 * @static
	 * @param {string} [path=".env"] - The path to the environment variables file.
	 * @returns {void}
	 */
	public static load(path = ".env"): void {
		for (const lines of Deno.readTextFileSync(path).split("\n")) {
			const parts = lines.split("=");
			Deno.env.set(parts[0], parts[1]);
		}
	}
}
