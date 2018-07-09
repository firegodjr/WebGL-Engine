// Vertex shader program
const vsSource = `
  attribute vec4 aVertexPosition;
  attribute vec2 aTextureCoord;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying highp vec2 vTextureCoord;

  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;
  }
`;

// Fragment shader program
const fsSource = `
varying highp vec2 vTextureCoord;

uniform sampler2D uSampler;

void main() 
{
  gl_FragColor = texture2D(uSampler, vTextureCoord);
  //gl_FragColor = vec4(0.,0.,0.,1.);
}
`;


// Requests and returns a fully compiled shader object
function loadShader(gl, type, source)
{
	const shader = gl.createShader(type);

	// Send the source to the shader object we just initialized
	gl.shaderSource(shader, source);

	// Compile the shader program
	gl.compileShader(shader);

	// See if it compiled successfully
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
	{
		alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
		gl.deleteShader(shader);
		return undefined;
	}

	return shader;
}

// Creates a shader program
function initShaderProgram(gl, vertString, fragString)
{
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertString);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragString);

	// Create the shader program
	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
	{
		return alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
	}

	return shaderProgram;
}

// Creates a shader program with default shaders
function initDefaultShaderProgram(gl)
{
	return initShaderProgram(gl, vsSource, fsSource);
}


function getProgramInfo(gl, shaderProgram)
{
	return {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
			uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
		},
	};
}
