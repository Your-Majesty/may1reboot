function AsteroidAnimationSystem(prefabGeometry, prefabCount, clear, spread) {
  var prefabVertexCount = prefabGeometry.vertices.length;
  var bufferGeometry = new AsteroidGeometry(prefabGeometry, prefabCount);

  var i, j, offset;

  // position
  var aPosition = bufferGeometry.createAttribute('aPosition', 3);
  var position = new THREE.Vector3();

  for (i = 0, offset = 0; i < prefabCount; i++) {
    //position.set(THREE.Math.randFloat(clear, spread), THREE.Math.randFloat(clear, spread), 0);
    position.setScalar(THREE.Math.randFloat(clear, spread));

    for (j = 0; j < prefabVertexCount; j++) {
      aPosition.array[offset  ] = position.x;
      aPosition.array[offset+1] = position.y;
      aPosition.array[offset+2] = position.z;

      offset += 3;
    }
  }

  // axis angle
  var aSpin = bufferGeometry.createAttribute('aSpin', 4);
  var aOrbit = bufferGeometry.createAttribute('aOrbit', 4);

  var spinAxis = new THREE.Vector3();
  var spinSpeed;

  var orbitAxis = new THREE.Vector3();
  var orbitSpeed;

  for (i = 0, offset = 0; i < prefabCount; i++) {
    spinAxis.x = THREE.Math.randFloatSpread(2);
    spinAxis.y = THREE.Math.randFloatSpread(2);
    spinAxis.z = THREE.Math.randFloatSpread(2);
    spinAxis.normalize();
    spinSpeed = THREE.Math.randFloat(2.0, 4.0);

    orbitAxis.x = THREE.Math.randFloatSpread(2);
    orbitAxis.y = THREE.Math.randFloatSpread(2);
    orbitAxis.z = THREE.Math.randFloatSpread(2);
    orbitAxis.normalize();
    orbitSpeed = THREE.Math.randFloat(0.05, 0.125);

    for (j = 0; j < prefabVertexCount; j++) {
      aSpin.array[offset  ] = spinAxis.x;
      aSpin.array[offset+1] = spinAxis.y;
      aSpin.array[offset+2] = spinAxis.z;
      aSpin.array[offset+3] = spinSpeed;

      aOrbit.array[offset  ] = orbitAxis.x;
      aOrbit.array[offset+1] = orbitAxis.y;
      aOrbit.array[offset+2] = orbitAxis.z;
      aOrbit.array[offset+3] = orbitSpeed;

      offset += 4;
    }
  }

  var material = new THREE.BAS.PhongAnimationMaterial({
      shading: THREE.FlatShading,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: {type: 'f', value: 24.0}
      },
      shaderFunctions: [
        THREE.BAS.ShaderChunk['quaternion_rotation']
      ],
      shaderParameters: [
        'uniform float uTime;',

        'attribute vec3 aPosition;',
        'attribute vec4 aSpin;',
        'attribute vec4 aOrbit;'
      ],
      shaderTransformPosition: [
        // spin
        'transformed = rotateVector(quatFromAxisAngle(aSpin.xyz, uTime * aSpin.w), transformed);',

        'transformed += aPosition;',

        'transformed = rotateVector(quatFromAxisAngle(aOrbit.xyz, uTime * aOrbit.w), transformed);'
      ]
    },
    {
      diffuse: 0x242424,
      emissive: 0x121212,
      specular: 0xffffff,
      shininess: 40
    });

  THREE.Mesh.call(this, bufferGeometry, material);

  this.frustumCulled = false;
}
AsteroidAnimationSystem.prototype = Object.create(THREE.Mesh.prototype);
AsteroidAnimationSystem.prototype.constructor = AsteroidAnimationSystem;

AsteroidAnimationSystem.prototype.update = function() {
  this.material.uniforms['uTime'].value += (1/60);
};


function AsteroidGeometry(prefab, count) {
  THREE.BAS.PrefabBufferGeometry.call(this, prefab, count);
}
AsteroidGeometry.prototype = Object.create(THREE.BAS.PrefabBufferGeometry.prototype);
AsteroidGeometry.prototype.constructor = AsteroidGeometry;
AsteroidGeometry.prototype.bufferPositions = function() {
  var positionBuffer = this.createAttribute('position', 3).array;

  var scaleMatrix = new THREE.Matrix4();
  var scale;
  var p = new THREE.Vector3();

  for (var i = 0, offset = 0; i < this.prefabCount; i++) {

    scale = Math.random();
    scaleMatrix.identity().makeScale(scale, scale, scale);

    for (var j = 0; j < this.prefabVertexCount; j++, offset += 3) {
      var prefabVertex = this.prefabGeometry.vertices[j];

      p.copy(prefabVertex);
      p.applyMatrix4(scaleMatrix);

      positionBuffer[offset    ] = p.x;
      positionBuffer[offset + 1] = p.y;
      positionBuffer[offset + 2] = p.z;
    }
  }
};