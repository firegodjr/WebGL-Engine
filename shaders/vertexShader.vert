attribute vec4 aVertexPosition;
attribute vec2 aTextureCoord;
attribute vec3 aVertexNormal;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

varying highp vec2 vTextureCoord;
varying highp vec3 vPosition;
varying highp vec3 vNormal;

void main() 
{
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;

    highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

    vPosition = gl_Position.xyz;
    vNormal = transformedNormal.xyz;
}