// based on https://github.com/jeromeetienne/threex.geometricglow/blob/master/threex.atmospherematerial.js
function AtmosphereMaterial(params) {
  var vertexShader = [
    'varying vec3	vVertexWorldPosition;',
    'varying vec3	vVertexNormal;',

    'varying vec4	vFragColor;',

    "varying vec2 vUv;",

    'void main(){',
    ' vUv = uv;',
    '	vVertexNormal	= normalize(normalMatrix * normal);',
    '	vVertexWorldPosition	= (modelMatrix * vec4(position, 1.0)).xyz;',

    '	gl_Position	= projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  var fragmentShader = [
    'uniform vec3	glowColor;',
    'uniform float coefficient;',
    'uniform float power;',

    'varying vec3	vVertexNormal;',
    'varying vec3	vVertexWorldPosition;',

    "varying vec2 vUv;",
    'uniform sampler2D alphaMap;',

    'varying vec4	vFragColor;',

    'void main(){',
    '	vec3 worldCameraToVertex = vVertexWorldPosition - cameraPosition;',
    '	vec3 viewCameraToVertex	= (viewMatrix * vec4(worldCameraToVertex, 0.0)).xyz;',
    '	viewCameraToVertex	= normalize(viewCameraToVertex);',
    '	float intensity = pow(coefficient + dot(vVertexNormal, viewCameraToVertex), power);',

    ' vec4 alpha = texture2D(alphaMap, vUv);',

    '	gl_FragColor = vec4(glowColor * alpha.rgb, intensity);',
    '}'
  ].join('\n');

  THREE.ShaderMaterial.call(this, {
    uniforms: {
      coefficient	: {
        type	: "f",
        value	: params.coefficient
      },
      power		: {
        type	: "f",
        value	: params.power
      },
      glowColor	: {
        type	: "c",
        value	: new THREE.Color(params.color)
      },
      alphaMap : {
        type : 't',
        value: params.alphaMap
      }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
}
AtmosphereMaterial.prototype = Object.create(THREE.ShaderMaterial.prototype);
AtmosphereMaterial.prototype.constructor = AtmosphereMaterial;
