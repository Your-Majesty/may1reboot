function IntroMarkerAnimationSystem(prefabGeometry, endPositions) {
  var prefabCount = endPositions.length;
  var prefabVertexCount = prefabGeometry.vertices.length;
  var bufferGeometry = new THREE.BAS.PrefabBufferGeometry(prefabGeometry, prefabCount);

  var i, j, offset;

  // 1. Animation

  var aAnimation = bufferGeometry.createAttribute('aAnimation', 2);
  var delay, duration;

  // each marker has an animation delay between minDelay and maxDelay
  var minDelay = 0, maxDelay = 2.0;
  // each marker has an animation duration between minDuration and maxDuration
  var minDuration = 0.25, maxDuration = 1.0;
  // amount of extra delay per marker vertex - this is what turns them into trails
  var stretch = 0.05;

  // calculate total duration for animation
  this.animationDuration = maxDelay + maxDuration + stretch;
  this._animationProgress = 0;

  // store values per marker
  for (i = 0, offset = 0; i < prefabCount; i++) {
    // start with a few markers then ramp up
    delay = utils.ease(Circ.easeOut, i, minDelay, maxDelay, prefabCount);
    duration = THREE.Math.randFloat(minDuration, maxDuration);

    for (j = 0; j < prefabVertexCount; j++) {
      aAnimation.array[offset++] = delay + (stretch * (j / prefabVertexCount));
      aAnimation.array[offset++] = duration;
    }
  }

  // 2. positions

  // define bezier path per marker
  var aStartPosition = bufferGeometry.createAttribute('aStartPosition', 3);
  var aControl0 = bufferGeometry.createAttribute('aControl0', 3);
  var aControl1 = bufferGeometry.createAttribute('aControl1', 3);
  var aEndPosition = bufferGeometry.createAttribute('aEndPosition', 3);

  var startPosition = new THREE.Vector3();
  var controlPosition0 = new THREE.Vector3();
  var controlPosition1 = new THREE.Vector3();
  var endPosition;

  for (i = 0, offset = 0; i < prefabCount; i++) {
    // end position on the globe
    endPosition = endPositions[i];

    var scale = THREE.Math.randFloat(6.0, 12.0);
    // start position further away from the globe
    startPosition.copy(endPosition).multiplyScalar(scale);
    // control position halfway between end and start
    controlPosition0.copy(endPosition).multiplyScalar(scale * 0.5);
    // get angle and distance of control point
    var angleXZ = Math.atan2(controlPosition0.z, controlPosition0.x);
    var length = controlPosition0.length();

    // rotate to create a curve
    angleXZ -= Math.PI * 0.25;
    var x = Math.cos(angleXZ);
    var z = Math.sin(angleXZ);

    // randomize a little
    var scale0 = THREE.Math.randFloat(1.0, 2.0);
    controlPosition0.x = x * length * scale0;
    controlPosition0.z = z * length * scale0;
    // randomize a little
    var scale1 = THREE.Math.randFloat(0.25, 0.50);
    controlPosition1.x = x * length * scale1;
    controlPosition1.z = z * length * scale1;

    // store values
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

  // 3. colors

  // each marker will change color during animation
  var aStartColor = bufferGeometry.createAttribute('aStartColor', 3);
  var color = bufferGeometry.createAttribute('color', 3); // end color

  var startColor = new THREE.Color();
  var endColor = new THREE.Color();

  startColor.set(0x000000);

  var hsl = endColor.set(0xd50c05).getHSL();

  for (i = 0, offset = 0; i < prefabCount; i++) {
    // randomize end color around same hue
    endColor.setHSL(hsl.h, THREE.Math.randFloat(0.5, 1.0), THREE.Math.randFloat(0.2, 0.5));

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
    transparent: true,
    blending: THREE.AdditiveBlending,
    wireframe: true,
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
    ],
    shaderTransformPosition: [
      'transformed *= tProgress;',

      'transformed += cubicBezier(aStartPosition, aControl0, aControl1, aEndPosition, tProgress);',

      'float clr = tProgress;',
      'vColor.xyz = mix(aStartColor.rgb, color.rgb, clr);'
    ]
  }, {});

  THREE.Mesh.call(this, bufferGeometry, material);

  this.frustumCulled = false;
}
IntroMarkerAnimationSystem.prototype = Object.create(THREE.Mesh.prototype);
IntroMarkerAnimationSystem.prototype.constructor = IntroMarkerAnimationSystem;

Object.defineProperty(IntroMarkerAnimationSystem.prototype, 'animationProgress', {
  get: function() {
    return this._animationProgress;
  },
  set: function(v) {
    this._animationProgress = v;
    this.material.uniforms['uTime'].value = this.animationDuration * v;
  }
});
