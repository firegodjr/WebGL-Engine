// Vertex shader program
// Fragment shader program

// Requests and returns a fully compiled shader object
/**
 * This function accepts a promise for a string, and loads the specified shader into the GL context once the promise is resolved.
 * @param {WebGLRenderingContext} gl
 * @param {number} type
 * @param {Promise<string>} source
 * @returns {Promise<WebGLShader>} The compiled shader
 */
async function loadShader(gl, type, source)
{
	const shader = gl.createShader(type);
	const textSource = await source;

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
 * @param {WebGLRenderingContext} gl
 * @param {Promise<string>} vertexShaderSource
 * @param {Promise<string>} fragmentShaderSource
 * @returns {Promise<WebGLProgram>} The initialized shader program.
 */
async function initShaderProgram(gl, vertexShaderSource, fragmentShaderSource)
{
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

	// Create the shader program
	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, await vertexShader);
	gl.attachShader(shaderProgram, await fragmentShader);
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
async function initDefaultShaderProgram(gl)
{
	const vsSource = fetch('shaders/vertexShader.vert').then((v) => { // eslint-disable-line brace-style
		if (v.ok)
		{
			return v.text();
		}
		throw new Error('Unsuccessful fetch request.');
	});
	const fsSource = fetch('shaders/fragmentShader.frag').then((v) => { // eslint-disable-line brace-style
		if (v.ok)
		{
			return v.text();
		}
		throw new Error('Unsuccessful fetch request.');
	});
	return initShaderProgram(gl, vsSource, fsSource);
}

/**
 * Returns the graphic program info
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} shaderProgram
 * @return {{ program: WebGLProgram, attribLocations: {vertexPosition: number, textureCoord: number}, uniformLocations:{projectionMatrix: WebGLUniformLocation, modelViewMatrix: WebGLUniformLocation, uSampler: WebGLUniformLocation}}}
 */
function getProgramInfo(gl, shaderProgram)
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
			uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
		},
	};
}
