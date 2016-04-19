function MarkerAnimationSystem(prefabGeometry, endPositions) {
  var prefabCount = endPositions.length;
  var prefabVertexCount = prefabGeometry.vertices.length;
  var bufferGeometry = new THREE.BAS.PrefabBufferGeometry(prefabGeometry, prefabCount);

  var i, j, offset;

  // animation
  var aAnimation = bufferGeometry.createAttribute('aAnimation', 2);
  var delay, duration;

  var minDelay = 0, maxDelay = 2.0;
  var minDuration = 0.25, maxDuration = 1.0;
  var stretch = 0.05;

  this.animationDuration = maxDelay + maxDuration + stretch;
  this._animationProgress = 0;

  for (i = 0, offset = 0; i < prefabCount; i++) {
    delay = utils.ease(Circ.easeOut, i, minDelay, maxDelay, prefabCount);
    duration = THREE.Math.randFloat(minDuration, maxDuration);

    for (j = 0; j < prefabVertexCount; j++) {
      aAnimation.array[offset++] = delay + (stretch * (j/prefabVertexCount));
      aAnimation.array[offset++] = duration;
    }
  }

  // positions
  var aStartPosition = bufferGeometry.createAttribute('aStartPosition', 3);
  var aControl0 = bufferGeometry.createAttribute('aControl0', 3);
  var aControl1 = bufferGeometry.createAttribute('aControl1', 3);
  var aEndPosition = bufferGeometry.createAttribute('aEndPosition', 3);

  var startPosition = new THREE.Vector3();
  var controlPosition0 = new THREE.Vector3();
  var controlPosition1 = new THREE.Vector3();
  var endPosition;

  for (i = 0, offset = 0; i < prefabCount; i++) {

    endPosition = endPositions[i];

    var scale = THREE.Math.randFloat(6.0, 12.0);

    startPosition.copy(endPosition).multiplyScalar(scale);
    //startPosition.y = THREE.Math.randFloatSpread(24.0);

    controlPosition0.copy(endPosition).multiplyScalar(scale * 0.5);

    var angleXZ = Math.atan2(controlPosition0.z, controlPosition0.x);
    var length = controlPosition0.length();

    angleXZ -= Math.PI * 0.25;

    var x = Math.cos(angleXZ);
    var z = Math.sin(angleXZ);

    var scale0 = THREE.Math.randFloat(1.0, 2.0);
    controlPosition0.x = x * length * scale0;
    controlPosition0.z = z * length * scale0;

    var scale1 = THREE.Math.randFloat(0.25, 0.50);
    controlPosition1.x = x * length * scale1;
    controlPosition1.z = z * length * scale1;

    for (j = 0; j < prefabVertexCount; j++) {
      aStartPosition.array[offset  ] = startPosition.x;
      aStartPosition.array[offset+1] = startPosition.y;
      aStartPosition.array[offset+2] = startPosition.z;

      aControl0.array[offset  ] = controlPosition0.x;
      aControl0.array[offset+1] = controlPosition0.y;
      aControl0.array[offset+2] = controlPosition0.z;

      aControl1.array[offset  ] = controlPosition1.x;
      aControl1.array[offset+1] = controlPosition1.y;
      aControl1.array[offset+2] = controlPosition1.z;

      aEndPosition.array[offset  ] = endPosition.x;
      aEndPosition.array[offset+1] = endPosition.y;
      aEndPosition.array[offset+2] = endPosition.z;

      offset += 3;
    }
  }

  // colors
  var aStartColor = bufferGeometry.createAttribute('aStartColor', 3);
  var color = bufferGeometry.createAttribute('color', 3); // end color

  var startColor = new THREE.Color();
  var endColor = new THREE.Color();

  startColor.set(0x000000);
  endColor.set(0xd50c05);

  for (i = 0, offset = 0; i < prefabCount; i++) {

    for (j = 0; j < prefabVertexCount; j++) {
      aStartColor.array[offset  ] = startColor.r;
      aStartColor.array[offset+1] = startColor.g;
      aStartColor.array[offset+2] = startColor.b;

      color.array[offset  ] = endColor.r;
      color.array[offset+1] = endColor.g;
      color.array[offset+2] = endColor.b;

      offset += 3;
    }
  }

  var material = new THREE.BAS.BasicAnimationMaterial({
    shading: THREE.FlatShading,
    vertexColors: THREE.VertexColors,
    uniforms: {
      uTime: {type: 'f', value: 0}
    },
    shaderFunctions: [
      THREE.BAS.ShaderChunk['cubic_bezier'],
      THREE.BAS.ShaderChunk['ease_out_cubic']
    ],
    shaderParameters: [
      'uniform float uTime;',
      'attribute vec2 aAnimation;',
      'attribute vec3 aStartPosition;',
      'attribute vec3 aControl0;',
      'attribute vec3 aControl1;',
      'attribute vec3 aEndPosition;',

      'attribute vec3 aStartColor;'
      // color (endColor) defined is by THREE
    ],
    shaderVertexInit: [
      'float tDelay = aAnimation.x;',
      'float tDuration = aAnimation.y;',
      'float tTime = clamp(uTime - tDelay, 0.0, tDuration);',
      'float tProgress = ease(tTime, 0.0, 1.0, tDuration);'
      //'float tProgress = tTime / tDuration;'
    ],
    shaderTransformPosition: [
      'transformed *= tProgress;',

      'transformed += cubicBezier(aStartPosition, aControl0, aControl1, aEndPosition, tProgress);',

      'float clr = min(1.0, tProgress + 0.25);',
      'vColor.xyz = mix(aStartColor.rgb, color.rgb, clr);'
    ]
  },
  {
    shininess:80,
    specular:0xaa0400
    //diffuse: 0xd50c05
  });

  THREE.Mesh.call(this, bufferGeometry, material);

  this.frustumCulled = false;
}
MarkerAnimationSystem.prototype = Object.create(THREE.Mesh.prototype);
MarkerAnimationSystem.prototype.constructor = MarkerAnimationSystem;

Object.defineProperty(MarkerAnimationSystem.prototype, 'animationProgress', {
  get: function() {
    return this._animationProgress;
  },
  set: function(v) {
    this._animationProgress = v;
    this.material.uniforms['uTime'].value = this.animationDuration * v;
  }
});
