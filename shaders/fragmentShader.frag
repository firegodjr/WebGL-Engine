varying highp vec2 vTextureCoord;
varying highp vec3 vPosition;
varying highp vec3 vNormal;
uniform highp mat4 uModelViewMatrix;

uniform sampler2D normalTex;
uniform sampler2D diffuseTex;

void main() 
{
    highp vec4 texelNormal = (texture2D(normalTex, vTextureCoord) * 2.0) - 1.0;
    highp vec4 texelColor = texture2D(diffuseTex, vTextureCoord);

    texelNormal = texelNormal * TBN;

    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec4 directionalVector = vec4(0.85, 0.8, 0.75, 0);
    highp vec3 directionalVec3 = normalize(directionalVector.xyz);
    
    highp float directional = max(dot(vNormal.xyz * texelNormal.xyz, directionalVec3), 0.0);
    highp float steps = 4.5;

    gl_FragColor = vec4(texelColor.rgb * (ambientLight + floor(directionalLightColor * directional * steps) / steps), texelColor.a);
}