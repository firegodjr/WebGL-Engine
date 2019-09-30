varying highp vec2 vTextureCoord;
varying highp vec3 vPosition;
varying highp vec3 vNormal;

uniform sampler2D uSampler;

void main() 
{
    highp vec4 texelColor = texture2D(uSampler, vTextureCoord);

    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
    
    highp float directional = max(dot(vNormal.xyz, directionalVector), 0.0);

    gl_FragColor = vec4(texelColor.rgb * (ambientLight + directionalLightColor * directional), texelColor.a);
}