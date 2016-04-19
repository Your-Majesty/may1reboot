/**
 * Depth-of-field post-process with bokeh shader
 */

THREE.AdvancedBokehPass = function (scene, camera, params) {
  this.scene = scene;
  this.camera = camera;

  params = _.extend({
    width: window.innerWidth,
    height: window.innerHeight,
    focalDepth: 1.0,
    focalLength: 24.0,
    fstop: 0.9,
    maxblur: 1.0,
    showFocus: 0,
    manualdof: 0,
    vignetting: 0,
    depthblur: 0,
    threshold: 0.5,
    gain: 2.0,
    bias: 0.5,
    fringe: 0.7,
    znear: camera.zNear,
    zfar: camera.zFar,
    noise: 1,
    dithering: 0.0001,
    pentagon: 0,
    shaderFocus: 1,
    focusCoords: new THREE.Vector2(0, 0)
  }, params);

  // rt color
  var width = params.width;
  var height = params.height;

  this.renderTargetColor = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBFormat
  });

  // rt depth
  this.renderTargetDepth = this.renderTargetColor.clone();

  // depth material
  this.materialDepth = new THREE.MeshDepthMaterial();

  // bokeh material
  var bokehShader = THREE.AdvancedBokehShader;
  var bokehUniforms = THREE.UniformsUtils.clone(bokehShader.uniforms);

  bokehUniforms["tColor"].value = this.renderTargetColor;
  bokehUniforms["tDepth"].value = this.renderTargetDepth;
  bokehUniforms["textureWidth"].value = width;
  bokehUniforms["textureHeight"].value = height;

  utils.applyUniformValues(bokehUniforms, params);

  this.materialBokeh = new THREE.ShaderMaterial({
    uniforms: bokehUniforms,
    vertexShader: bokehShader.vertexShader,
    fragmentShader: bokehShader.fragmentShader,
    defines: {
      RINGS: 3,
      SAMPLES: 4
    }
  });

  this.uniforms = bokehUniforms;
  this.enabled = true;
  this.needsSwap = false;
  this.renderToScreen = false;
  this.clear = false;

  this.compCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.compScene = new THREE.Scene();

  this.compQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.materialBokeh);
  this.compScene.add(this.compQuad);

};

THREE.AdvancedBokehPass.prototype = {
  render: function (renderer, writeBuffer, readBuffer, delta, maskActive) {

    // scene to texture
    this.scene.overrideMaterial = null;
    renderer.render(this.scene, this.camera, this.renderTargetColor, true);

    // depth to texture
    this.scene.overrideMaterial = this.materialDepth;
    renderer.render(this.scene, this.camera, this.renderTargetDepth, true);

    // composite
    if (this.renderToScreen) {
      renderer.render(this.compScene, this.compCamera);
    }
    else {
      renderer.render(this.compScene, this.compCamera, writeBuffer, this.clear);
    }

    //this.quad2.material = this.materialBokeh;
    //
    //// Render depth into texture
    //
    //this.scene.overrideMaterial = this.materialDepth;
    //
    //renderer.render(this.scene, this.camera, this.renderTargetDepth, true);
    //
    //// Render bokeh composite
    //
    //this.uniforms["tColor"].value = readBuffer;
    //
    //if (this.renderToScreen) {
    //
    //  renderer.render(this.scene2, this.camera2);
    //
    //} else {
    //
    //  renderer.render(this.scene2, this.camera2, writeBuffer, this.clear);
    //
    //}
    //
    //this.scene.overrideMaterial = null;
  }
};

