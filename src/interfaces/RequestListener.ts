/**
 * Le type RequestListener représente la signature d'une fonction qui gère une requête HTTP entrante.
 * @module RequestListener
 */

import type { HttpResponse } from "./HttpResponse.ts";
import type { HttpRequest } from "./HttpRequest.ts";

/**
 * Le type RequestListener représente la signature d'une fonction qui gère une requête HTTP entrante.
 * @param {HttpRequest} req - L'objet HttpRequest représentant la requête entrante.
 * @param {HttpResponse} res - L'objet HttpResponse permettant de définir la réponse HTTP à envoyer.
 * @returns {Promise<Response | void> | Response | void} Une promesse résolue avec la réponse HTTP à envoyer, ou rien si la réponse a déjà été envoyée.
 */
export type RequestListener = (req: HttpRequest, res: HttpResponse) => Promise<Response | void> | Response | void;
