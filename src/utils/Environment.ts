/**
 * A module containing the Environment class.
 * @module Environment
 */

/**
 * A class for managing environment variables.
 * @class Environment
 */
export class Environment {
	/**
	 * Load environment variables from a file.
	 * @method load
	 * @static
	 * @param {string} [path=".env"] - The path to the environment variables file.
	 * @returns {void}
	 */
	public static load(path: string = ".env"): void {
		for (const rawLine of Deno.readTextFileSync(path).split("\n")) {
			const line = rawLine.replace("\r", "");

			const parts = line.split("=");
			if (parts.length != 2) {
				continue;
			}

			Deno.env.set(parts[0], parts[1]);
		}
	}
}
