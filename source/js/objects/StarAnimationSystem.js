function StarAnimationSystem(prefabGeometry, prefabCount, clear, spread) {
  var prefabVertexCount = prefabGeometry.vertices.length;
  var bufferGeometry = new THREE.BAS.PrefabBufferGeometry(prefabGeometry, prefabCount);

  var i, j, offset;

  // position
  var aPosition = bufferGeometry.createAttribute('aPosition', 3);
  var position, radius;

  for (i = 0, offset = 0; i < prefabCount; i++) {
    position = utils.spherePointEven();
    radius = THREE.Math.randFloat(clear, spread);

    for (j = 0; j < prefabVertexCount; j++) {
      aPosition.array[offset  ] = position.x * radius;
      aPosition.array[offset+1] = position.y * radius;
      aPosition.array[offset+2] = position.z * radius;

      offset += 3;
    }
  }

  // axis angle
  var aAxisSpeed = bufferGeometry.createAttribute('aAxisSpeed', 4);
  var axis = new THREE.Vector3();
  var rotationSpeed;

  for (i = 0, offset = 0; i < prefabCount; i++) {
    axis.x = THREE.Math.randFloatSpread(2);
    axis.y = THREE.Math.randFloatSpread(2);
    axis.z = THREE.Math.randFloatSpread(2);
    axis.normalize();

    rotationSpeed = THREE.Math.randFloat(2.0, 3.0);

    for (j = 0; j < prefabVertexCount; j++) {
      aAxisSpeed.array[offset  ] = axis.x;
      aAxisSpeed.array[offset+1] = axis.y;
      aAxisSpeed.array[offset+2] = axis.z;
      aAxisSpeed.array[offset+3] = rotationSpeed;

      offset += 4;
    }
  }

  var material = new THREE.BAS.BasicAnimationMaterial({
      shading: THREE.FlatShading,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: {type: 'f', value: 0}
      },
      shaderFunctions: [
        THREE.BAS.ShaderChunk['quaternion_rotation']
      ],
      shaderParameters: [
        'uniform float uTime;',
        'attribute vec3 aPosition;',
        'attribute vec4 aAxisSpeed;'
      ],
      shaderVertexInit: [
        'float angle = uTime * aAxisSpeed.w;',
        'vec4 tQuat = quatFromAxisAngle(aAxisSpeed.xyz, angle);'
      ],
      shaderTransformPosition: [
        'transformed = rotateVector(tQuat, transformed);',
        'transformed += aPosition;'
      ]
    },
    {
      diffuse: 0xffffff
    });

  THREE.Mesh.call(this, bufferGeometry, material);

  this.frustumCulled = false;
}
StarAnimationSystem.prototype = Object.create(THREE.Mesh.prototype);
StarAnimationSystem.prototype.constructor = StarAnimationSystem;

StarAnimationSystem.prototype.update = function() {
  this.material.uniforms['uTime'].value += (1/60);
};
