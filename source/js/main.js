//=require ../vendor/**/*.js

//=require utils.js
//=require three/*.js

var config = {
  earthRadius:10
};

var Globe = function() {
  this.root = new THREERoot();
  this.root.renderer.setClearColor(0x0f0f0f);
  this.root.renderer.setPixelRatio(window.devicePixelRatio || 1);
  this.root.camera.position.set(0, 0, 60);

  this.root.controls.enableKeys = false;
  this.root.controls.enableZoom = false;
  this.root.controls.enableDamping = true;
  this.root.controls.autoRotate = true;
  this.root.controls.autoRotateSpeed = -0.125;
  this.root.controls.dampingFactor = 0.20;
  this.root.controls.rotateSpeed = 0.5;

  this.processMarkerPositions();

  this.initEarth();
  this.initStars();

  var duration = 12;
  var markerAnimation = this.initMarkersAnimation(duration);
  var cameraAnimation = this.initCameraAnimation(duration);
  var controls = this.root.controls;

  var tl = new TimelineMax({repeat:0});

  tl.call(function() {
    controls.enabled = false;
  });
  tl.add(markerAnimation, 0);
  tl.add(cameraAnimation, 0);
  tl.call(function() {
    controls.enabled = true;
  });
};
Globe.prototype = {
  processMarkerPositions:function() {
    this.markerPositions = [];

    for (var i = 0; i < 5000; i++) {
      var lat = Math.random() * 360;
      var long = Math.random() * 360;

      this.markerPositions[i] = utils.llToVec(lat, long, config.earthRadius);
    }
  },

  initEarth:function() {
    var geo = new THREE.SphereGeometry(config.earthRadius, 32, 32);
    var mat = new THREE.MeshBasicMaterial({
      map: THREE.ImageUtils.loadTexture('res/tex/earth_dark.jpg')
    });
    var mesh = new THREE.Mesh(geo, mat);
    this.root.scene.add(mesh);
  },

  initStars:function() {
    var prefabGeometry = new THREE.TetrahedronGeometry(0.5);
    var starSystem = new StarAnimationSystem(prefabGeometry, 2500, 1000);

    TweenMax.ticker.addEventListener('tick', function() {
      starSystem.update();
    });

    this.root.scene.add(starSystem);

    var light = new THREE.PointLight();

    this.root.scene.add(light);
  },

  initMarkersAnimation:function(duration) {
    var prefabGeometry = new THREE.SphereGeometry(0.025, 4, 4);
    var markerSystem = new MarkerAnimationSystem(prefabGeometry, 60, this.markerPositions);
    var animation = TweenMax.fromTo(markerSystem, duration,
      {animationProgress:0},
      {animationProgress:1, ease:Power1.easeOut}
    );

    this.root.scene.add(markerSystem);

    return animation;
  },

  initCameraAnimation:function(duration) {
    var proxy = {
      angle:Math.PI * 1.5,
      distance:100,
      height:20
    };
    var camera = this.root.camera;
    var center = new THREE.Vector3();

    var tl = new TimelineMax({
      onUpdate:function() {
        var x = Math.cos(proxy.angle) * proxy.distance;
        var y = proxy.height;
        var z = Math.sin(proxy.angle) * proxy.distance;

        camera.position.set(x, y, z);
        camera.lookAt(center);
      }
    });

    tl.to(proxy, duration, {angle:Math.PI * -1.5, distance:30, height:0, ease:Power1.easeOut});

    return tl;
  }
};

window.globe = new Globe();
