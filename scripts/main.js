let currentStage = {};

/**
 * Gets the z-forward normal vector
 * @param {Transform} transform
 */
function getLookVector(transform)
{
	const zNormal = vec3.fromValues(0, 0, -1);
	vec3.transformMat4(zNormal, zNormal, transform.modelMatrix);
	return zNormal;
}

/**
 * Creates and initializes the vertex and index buffers
 * @param {WebGLRenderingContext} gl
 * @returns { vertices: WebGLBuffer, indices: WebGLBuffer, certexCount: number}
 * @returns vertexBuffer id, indexBuffer id, and vertex count
 */
function createBuffers(gl, vertices, indices) {
	const vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	return { vertices: vertexBuffer, indices: indexBuffer, vertexCount: indices.length };
}

function drawInterleavedBuffer(gl, programInfo, buffers, textures, modelViewMatrix, projectionMatrix)
{
	const GL_FLOAT_BYTES = 4;

	// Tell WebGL to use our program when drawing
	gl.useProgram(programInfo.program);

	// Create the normal matrix for transforming normal positions
	const normalMatrix = mat4.create();
	mat4.invert(normalMatrix, modelViewMatrix);
	mat4.transpose(normalMatrix, normalMatrix);

	// Set the shader uniforms
	gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
	gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
	gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
	gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, ATTRIB_POS_LENGTH, gl.FLOAT, false, GL_FLOAT_BYTES * VERTEX_COMPONENTS_LENGTH, 0);
	gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, ATTRIB_TEXCOORD_LENGTH, gl.FLOAT, false, GL_FLOAT_BYTES * VERTEX_COMPONENTS_LENGTH, GL_FLOAT_BYTES * ATTRIB_POS_LENGTH);
	gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, ATTRIB_NORMAL_LENGTH, gl.FLOAT, false, GL_FLOAT_BYTES * VERTEX_COMPONENTS_LENGTH, GL_FLOAT_BYTES * (ATTRIB_POS_LENGTH + ATTRIB_TEXCOORD_LENGTH));

	gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
	gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
	gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

	// Tell WebGL which indices to use to index the vertices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

	// Tell WebGL we want to affect texture unit 0
	gl.activeTexture(gl.TEXTURE0);

	// Bind the texture to texture unit 0
	gl.bindTexture(gl.TEXTURE_2D, textures[0]);

	// Tell the shader we bound the texture to texture unit 0
	gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

	{
		const offset = 0;
		const { vertexCount } = buffers;
		const type = gl.UNSIGNED_SHORT;
		gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
	}
}

/**
 * Handles matrix initialization and all draw calls
 * @param {WebGLRenderingContext} gl
 * @param {Stage} stage
 * @param {object} programInfo
 * @param {number} texture
 */
function drawStage(gl, stage, programInfo, texture)
{
	gl.clearColor(...CLEAR_COLOR);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	// Clear the canvas before we start drawing on it
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Create a projection matrix
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const fieldOfView = Math.PI / 4;
	const zNear = 0.1;
	const zFar = 100.0;
	const projectionMatrix = mat4.create();

	// Initialize to projection matrix values
	mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

	// Tell Webgl how to pull out the positions from the position buffer into the
	// vertexposition attribute
	const viewMatrix = mat4.create();
	const cameraTransform = stage.actors.camera.transform;
	cameraTransform.initModelMatrix();
	mat4.lookAt(viewMatrix, cameraTransform.translation, getLookVector(cameraTransform), vec3.fromValues(0, 1, 0));

	const stageBuffers = createBuffers(gl, stage.vertices, stage.indices);
	drawInterleavedBuffer(gl, programInfo, stageBuffers, [texture], viewMatrix, projectionMatrix);

	stage.actors.forEach((actor) => {
		// Set the drawing position to the 'identity' point
		const modelViewMatrix = mat4.create();
		// Create the ModelView matrix
		mat4.mul(modelViewMatrix, viewMatrix, actor.transform.initModelMatrix());

		// Create buffers for vertex arrays
		const buffers = createBuffers(gl, actor.vertices, actor.indices);

		drawInterleavedBuffer(gl, programInfo, buffers, [texture], modelViewMatrix, projectionMatrix);
	});
}

// #region utilities

function isPowerOf2(value)
{
	return (value & (value - 1)) === 0;
}

function textureFromBitmap(gl, image)
{
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

	if (isPowerOf2(image.width) && isPowerOf2(image.height))
	{
		gl.generateMipmap(gl.TEXTURE_2D);
	}
	else
	{
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	}

	return texture;
}

function loadTexture(gl, url)
{
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	const level = 0;
	const internalFormat = gl.RGBA;
	const width = 1;
	const height = 1;
	const border = 0;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;
	const pixel = new Uint8Array([0, 0, 255, 255]);
	gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

	const image = new Image();
	image.onload = function onImageElementLoad()
	{
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

		// WebGL1 has different requirements for power of 2 images vs non power of 2 images so check if the image is a power of 2 in both dimensions.
		if (isPowerOf2(image.width) && isPowerOf2(image.height))
		{
			gl.generateMipmap(gl.TEXTURE_2D);
		}
		else
		{
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
	};
	image.src = `textures/${url}`;

	return texture;
}


function refreshCanvasSize(gl)
{
	// Lookup the size the browser is displaying the canvas.
	const displayWidth = window.innerWidth;
	const displayHeight = window.innerHeight;

	// Check if the canvas is not the same size.
	if (gl.canvas.width !== displayWidth
		|| gl.canvas.height !== displayHeight)
	{
		// Make the canvas the same size
		gl.canvas.width = displayWidth;
		gl.canvas.height = displayHeight;
		gl.viewport(0, 0, displayWidth, displayHeight);
	}
}

function attachInputListeners(gl)
{
	window.onresize = function onWindowResize() { refreshCanvasSize(gl); };
}

// Set indices relative to only this object's vertices, not to all vertices in the .obj file
function normalizeIndices(obj)
{
	const baseIndex = obj.indices[0];
	for (let i = 0; i < obj.indices.length; ++i)
	{
		obj.indices[i] -= baseIndex;
	}
}

/**
 * Accepts a raw string of a .obj file and parses it.
 * @param {string} filename
 * @param {string} raw
 * @returns {OBJModel[]}
 */
function loadOBJ(filename, raw)
{
	// const DEFAULT_POSITION = [0, 0, 0];
	const DEFAULT_TEXCOORD = [0, 0];
	const DEFAULT_NORMAL = [0, 1, 0];
	const indexDict = [];
	let combinedIndex = -1;
	let nextIndex = -1;
	const positions = [];
	const texCoords = [];
	const normals = [];
	let currObj = new OBJModel();

	const objs = [];

	const lines = raw.split('\n');
	for (let i = 0; i < lines.length; ++i)
	{
		const tokens = lines[i].split(' ');
		const trimmed = lines[i];

		if (trimmed.length !== 0 && !trimmed.startsWith('#'))
		{
			switch (tokens[0])
			{
				case 'o': { // Name
					// Create a new OBJModel object and set currObj as a reference to it
					if (currObj.name !== '')
					{
						normalizeIndices(currObj);
						objs.push(currObj);
					}
					currObj = new OBJModel(tokens.slice(1).join(' ').trim());
					break;
				}
				case 'v': { // Vertex Position
					const pos = [];
					tokens.slice(1).forEach((value) => {
						pos.push(parseFloat(value.trim()));
					});
					positions.push(vec3.fromValues(...pos));
					break;
				}
				case 'vn': { // Vertex Normal
					const n = [];
					tokens.slice(1).forEach((value) => {
						n.push(parseFloat(value.trim()));
					});
					normals.push(vec3.fromValues(...n));
					break;
				}
				case 'vt': { // Vertex Texture Coords
					const coords = [];
					tokens.slice(1).forEach((value) => {
						coords.push(parseFloat(value.trim()));
					});
					texCoords.push(vec2.fromValues(...coords));
					break;
				}
				case 'f': { // Face
					const faceVertices = tokens.slice(1);
					if (faceVertices.length === 3)
					{
						// Convert the tokens to floats
						/* eslint-disable-next-line no-loop-func */
						faceVertices.forEach((attribString) => {
							// Parse the indices
							const attribs = [];
							const splitAttribString = attribString.trim().split('/');
							splitAttribString.forEach((value) => {
								// Subtract 1 because WebGL indices are 0-based while objs are 1-based
								attribs.push(parseInt(value, 10) - 1);
							});

							// For each set of indexed attributes, retrieve their original values and assign each unique set an index.
							// If we've already indexed this set of attributes
							if (attribString in indexDict)
							{
								combinedIndex = indexDict[attribString]; // Get the existing index
							}
							else // Otherwise we need to index it
							{
								nextIndex++;
								indexDict[attribString] = nextIndex;
								combinedIndex = nextIndex;
								currObj.positions.push(positions[attribs[0]]);
								currObj.texCoords.push(Number.isNaN(attribs[1]) ? DEFAULT_TEXCOORD : texCoords[attribs[1]]);
								currObj.normals.push(Number.isNaN(attribs[2]) ? DEFAULT_NORMAL : normals[attribs[2]]);
							}
							currObj.indices.push(combinedIndex); // Add this index to the index array
						});
					}
					else
					{
						console.warn(`[.obj parse] ${filename}:${i}: can't load non-triangular faces (${trimmed})`);
						// TODO: Triangulate faces automatically
					}
					break;
				}
				default: {
					console.warn(`[.obj parse] ${filename}:${i}: unknown element token '${tokens[0]}'`);
					break;
				}
			}
		}
	}

	normalizeIndices(currObj);
	objs.push(currObj);

	return objs;
}

/**
 * Parses `raw` as a .obj file and stores it in the model store using the name in the model.
 * @param {string} raw
 * @returns {void}
 */
function loadOBJToModelStore(filename, raw)
{
	const objs = loadOBJ(filename, raw);
	objs.forEach((obj) => {
		modelStore[obj.name] = obj;
	});
}

function switchStage(index)
{
	currentStage = buildStage(index);
}

// #endregion

function main()
{
	const canvas = document.querySelector('#glCanvas');
	const gl = canvas.getContext('webgl');

	if (!gl)
	{
		console.error('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}

	// Make sure the canvas fills the screen
	refreshCanvasSize(gl);

	// const texture = loadTexture(gl, 'firefox.png');
	let texture = null;
	loadTextureAtlas(null, ["firefoxsmol.png", "firefox.png", "firefoxsmol.png", "firefoxsmol.png", "firefoxverysmol.png"]).then((atlasData) => {
		texture = textureFromBitmap(gl, atlasData.atlas);

		initDefaultShaderProgram(gl)
			.then((prog) => {
				const programInfo = getProgramInfo(gl, prog);

				attachInputListeners(gl);

				let lastFrameSec = 0;
				function render(timeMillis)
				{
					const timeSecs = timeMillis * 0.001; // convert to seconds
					const deltaTime = timeSecs - lastFrameSec;
					lastFrameSec = timeSecs;

					currentStage.update(deltaTime, timeSecs);
					drawStage(gl, currentStage, programInfo, texture);
					requestAnimationFrame(render);
				}

				requestAnimationFrame(render);
			});
	});
}

loadContent().then(main);
