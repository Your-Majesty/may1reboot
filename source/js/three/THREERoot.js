function THREERoot(params) {
  // defaults
  params = _.extend({
    containerId:'three-container',
    fov:60,
    zNear:1,
    zFar:10000,
    createCameraControls:true,
    autoUpdate:true
  }, params);

  // maps and arrays
  this.updateCallbacks = [];
  this.resizeCallbacks = [];
  this.objects = {};

  // renderer
  this.renderer = new THREE.WebGLRenderer();
  this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  document.getElementById(params.containerId).appendChild(this.renderer.domElement);

  // camera
  this.camera = new THREE.PerspectiveCamera(
    params.fov,
    window.innerWidth / window.innerHeight,
    params.zNear,
    params.zFar
  );

  // scene
  this.scene = new THREE.Scene();

  // optional camera controls
  if (params.createCameraControls) {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.addUpdateCallback(_.bind(this.controls.update, this.controls));
  }

  // resize handling
  this.resize = _.bind(this.resize, this);
  this.resize();
  window.addEventListener('resize', this.resize, false);

  // tick / update / render
  if (params.autoUpdate) {
    this.tick = _.bind(this.tick, this);
    this.tick();
  }
}
THREERoot.prototype = {
  addUpdateCallback:function(callback) {
    this.updateCallbacks.push(callback);
  },
  addResizeCallback:function(callback) {
    this.resizeCallbacks.push(callback);
  },

  add:function(object, key) {
    key && (this.objects[key] = object);
    this.scene.add(object);
  },
  addTo:function(object, parentKey, key) {
    key && (this.objects[key] = object);
    this.get(parentKey).add(object);
  },
  get:function(key) {
    return this.objects[key];
  },
  remove:function(o) {
    var object;

    if (typeof o === 'string') {
      object = this.objects[o];
    }
    else {
      object = o;
    }

    if (object) {
      object.parent.remove(object);
      delete this.objects[o];
    }
  },

  tick: function() {
    this.update();
    this.render();
    requestAnimationFrame(this.tick);
  },
  update: function() {
    this.updateCallbacks.forEach(function(callback) {callback()});
  },
  render: function() {
    this.renderer.render(this.scene, this.camera);
  },

  resize: function() {
    this.resizeCallbacks.forEach(function(callback) {callback()});

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  // post processing
  initPostProcessing:function(passes) {
    this.composer = new THREE.EffectComposer(this.renderer);

    for (var i = 0; i < passes.length; i++) {
      var pass = passes[i];
      pass.renderToScreen = (i === passes.length - 1);

      this.composer.addPass(pass);
    }

    this.renderer.autoClear = false;
    this.render = _.bind(function() {
      this.renderer.clear();
      this.composer.render();
    }, this);
  }
};