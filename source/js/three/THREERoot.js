function THREERoot(params) {
  params = _.extend({
    containerId:'three-container',
    fov:60,
    zNear:1,
    zFar:10000,
    createCameraControls:true,
    autoUpdate:true
  }, params);

  this.renderer = new THREE.WebGLRenderer();
  this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  document.getElementById(params.containerId).appendChild(this.renderer.domElement);

  this.camera = new THREE.PerspectiveCamera(
    params.fov,
    window.innerWidth / window.innerHeight,
    params.zNear,
    params.zFar
  );

  this.scene = new THREE.Scene();

  if (params.createCameraControls) {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  }

  this.resize = _.bind(this.resize, this);
  this.resize();
  window.addEventListener('resize', this.resize, false);

  if (params.autoUpdate) {
    this.tick = _.bind(this.tick, this);
    this.tick();
  }
}
THREERoot.prototype = {
  tick: function() {
    this.update();
    this.render();
    requestAnimationFrame(this.tick);
  },
  update: function() {
    this.controls && this.controls.update();
  },
  render: function() {
    this.renderer.render(this.scene, this.camera);
  },
  resize: function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
};