function IdleMarkerAnimationSystem(prefabGeometry, endPositions) {
  var prefabCount = endPositions.length;
  var prefabVertexCount = prefabGeometry.vertices.length;
  var bufferGeometry = new THREE.BAS.PrefabBufferGeometry(prefabGeometry, prefabCount);

  var i, j, offset;

  // animation
  var aSpeed = bufferGeometry.createAttribute('aSpeed', 1);
  var speed;

  for (i = 0, offset = 0; i < prefabCount; i++) {
    speed = THREE.Math.randFloat(1.0, 4.0);

    for (j = 0; j < prefabVertexCount; j++) {
      aSpeed.array[offset++] = speed;
    }
  }

  // positions
  var aPosition = bufferGeometry.createAttribute('aPosition', 3);
  var position;

  for (i = 0, offset = 0; i < prefabCount; i++) {
    position = endPositions[i];

    for (j = 0; j < prefabVertexCount; j++) {
      aPosition.array[offset  ] = position.x;
      aPosition.array[offset+1] = position.y;
      aPosition.array[offset+2] = position.z;

      offset += 3;
    }
  }

  // colors
  //var aStartColor = bufferGeometry.createAttribute('aStartColor', 3);
  //var color = bufferGeometry.createAttribute('color', 3); // end color
  //
  //var startColor = new THREE.Color();
  //var endColor = new THREE.Color();
  //
  //startColor.set(0x000000);
  //endColor.set(0xd50c05);
  //
  //for (i = 0, offset = 0; i < prefabCount; i++) {
  //
  //  for (j = 0; j < prefabVertexCount; j++) {
  //    aStartColor.array[offset  ] = startColor.r;
  //    aStartColor.array[offset+1] = startColor.g;
  //    aStartColor.array[offset+2] = startColor.b;
  //
  //    color.array[offset  ] = endColor.r;
  //    color.array[offset+1] = endColor.g;
  //    color.array[offset+2] = endColor.b;
  //
  //    offset += 3;
  //  }
  //}

  var material = new THREE.BAS.BasicAnimationMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    wireframe: true,
    uniforms: {
      uTime: {type: 'f', value: 0}
    },
    shaderFunctions: [
    ],
    shaderParameters: [
      'uniform float uTime;',

      'attribute float aSpeed;',
      'attribute vec3 aPosition;'
    ],
    shaderVertexInit: [
    ],
    shaderTransformPosition: [
      'float scale = 1.0 + 0.5 * sin(uTime * aSpeed);',
      'transformed *= scale;',

      'transformed += aPosition;',
    ]
  },
  {
    diffuse:0xd50c05
  });

  THREE.Mesh.call(this, bufferGeometry, material);

  this.frustumCulled = false;
}
IdleMarkerAnimationSystem.prototype = Object.create(THREE.Mesh.prototype);
IdleMarkerAnimationSystem.prototype.constructor = IdleMarkerAnimationSystem;

IdleMarkerAnimationSystem.prototype.update = function() {
  this.material.uniforms['uTime'].value += (1/60);
};
