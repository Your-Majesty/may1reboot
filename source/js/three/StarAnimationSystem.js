function StarAnimationSystem(prefabGeometry, prefabCount, spread) {
  var prefabVertexCount = prefabGeometry.vertices.length;
  var bufferGeometry = new THREE.BAS.PrefabBufferGeometry(prefabGeometry, prefabCount);

  var i, j, offset;

  // position
  var aPosition = bufferGeometry.createAttribute('aPosition', 3);
  var position = new THREE.Vector3();

  for (i = 0, offset = 0; i < prefabCount; i++) {
    position.x = THREE.Math.randFloatSpread(spread);
    position.y = THREE.Math.randFloatSpread(spread);
    position.z = THREE.Math.randFloatSpread(spread);

    for (j = 0; j < prefabVertexCount; j++) {
      aPosition.array[offset  ] = position.x;
      aPosition.array[offset+1] = position.y;
      aPosition.array[offset+2] = position.z;

      offset += 3;
    }
  }

  // axis angle
  var aAxis = bufferGeometry.createAttribute('aAxis', 3);
  var axis = new THREE.Vector3();

  for (i = 0, offset = 0; i < prefabCount; i++) {
    axis.x = THREE.Math.randFloatSpread(2);
    axis.y = THREE.Math.randFloatSpread(2);
    axis.z = THREE.Math.randFloatSpread(2);
    axis.normalize();

    for (j = 0; j < prefabVertexCount; j++) {
      aAxis.array[offset  ] = axis.x;
      aAxis.array[offset+1] = axis.y;
      aAxis.array[offset+2] = axis.z;

      offset += 3;
    }
  }

  var material = new THREE.BAS.PhongAnimationMaterial({
      shading: THREE.FlatShading,
      uniforms: {
        uTime: {type: 'f', value: 0}
      },
      shaderFunctions: [
        THREE.BAS.ShaderChunk['quaternion_rotation']
      ],
      shaderParameters: [
        'uniform float uTime;',
        'attribute vec3 aPosition;',
        'attribute vec3 aAxis;'
      ],
      shaderVertexInit: [
        'float angle = uTime;',
        'vec4 tQuat = quatFromAxisAngle(aAxis, angle);'
      ],
      shaderTransformPosition: [
        'transformed = rotateVector(tQuat, transformed);',
        'transformed += aPosition;'
      ]
    },
    {
      diffuse: 0xffffff,
      shininess: 400
    });

  THREE.Mesh.call(this, bufferGeometry, material);

  this.frustumCulled = false;
}
StarAnimationSystem.prototype = Object.create(THREE.Mesh.prototype);
StarAnimationSystem.prototype.constructor = StarAnimationSystem;

StarAnimationSystem.prototype.update = function() {
  this.material.uniforms['uTime'].value += (1/60);
};
