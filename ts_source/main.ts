
import { vec2, vec3, mat4 } from 'gl-matrix';

import {
	CLEAR_COLOR,
	ATTRIB_NORMAL_LENGTH,
	ATTRIB_POS_LENGTH,
	ATTRIB_TEXCOORD_LENGTH,
	VERTEX_COMPONENTS_LENGTH
} from './globals'

import { isPowerOf2, textureFromBitmap } from './utils'
import { loadContent, TextureAtlas, buildStage } from './content-loading'
import { initDefaultShaderProgram, getProgramInfo, WebGLProgramInfo } from './shaders'

import Transform from './stage_content/transform'
import Stage from './stage_content/stage'

interface VertexIndexBuffers {
	vertices: WebGLBuffer;
	indices: WebGLBuffer;
	vertexCount: number;
}

let currentStage: Stage|null = null;

/**
 * Gets the z-forward normal vector
 */
function getLookVector(transform: Transform)
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
function createBuffers(gl: WebGLRenderingContext, vertices: number[], indices: number[]): VertexIndexBuffers {
	const vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	if (vertexBuffer === null || indexBuffer === null)
		throw new Error(`Unable to allocate buffer. Not enough memory?`);

	return { vertices: vertexBuffer, indices: indexBuffer, vertexCount: indices.length };
}

function drawInterleavedBuffer(gl: WebGLRenderingContext, programInfo: WebGLProgramInfo, buffers: VertexIndexBuffers, textures: WebGLTexture[], modelViewMatrix: mat4, projectionMatrix: mat4): void
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
		const type = gl.UNSIGNED_SHORT;
		gl.drawElements(gl.TRIANGLES, buffers.vertexCount, type, offset);
	}
}

/**
 * Handles matrix initialization and all draw calls
 * @param {WebGLRenderingContext} gl
 * @param {Stage} stage
 * @param {object} programInfo
 * @param {number} texture
 */
function drawStage(gl: WebGLRenderingContext, stage: Stage, programInfo: WebGLProgramInfo, texture: WebGLTexture): void
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
	let viewMatrix = mat4.create();
	const cameraTransform = stage.actors.camera.transform;
	cameraTransform.updateModelMatrix();
	mat4.lookAt(viewMatrix, cameraTransform.translation, getLookVector(cameraTransform), vec3.fromValues(0, 1, 0));

	const stageBuffers = createBuffers(gl, stage.vertices, stage.indices);
	drawInterleavedBuffer(gl, programInfo, stageBuffers, [texture], viewMatrix, projectionMatrix);

	stage.actors.forEach((actor) => {
		// Set the drawing position to the 'identity' point
		const modelViewMatrix = mat4.create();
		// Create the ModelView matrix
		mat4.mul(modelViewMatrix, viewMatrix, actor.transform.updateModelMatrix());

		// Create buffers for vertex arrays
		const buffers = createBuffers(gl, actor.vertices, actor.indices);

		drawInterleavedBuffer(gl, programInfo, buffers, [texture], modelViewMatrix, projectionMatrix);
	});
}

// #region utilities

function loadTexture(gl: WebGLRenderingContext, url: string)
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


function refreshCanvasSize(gl: WebGLRenderingContext)
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

function attachInputListeners(gl: WebGLRenderingContext)
{
	window.onresize = function onWindowResize() { refreshCanvasSize(gl); };
}

/** Assigns the stage from the given index to *currentStage* and returns it as a Promise */
export async function switchStage(index: number): Promise<Stage>
{
	return currentStage = await buildStage(index);
}

// #endregion

function main(firstStage: Stage)
{
	console.log('Starting program...');
	const canvas = document.querySelector('#glCanvas') as HTMLCanvasElement;
	const gl = canvas.getContext('webgl');

	if (!gl)
	{
		console.error(canvas.innerText = 'Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}

	// Make sure the canvas fills the screen
	refreshCanvasSize(gl);


	initDefaultShaderProgram(gl)
		.then((prog) => {
			currentStage = firstStage;
			// const texture = loadTexture(gl, 'firefox.png');
			let texture = textureFromBitmap(gl, currentStage.textureAtlas.atlas);

			const programInfo = getProgramInfo(gl, prog);

			attachInputListeners(gl);

			console.log('starting main loop...');

			let lastFrameSec = 0;
			const render = (timeMillis: number): void =>
			{
				const timeSecs = timeMillis * 0.001; // convert to seconds
				const deltaTime = timeSecs - lastFrameSec;
				lastFrameSec = timeSecs;

				if (currentStage === null) {
					throw new Error(`CurrentStage somehow became null! The program cannot continue!`);
				}

				currentStage.update(deltaTime, timeSecs);
				drawStage(gl, currentStage, programInfo, texture);
				requestAnimationFrame(render);
			}

			requestAnimationFrame(render);
		});
}

loadContent().then(main);

console.log('I think it all finished loading...?')
