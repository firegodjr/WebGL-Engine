
import { safeFetch } from './utils';

export interface WebGLProgramInfo {
	program: WebGLProgram;
	attribLocations: {
		vertexPosition: number;
		textureCoord: number;
		vertexNormal: number;
	};
	uniformLocations: {
		projectionMatrix: WebGLUniformLocation | null;
		modelViewMatrix: WebGLUniformLocation | null;
		normalMatrix: WebGLUniformLocation | null;
		diffuseTex: WebGLUniformLocation | null;
		normalTex: WebGLUniformLocation | null;
	}
}

/**
 * This function accepts a promise for a string, and loads the specified shader
 * into the GL context once the promise is resolved.
 * @returns shader index
 */
function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader
{
	const shader = gl.createShader(type);
	if (!shader)
		throw new Error(`Unable to allocate new WebGLShader. Not enough memory?`);
	
	const textSource = source;

	// Send the source to the shader object we just initialized
	gl.shaderSource(shader, textSource);

	// Compile the shader program
	gl.compileShader(shader);

	// See if it compiled successfully
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
	{
		const infoLog = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`An error occurred compiling the shaders:\n${infoLog}`);
	}

	return shader;
}

/**
 * Creates a shader program
 */
export function initShaderProgram(gl: WebGLRenderingContext, vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram
{
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

	// Create the shader program
	const shaderProgram = gl.createProgram();
	if (!shaderProgram)
		throw new Error(`Unable to allocate new WebGLProgram: ${gl.getProgramInfoLog(shaderProgram)}`);

	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
	{
		throw new Error(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
	}

	return shaderProgram;
}

// Creates a shader program with default shaders
/**
 * Initializes the default shaders into the WebGLRenderingContext
 * @param {WebGLRenderingContext} gl
 * @returns {Promise<WebGLProgram>}
 */
export async function initDefaultShaderProgram(gl: WebGLRenderingContext): Promise<WebGLProgram>
{
	const vsSource = safeFetch('shaders/vertexShader.vert');
	const fsSource = safeFetch('shaders/fragmentShader.frag');
	await Promise.all([vsSource, fsSource]); // Let them wait simultaneously for better network performance
	return initShaderProgram(gl, await vsSource, await fsSource);
}

/**
 * Returns the graphic program info
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} shaderProgram
 * @return {{ program: WebGLProgram, attribLocations: {vertexPosition: number, textureCoord: number}, uniformLocations:{projectionMatrix: WebGLUniformLocation, modelViewMatrix: WebGLUniformLocation, uSampler: WebGLUniformLocation}}}
 */
export function getProgramInfo(gl: WebGLRenderingContext, shaderProgram: WebGLProgram): WebGLProgramInfo
{
	return {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
			vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
			normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
			diffuseTex: gl.getUniformLocation(shaderProgram, 'diffuseTex'),
			normalTex: gl.getUniformLocation(shaderProgram, 'normalTex')
		},
	};
}
