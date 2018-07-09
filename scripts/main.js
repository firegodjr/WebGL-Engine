const CLEAR_COLOR = vec4.fromValues(0.3, 0.3, 0.9, 1.0);
const DEFAULT_MODEL_NAME = 'Cube';
const squareRotation = [0.0, 0.0, 0.0];
const modelStore = [];
const getCurrentModel = () => document.getElementById('modelSelect').value;

// #region mainloop

// #region Objects/Classes

// Stores all data for a given stage, or worldspace
function Stage(name, actors)
{
  this.name = name || "";
  this.actors = actors || [];

  this.getVertices = function()
  {

  }
}

// Stores data relating to the position, rotation and scale of an actor in a stage
function Transform(translation, rotation, scale)
{
  this.translation = translation || new vec3();
  this.rotation = rotation || new quat4();
  this.scale = scale || new vec3();
  this.modelMatrix = mat4.create();

  this.getModelMatrix = function()
  {
    mat4.fromRotationTranslationScale(modelMatrix, this.rotation, this.translation, this.scale)
    return modelMatrix;
  }
}

function StageActor(name, modelName)
{
  this.name = name || "";
  this.modelName = modelName || DEFAULT_MODEL_NAME;
  this.transform = new Transform();

  // Returns the vertices of this actor's model, transformed by the actor's translation, rotation and scale
  this.getVertices = function()
  {
    return modelStore[this.modelName].getVertices(this.transform.modelMatrix);
  }
}

function OBJModel(name, positions, texCoords, normals, indices)
{
  this.name = name || "";
  this.positions = positions || [];
  this.texCoords = texCoords || [];
  this.normals = normals || [];
  this.indices = indices || [];

  // Returns the vertices of this model, optionally transformed by the given model matrix
  this.getVertices = function(modelMatrix)
  {
    let vertices = [];
    modelMatrix = modelMatrix || mat4.create();

    for(let i = 0; i < this.positions.length; ++i)
    {
      let transformedPosition = vec3.create();
      vec3.transformMat4(transformedPosition, this.positions[i], modelMatrix);
      vertices.push(
        ...transformedPosition, 
        ...this.texCoords[i],
        ...this.normals[i]);
    }

    return vertices;
  }
}

// #endregion Objects/Classes

function initBuffers(gl)
{
	const vertices = modelStore[getCurrentModel()].getVertices();
	const vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	const { indices } = modelStore[getCurrentModel()];
	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	return { vertices: vertexBuffer, indices: indexBuffer, vertexCount: indices.length };
}

function drawScene(gl, programInfo, texture)
{
	if (modelStore[getCurrentModel()] === undefined) return;

	gl.clearColor(...CLEAR_COLOR);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	const buffers = initBuffers(gl);

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

	// Set the drawing position to the "identity" point
	const modelViewMatrix = mat4.create();
	mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, -3.0, -20.0]);
	mat4.rotateX(modelViewMatrix, modelViewMatrix, squareRotation[0]);
	mat4.rotateY(modelViewMatrix, modelViewMatrix, squareRotation[1]);

	const GL_FLOAT_BYTES = 4;
	// Tell Webgl how to pull out the positions from the position buffer into the
	// vertexposition attribute
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
		gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, GL_FLOAT_BYTES * 8, 0);
		gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, GL_FLOAT_BYTES * 8, GL_FLOAT_BYTES * 3);

		gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
		gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
	}

	// Tell WebGL to use our program when drawing
	gl.useProgram(programInfo.program);

	// Set the shader uniforms
	gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
	gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

	// Tell WebGL which indices to use to index the vertices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

	// Tell WebGL we want to affect texture unit 0
	gl.activeTexture(gl.TEXTURE0);

	// Bind the texture to texture unit 0
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Tell the shader we bound the texture to texture unit 0
	gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

	{
		const offset = 0;
		const vertexCount = buffers.vertexCount;
		const type = gl.UNSIGNED_SHORT;
		gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
	}
}


// #endregion

// #region utilities

function isPowerOf2(value)
{
	return (value & (value - 1)) === 0;
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
	const canvas = gl.canvas;
	// Lookup the size the browser is displaying the canvas.
	const displayWidth = window.innerWidth;
	const displayHeight = window.innerHeight;

	// Check if the canvas is not the same size.
	if (canvas.width !== displayWidth
	 || canvas.height !== displayHeight)
	{
		// Make the canvas the same size
		canvas.width = displayWidth;
		canvas.height = displayHeight;
		gl.viewport(0, 0, displayWidth, displayHeight);
	}
}

function attachInputListeners(gl)
{
	window.onresize = function onWindowResize() { refreshCanvasSize(gl); };
}

function requestContent(filepath, callback)
{
	const request = new XMLHttpRequest();
	request.onreadystatechange = () => {
		if (request.readyState === 4)
		{
			if (request.status === 0 || request.status === 200)
			{ callback(request.responseText); }
		}
	};

	request.open('GET', filepath, true);
	request.send();
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

function loadOBJ(raw)
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

		if (!lines[i].trim().startsWith('#'))
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
					currObj = new OBJModel();
					currObj.name = tokens.slice(1).join(' ').trim();
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
					if (faceVertices.length === 3) {
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
							if (attribString in indexDict) {
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
						console.warn(`Model '${currObj.name}' could not be loaded because it contains non-triangular faces.`);
						// TODO: Triangulate faces automatically
					}
					break;
				}
				default: {
					console.warn(`Unable to parse .obj file: unknown element token '${tokens[0]}'`);
					break;
				}
			}
		}
	}

	normalizeIndices(currObj);
	objs.push(currObj);

	return objs;
}

function loadOBJToModelStore(raw)
{
	const objs = loadOBJ(raw);
	objs.forEach((obj) => {
		modelStore[obj.name] = obj;
	});
}

// #endregion

function main()
{
	const canvas = document.querySelector('#glCanvas');
	const gl = canvas.getContext('webgl');

	if (!gl)
	{
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}

	// Load a model into memory
	requestContent('models/barrel_ornate.obj', loadOBJToModelStore);
	requestContent('models/cube.obj', loadOBJToModelStore);

	const shaderProgram = initDefaultShaderProgram(gl);
	const programInfo = getProgramInfo(gl, shaderProgram);
	const texture = loadTexture(gl, 'firefox.png');

	attachInputListeners(gl);
	refreshCanvasSize(gl);

	let lastFrameSec = 0;
	function render(timeMillis)
	{
		const timeSecs = timeMillis * 0.001; // convert to seconds
		const deltaTime = timeSecs - lastFrameSec;
		lastFrameSec = timeSecs;

		drawScene(gl, programInfo, texture);
		// squareRotation[0] += deltaTime;
		squareRotation[1] += deltaTime / 0.7;
		requestAnimationFrame(render);
	}

	requestAnimationFrame(render);
}


// #region objects


// #endregion

main();
