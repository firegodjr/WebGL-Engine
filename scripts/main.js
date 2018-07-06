const CLEAR_COLOR = vec4.fromValues(0.3, 0.3, 0.9, 1.0);
var squareRotation = [0.0, 0.0, 0.0];
var modelCache = [];
main();

// - - - - - - - - - - - - - - - -

function main(){
  const canvas = document.querySelector("#glCanvas");
  const gl = canvas.getContext("webgl");

  if(!gl){
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    return;
  }

  //Load a model into memory
  requestContent("models/cube.obj", loadOBJToModelCache);

  const shaderProgram = initDefaultShaderProgram(gl);
  const programInfo = getProgramInfo(gl, shaderProgram);
  const buffers = null;
  const texture = loadTexture(gl, "firefox.png");

  attachInputListeners(gl);
  refreshCanvasSize(gl);

  var then = 0;
  function render(now)
  {
    now *= 0.001; // convert to seconds
    const deltaTime = now - then;
    then = now;
  
    drawScene(gl, programInfo, buffers, texture, deltaTime);
    squareRotation[0] += deltaTime;
    squareRotation[1] += deltaTime/.7;
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

function initBuffers(gl){
  
  const vertices = modelCache["Cube"].vertices;
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  const indices = modelCache["Cube"].indices;
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return { vertices: vertexBuffer, indices: indexBuffer,};
}

function drawScene(gl, programInfo, buffers, texture, deltaTime){
  if(modelCache["Cube"] == undefined) return;
  
  gl.clearColor(...CLEAR_COLOR);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  buffers = initBuffers(gl);

  //Clear the canvas before we start drawing on it
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a projection matrix
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const fieldOfView = Math.PI/4;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  // Initialize to projection matrix values
  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  // Set the drawing position to the "identity" point
  const modelViewMatrix = mat4.create();
  mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);
  mat4.rotateX(modelViewMatrix, modelViewMatrix, squareRotation[0]);
  mat4.rotateY(modelViewMatrix, modelViewMatrix, squareRotation[1]);

  const GL_FLOAT_BYTES = 4;
  // Tell Webgl how to pull out the positions from the position buffer into the
  // vertexposition attribute
  {
    // Pull out 8 values per iteration
    const numComponents = 3;
    // The data in the buffer is 32-bit floats
    const type = gl.FLOAT;
    // Don't normalize
    const normalize = false;
    // how many bytes to get from one set of values to the next (0=use type and numComponents above)
    const stride = GL_FLOAT_BYTES * 5;
    // how many bytes inside the buffer to start from
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffer);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }

  // Tell Webgl how to pull out the texCoords from the texCoord buffer into the
  // textureCoord attribute
  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = GL_FLOAT_BYTES * 5;
    const offset = GL_FLOAT_BYTES * 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord,
      numComponents,
      type,
      normalize,
      stride,
      offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  }

  //Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  //Set the shader uniforms
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

  //Tell WebGL which indices to use to index the vertices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  //Tell WebGL we want to affect texture unit 0
  gl.activeTexture(gl.TEXTURE0);

  //Bind the texture to texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, texture);

  //Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  {
    const offset = 0;
    const vertexCount = 36;
    const type = gl.UNSIGNED_SHORT;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }
}

// Loads a texture from the 'textures' folder
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
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel)

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images vs non power of 2 images so check if the image is a power of 2 in both dimensions.
    if(isPowerOf2(image.width) && isPowerOf2(image.height))
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
  image.src = "textures/" + url;

  return texture;
}

function attachInputListeners(gl)
{
  window.onresize = function(){refreshCanvasSize(gl)}
}

function isPowerOf2(value)
{
  return (value & (value -1)) == 0;
}

function refreshCanvasSize(gl) 
{
  const canvas = gl.canvas;
  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = window.innerWidth;
  var displayHeight = window.innerHeight;
 
  // Check if the canvas is not the same size.
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {
 
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
    gl.viewport(0,0,displayWidth,displayHeight);
  }
}

function requestContent(filepath, callback)
{
  var request = new XMLHttpRequest();
  request.onreadystatechange = () => { 
    if(request.readyState == 4)
    {
      if(request.status == 0 || request.status == 200)
        callback(request.responseText);
    }
  };

  request.open("GET", filepath, true);
  request.send();
}

function loadOBJToModelCache(raw)
{
  var obj = loadOBJ(raw);
  modelCache[obj.name] = obj;
}

function loadOBJ(raw)
{
  var name = "";

  // Contains individual vertex components
  var positions = [];
  var texCoords = [];
  var normals = [];
  var indexedFaces = [];

  var lines = raw.split("\n");
  for(var i = 0; i < lines.length; ++i)
  {
    var tokens = lines[i].split(' ');

    switch(tokens[0])
    {
      // Name
      case 'o':
        name = tokens.slice(1).join(' ');
        break;

      // Vertex Position
      case 'v':
        var pos = [];
        tokens.slice(1).forEach(value => {
          pos.push(parseFloat(value));
        });
        positions.push(pos);
        break;

      // Vertex Normal
      case 'vn':
        var n = [];
        tokens.slice(1).forEach(value => {
          n.push(parseFloat(value));
        });
        normals.push(n);
        break;

      // Vertex Texture Coords
      case 'vt':
        var coords = [];
        tokens.slice(1).forEach(value =>{
          coords.push(parseFloat(value));
        });
        texCoords.push(coords);
        break;

      // Face
      case 'f':
        var faceVertices = tokens.slice(1)
        if(faceVertices.length == 3)
        {
          faceVertices.forEach(value => 
          {
            var vertexAttribs = value.split("/");
            vertexAttribsParsed = [];
            vertexAttribs.forEach(value => { 
              // Subtract 1 because WebGL indices are 0-based while objs are 1-based
              vertexAttribsParsed.push(parseInt(value)-1)
            });
            indexedFaces.push(vertexAttribsParsed);
          });
        }
        else
        {
          console.warn("Model '" + name + "' could not be loaded because it contains non-triangular faces.");
          //TODO: Triangulate faces automatically
        }
        break;
    }
  }

  // Contains the positions, texCoords, and normals all together
  var fullVertices = [];
  var indexDict = [];
  var combinedIndex = 0;
  var combinedIndices = [];
  indexedFaces.forEach(face => {
    if(toString(...face) in indexDict)
    {
      combinedIndex = indexDict[toString(...face)];
    }
    else
    {
      indexDict[toString(...face)] = combinedIndex++;
      fullVertices.push(...positions[face[0]], ...texCoords[face[1]], ...normals[face[2]]);
    }
    combinedIndices.push(indexDict[toString(...face)]);
  });

  return {
    name: name,
    vertices: fullVertices,
    indices: combinedIndices,
  }
}