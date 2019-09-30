
import { modelStore } from './globals'

import OBJModel from './stage_content/objmodel'

export async function safeFetch(filepath: string): Promise<string>;
export async function safeFetch<T = object>(filepath: string, asJson: boolean): Promise<T>;

/**
 * Retrives a file from the web server. Rejects on non-Response.ok, and returns a promise to the body.
 * If asJson = true, then the function will return a Promise to a function.
 * @param {string} filepath
 * @returns {Promise<string> | Promise<object>}
 */
export async function safeFetch<T = object>(filepath: string, asJson: boolean = false): Promise<string|T>
{
	const resp = await fetch(filepath);
	if (!resp.ok)
	{
		throw new Error(`Unsuccessful fetch of resource '${filepath}'`);
	}
	if (asJson)
	{
		return resp.json();
	}
	return resp.text();
}

export function isPowerOf2(value: number): boolean
{
	return (value & (value - 1)) === 0;
}

export function textureFromBitmap(gl: WebGLRenderingContext, image: ImageBitmap): WebGLTexture
{
	const texture = gl.createTexture();
	if (!texture)
		throw new Error('Unable to create new WebGL Texture. Not enough memory?');
	
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

	if (isPowerOf2(image.width) && isPowerOf2(image.height))
	{
		gl.generateMipmap(gl.TEXTURE_2D);
	}
	else
	{
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	}

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	return texture;
}

/**
 * Parses `raw` as a .obj file and stores it in the model store using the name in the model.
 * @param {string} raw
 * @returns {void}
 */
export function loadOBJToModelStore(filename: string, raw: string): void
{
	const objs = OBJModel.fromFile(filename, raw);
	objs.forEach((obj) => {
		modelStore[obj.name] = obj;
	});
}
