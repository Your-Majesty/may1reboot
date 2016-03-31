function MarkerAnimationSystem(prefabGeometry, endPositions) {
  var prefabCount = endPositions.length;
  var prefabVertexCount = prefabGeometry.vertices.length;
  var bufferGeometry = new THREE.BAS.PrefabBufferGeometry(prefabGeometry, prefabCount);

  var i, j, offset;

  // animation
  var aAnimation = bufferGeometry.createAttribute('aAnimation', 2);
  var delay, duration;

  var minDelay = 0, maxDelay = 4;
  var minDuration = 2, maxDuration = 4;
  var stretch = 0.1;

  this.animationDuration = maxDelay + maxDuration + stretch;
  this._animationProgress = 0;

  for (i = 0, offset = 0; i < prefabCount; i++) {
    delay = THREE.Math.randFloat(minDelay, maxDelay);
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

    controlPosition0.copy(endPosition).multiplyScalar(6.0);

    var angleXZ = Math.atan2(controlPosition0.z, controlPosition0.x);
    var length = controlPosition0.length();

    angleXZ -= Math.PI * 0.5;
    var x = Math.cos(angleXZ);
    var z = Math.sin(angleXZ);

    controlPosition0.x = x * length * 0.5 + THREE.Math.randFloatSpread(4.0);
    //controlPosition0.y = THREE.Math.randFloatSpread(24.0);
    controlPosition0.z = z * length * 0.5 + THREE.Math.randFloatSpread(4.0);

    controlPosition1.x = x * length * 0.5 + THREE.Math.randFloatSpread(4.0);
    //controlPosition1.y = THREE.Math.randFloatSpread(24.0);
    controlPosition1.z = z * length * 0.5 + THREE.Math.randFloatSpread(4.0);

    startPosition.copy(endPosition).multiplyScalar(12.0);
    startPosition.y = THREE.Math.randFloatSpread(12.0);

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
      'attribute vec3 aEndPosition;'
    ],
    shaderVertexInit: [
      'float tDelay = aAnimation.x;',
      'float tDuration = aAnimation.y;',
      'float tTime = clamp(uTime - tDelay, 0.0, tDuration);',
      'float tProgress = ease(tTime, 0.0, 1.0, tDuration);'
      //'float tProgress = tTime / tDuration;'
    ],
    shaderTransformPosition: [
      'transformed += cubicBezier(aStartPosition, aControl0, aControl1, aEndPosition, tProgress);',
      'vColor *= (tProgress + 0.5);'
    ]
  },
  {
    diffuse: 0xd50c05
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
