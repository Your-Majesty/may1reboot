//=require ../vendor/**/*.js

//=require utils.js
//=require three/*.js

var config = {
  earthRadius:8
};

var Globe = function() {
  this.root = new THREERoot({
    createCameraControls:false,
    fov:20
  });
  window.scene = this.root.scene;

  config.maxAnisotropy = this.root.renderer.getMaxAnisotropy();

  this.root.renderer.setClearColor(0x101010);

  this.root.camera.position.y = 160;

  var light;

  light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(-1.0, 0.5, -0.1).normalize();
  this.root.add(light, 'dirLight1');

  TweenMax.set(this.root.renderer.domElement, {opacity:0});

  this.loader = new THREELoader(_.bind(this.loadedHandler, this));
  this.loader.loadTexture('earth_data', 'res/tex/earth_lights.png');
  this.loader.loadTexture('earth_color', 'res/tex/earth_color.jpg');
  this.loader.loadTexture('earth_disp', 'res/tex/earth_disp.jpg');
  this.loader.loadTexture('earth_bump', 'res/tex/earth_bump.png');
  this.loader.loadTexture('earth_spec', 'res/tex/earth_spec.jpg');
  this.loader.loadTexture('cloud_alpha_map', 'res/tex/earth_cld_alpha.jpg');

  console.warn = function() {}; // shhhhh!
};
Globe.prototype = {
  loadedHandler:function() {
    this.processMarkerPositions();
    this.initEarth();
    this.initStars();
    this.initPostProcessing();

    this.createIntroAnimation();
  },

  initPostProcessing:function() {
    var renderPass = new THREE.RenderPass(this.root.scene, this.root.camera);
    var bloomPass = new THREE.BloomPass(1.5, 25, 4.0, 256);
    var hBlurPass = new THREE.ShaderPass(THREE.HorizontalBlurShader);
    var vBlurPass = new THREE.ShaderPass(THREE.VerticalBlurShader);
    var vignettePass = new THREE.ShaderPass(THREE.VignetteShader);

    hBlurPass.uniforms.h.value = 1.0 / window.innerWidth;
    vBlurPass.uniforms.v.value = 1.0 / window.innerHeight;

    vignettePass.uniforms.offset.value = 1.0;
    vignettePass.uniforms.darkness.value = 1.25;
    vignettePass.uniforms.centerOffset.value.y = 0.3;

    this.vignettePass = vignettePass;

    this.root.initPostProcessing([
      renderPass,
      hBlurPass,
      vBlurPass,
      bloomPass,
      vignettePass
    ]);

    this.root.addUpdateCallback(_.bind(function() {
      var rs = this.earthRotationController.rotationSpeed;

      vBlurPass.uniforms.strength.value = Math.abs(rs.x) * 0.25;
      hBlurPass.uniforms.strength.value = Math.abs(rs.y) * 24.0;

    }, this));

    this.root.addResizeCallback(function() {
      hBlurPass.uniforms.h.value = 1.0 / window.innerWidth;
      vBlurPass.uniforms.v.value = 1.0 / window.innerHeight;
    });
  },

  processMarkerPositions:function() {
    var markerImage = this.loader.get('earth_data').image;
    var markerCnv = document.createElement('canvas');
    var markerCtx = markerCnv.getContext('2d');

    markerCnv.width = markerImage.width * 0.5;
    markerCnv.height = markerImage.height * 0.5;
    markerCtx.drawImage(markerImage, 0, 0, markerCnv.width, markerCnv.height);

    var elevationImage = this.loader.get('earth_disp').image;
    var elevationCnv = document.createElement('canvas');
    var elevationCtx = elevationCnv.getContext('2d');

    elevationCnv.width = markerImage.width * 0.5;
    elevationCnv.height = markerImage.height * 0.5;
    elevationCtx.drawImage(elevationImage, 0, 0, markerCnv.width, markerCnv.height);

    var markerData = markerCtx.getImageData(0, 0, markerCnv.width, markerCnv.height).data;
    var elevationData = markerCtx.getImageData(0, 0, markerCnv.width, markerCnv.height).data;

    var threshold = 240;
    var elevationScale = 0.125;
    var elevationOffset = 0.0;

    var positions = [];

    for (var i = 0; i < markerData.length; i+=4) {
      var r = markerData[i];

      if (r > threshold) {
        var x = ((i / 4) % markerCnv.width) / markerCnv.width;
        var y = (((i / 4) / markerCnv.width) | 0) / markerCnv.height;
        var elevation = (elevationData[i] / 255 * elevationScale) + elevationOffset;

        positions.push({x: x, y: y, elevation: elevation});
      }
    }

    positions.sort(function(a, b) {
      return a.x < b.x;
    });

    console.log('position count', positions.length);

    this.markerPositions = [];

    for (var j = 0; j < positions.length; j++) {
      var p = positions[j];
      var lat = THREE.Math.mapLinear(p.y, 0, 1, 90, -90);
      var lon = THREE.Math.mapLinear(p.x, 0, 1, -180, 180);

      this.markerPositions[j] = utils.llToVec(lat, lon, config.earthRadius + p.elevation);
    }
  },

  initEarth:function() {
    var earth = new THREE.Mesh(
      new THREE.SphereGeometry(config.earthRadius, 200, 200),
      new THREE.MeshPhongMaterial({
        map: this.loader.get('earth_color'),

        displacementMap: this.loader.get('earth_disp'),
        displacementScale: 0.4,
        displacementBias: -0.1,

        bumpMap: this.loader.get('earth_bump'),
        bumpScale: 0.1,

        specularMap: this.loader.get('earth_spec'),
        specular: 0x666666,
        shininess: 1.0
      })
    );
    var halo = new THREE.Mesh(
      new THREE.SphereGeometry(config.earthRadius + 1.0, 100, 100),
      new AtmosphereMaterial({
        alphaMap: this.loader.get('cloud_alpha_map'),
        color: 0xAFD2E4,
        power: 4.0,
        coefficient: 0.8
      })
    );

    TweenMax.to(halo.rotation, 48, {y:Math.PI * 2, ease:Power0.easeIn, repeat:-1});

    earth.add(halo);

    this.root.add(earth, 'earth');

    this.earthRotationController = new ObjectRotator(earth, this.root.camera);

    this.root.addUpdateCallback(_.bind(this.earthRotationController.update, this.earthRotationController));
  },

  setGlobeTexture:function(image) {
    this.root.objects['earth'].material.map.image = image;
    this.root.objects['earth'].material.map.needsUpdate = true;
    this.root.objects['earth'].material.map.anisotropy = config.maxAnisotropy;
  },

  initStars:function() {
    var prefabGeometry = new THREE.TetrahedronGeometry(0.75);
    var starSystem = new StarAnimationSystem(prefabGeometry, 8000, 100, 2000);

    this.root.addUpdateCallback(function() {
      starSystem.update();
    });

    //this.root.add(starSystem);
    this.root.objects['earth'].add(starSystem);
  },

  createIntroAnimation:function() {
    var rotationController = this.earthRotationController;
    var vignettePass = this.vignettePass;

    var tl = new TimelineMax({repeat:0});

    tl.call(function() {
      rotationController.enabled = false;
    });
    tl.to(this.root.renderer.domElement, 0.25, {opacity:1}, 0);

    tl.add(this.createCameraAnimation(10), 0.0);
    tl.add(this.createMarkersAnimation(10), 0.0);
    tl.fromTo(vignettePass.uniforms.offset, 10, {value:0}, {value:1.0}, 0);

    tl.call(function() {
      rotationController.enabled = true;
    });

    tl.timeScale(2);
  },

  createMarkersAnimation:function(duration) {
    var prefabGeometry = new THREE.SphereGeometry(0.025, 6, 6);
    var introAnimation = new IntroMarkerAnimationSystem(prefabGeometry, this.markerPositions);

    var idleAnimation = new IdleMarkerAnimationSystem(prefabGeometry, this.markerPositions);
    var rotationController = this.earthRotationController;

    var tl = new TimelineMax();
    var root = this.root;

    tl.call(function() {
      root.addTo(introAnimation, 'earth');
    });

    var earth = root.get('earth');
    var earthMatrixInverse = new THREE.Matrix4();
    var searchLight = new THREE.PointLight(0xffffff, 1.0, 8.0, 2.0);
    var center = new THREE.Vector3();

    root.addTo(searchLight, 'earth');

    tl.fromTo(introAnimation, duration, {animationProgress:0}, {animationProgress:1, ease:Power0.easeIn});
    tl.call(function() {
      root.remove(introAnimation);
      root.addTo(idleAnimation, 'earth');
      root.addUpdateCallback(function() {
        var i = rotationController.objectPointerIntersections[0];
        var point = i ? i.point : null;

        if (point) {
          earthMatrixInverse.identity().getInverse(earth.matrixWorld);
          point.applyMatrix4(earthMatrixInverse);

          searchLight.visible = true;
          searchLight.position.copy(point);
          searchLight.position.multiplyScalar(1.25);
        }
        else {
          point = center;
          searchLight.visible = false;
        }

        idleAnimation.update(point);
      });
    });

    return tl;
  },

  createCameraAnimation:function(duration) {
    var proxy = {
      angle:Math.PI * 1.5,
      distance:400,
      eyeHeight:60
    };
    var eyeHeight = 8;
    var camera = this.root.camera;
    var target = new THREE.Vector3(0, eyeHeight, 0);

    var tl = new TimelineMax({
      onUpdate:function() {
        var x = Math.cos(proxy.angle) * proxy.distance;
        var y = proxy.eyeHeight;
        var z = Math.sin(proxy.angle) * proxy.distance;

        camera.position.set(x, y, z);
        camera.lookAt(target);
      }
    });

    tl.to(proxy, duration, {angle:Math.PI * -1.5, distance:32, eyeHeight:eyeHeight, ease:Power1.easeInOut});

    return tl;
  }
};

window.globe = new Globe();

// drag and drop texture stuff
'drag dragstart dragend dragover dragenter dragleave drop'.split(' ').forEach(function(ev) {
  document.body.addEventListener(ev, function(e) {
    e.preventDefault();
    e.stopPropagation();
  })
});
document.body.addEventListener('drop', function (e) {
  //console.log('wow!', e.dataTransfer);

  var files = e.dataTransfer.files;

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var reader = new FileReader();

    reader.readAsDataURL(file);
    reader.addEventListener('loadend', function(e) {
      var img = document.createElement("img");
      img.src = e.target.result;

      window.globe.setGlobeTexture(img);
    })
  }
});
