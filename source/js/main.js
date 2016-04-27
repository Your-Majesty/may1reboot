//=require ../vendor/**/*.js

//=require utils.js
//=require three/*.js
//=require objects/*.js
//=require controllers/*.js

var config = {
  earthRadius:8,
  maxAnisotropy:1,

  dirBlurFactor:36,
  clearColor:'#090909'
};

var Globe = function(textureRoot) {
  this.root = new THREERoot({
    createCameraControls: false,
    autoStart: false,
    fov: 20
  });
  window.scene = this.root.scene;

  this.initGUI();

  config.maxAnisotropy = this.root.renderer.getMaxAnisotropy();

  this.root.renderer.setClearColor(config.clearColor);
  this.root.camera.position.y = 160;

  var light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(-1.0, 0.5, -0.1);
  this.root.add(light, 'dirLight1');

  this.loader = new THREELoader(_.bind(this.loadedHandler, this), textureRoot);
  this.loader.loadTexture('earth_data', 'earth_data.jpg');
  this.loader.loadTexture('earth_color', 'earth_color_2x.jpg');
  this.loader.loadTexture('earth_disp', 'earth_disp.jpg');
  this.loader.loadTexture('earth_bump', 'earth_bump.png');
  this.loader.loadTexture('earth_spec', 'earth_spec.jpg');
  this.loader.loadTexture('cloud_alpha_map', 'earth_cld_alpha.jpg');

  console.warn = function() {}; // shhhhh!

  this.eventDispatcher = new THREE.EventDispatcher();

  // DAT.GUI

  var folder = this.gui.addFolder('scene');
  var root = this.root;

  folder.addColor(config, 'clearColor').onChange(function(value) {
    root.renderer.setClearColor(value);
  });
  utils.createColorController(folder, light, 'color', 'light color');
  folder.add(light, 'intensity').name('light intensity');
  folder.add(light.position, 'x').name('light origin x');
  folder.add(light.position, 'z').name('light origin y');
  folder.add(light.position, 'y').name('light origin z');
};
Globe.prototype = {
  addEventListener:function(type, handler) {
    this.eventDispatcher.addEventListener(type, handler);
  },

  loadedHandler:function() {
    this.pointerController = new PointerController(this.root.camera);
    this.root.addUpdateCallback(_.bind(this.pointerController.update, this.pointerController));

    this.processMarkerPositions();
    this.initEarth();
    this.initStars();
    this.initMarkers();
    this.initPostProcessing();

    this.createIntroAnimation();

    this.root.start();
  },

  initGUI:function() {
    var gui = this.gui = new dat.GUI();

    //gui.domElement.style.visibility = 'hidden';
    gui.domElement.parentNode.style.zIndex = '9001';
    gui.width = 400;
    window.addEventListener('keydown', function(e) {
      if (e.keyCode === 192) { // tilde
        if (gui.domElement.style.visibility === 'hidden') {
          gui.domElement.style.visibility = 'visible';
        }
        else {
          gui.domElement.style.visibility = 'hidden';
        }
      }
    });
  },

  initPostProcessing:function() {
    var renderPass = new THREE.RenderPass(this.root.scene, this.root.camera);
    var bloomPass = new THREE.BloomPass(1.5, 25, 4.0, 256);
    var hBlurPass = new THREE.ShaderPass(THREE.HorizontalBlurShader);
    var fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
    var vignettePass = new THREE.ShaderPass(THREE.VignetteShader);

    hBlurPass.uniforms.h.value = 1.0 / window.innerWidth;

    fxaaPass.uniforms.resolution.value.x = 1.0 / window.innerWidth;
    fxaaPass.uniforms.resolution.value.y = 1.0 / window.innerHeight;
    fxaaPass.enabled = false;

    vignettePass.uniforms.offset.value = 0.0;
    vignettePass.uniforms.darkness.value = 1.25;
    vignettePass.uniforms.centerOffset.value.y = -0.225;
    //vignettePass.enabled = false;

    this.vignettePass = vignettePass;

    this.root.initPostProcessing([
      renderPass,
      hBlurPass,
      bloomPass,
      fxaaPass,
      vignettePass
    ]);

    this.root.addUpdateCallback(_.bind(function() {
      var rs = this.earthRotationController.rotationSpeed;
      hBlurPass.uniforms.strength.value = Math.abs(rs.y) * config.dirBlurFactor;
    }, this));

    this.root.addResizeCallback(function() {
      hBlurPass.uniforms.h.value = 1.0 / window.innerWidth;
      fxaaPass.uniforms.resolution.value.x = 1.0 / window.innerWidth;
      fxaaPass.uniforms.resolution.value.y = 1.0 / window.innerHeight;
    });

    // DAT.GUI

    var folder = this.gui.addFolder('postprocessing');
    folder.add(config, 'dirBlurFactor').name('motion blur factor');
    folder.add(vignettePass.uniforms.offset, 'value').name('vignette offset');
    folder.add(vignettePass.uniforms.darkness, 'value').name('vignette darkness');
    folder.add(vignettePass.uniforms.centerOffset.value, 'y').name('vignette center offset');
    folder.add(bloomPass.copyUniforms.opacity, 'value').name('bloom strenght');
    folder.add(fxaaPass, 'enabled').name('enable fxaa');
  },

  processMarkerPositions:function() {
    var markerImage = this.loader.get('earth_data').image;
    var markerCnv = document.createElement('canvas');
    var markerCtx = markerCnv.getContext('2d');

    markerCnv.width = markerImage.width;
    markerCnv.height = markerImage.height;
    markerCtx.drawImage(markerImage, 0, 0, markerCnv.width, markerCnv.height);

    var elevationImage = this.loader.get('earth_disp').image;
    var elevationCnv = document.createElement('canvas');
    var elevationCtx = elevationCnv.getContext('2d');

    elevationCnv.width = markerImage.width;
    elevationCnv.height = markerImage.height;
    elevationCtx.drawImage(elevationImage, 0, 0, markerCnv.width, markerCnv.height);

    var markerData = markerCtx.getImageData(0, 0, markerCnv.width, markerCnv.height).data;
    var elevationData = elevationCtx.getImageData(0, 0, elevationCnv.width, elevationCnv.height).data;

    var threshold = 255;
    var elevationScale = 0.4;
    var elevationOffset = 0.2;

    var positions = [];

    for (var i = 0; i < markerData.length; i+=4) {
      var r = markerData[i];

      if (r >= threshold) {
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
        displacementScale: 0.55,
        displacementBias: -0.10,

        bumpMap: this.loader.get('earth_bump'),
        bumpScale: 0.1,

        specularMap: this.loader.get('earth_spec'),
        specular: 0x666666,
        shininess: 1.0
      })
    );
    var halo = new THREE.Mesh(
      new THREE.SphereGeometry(config.earthRadius, 100, 100),
      new AtmosphereMaterial({
        alphaMap: this.loader.get('cloud_alpha_map'),
        color: 0xAFD2E4,
        power: 4.0,
        coefficient: 0.8
      })
    );

    halo.scale.setScalar(1.125);

    TweenMax.to(halo.scale, 6, {x:1.175, y:1.175, z: 1.175, ease:Power1.easeInOut, repeat:-1, yoyo:true});

    halo.rotationAnimation = TweenMax.to(halo.rotation, 16, {y:Math.PI * 2, ease:Power0.easeIn, repeat:-1});

    this.root.add(earth, 'earth');
    this.root.addTo(halo, 'earth', 'halo');
    this.pointerController.register(earth);

    this.earthRotationController = new ObjectRotationController(earth);
    this.root.addUpdateCallback(_.bind(this.earthRotationController.update, this.earthRotationController));

    // DAT.GUI

    var earthFolder = this.gui.addFolder('earth');
    earthFolder.add(earth.material, 'displacementScale');
    earthFolder.add(earth.material, 'displacementBias');
    utils.createColorController(earthFolder, earth.material, 'color', 'earth color');
    utils.createColorController(earthFolder, earth.material, 'emissive', 'earth emissive');
    utils.createColorController(earthFolder, earth.material, 'specular', 'earth specular');
    earthFolder.add(earth.material, 'shininess').name('specular focus');

    earthFolder.add(halo.scale, 'x').name('atmosphere scale').onChange(function(v) {
      halo.scale.setScalar(v);
    });

    utils.createColorController(earthFolder, halo.material.uniforms.glowColor, 'value', 'atmosphere color');
    earthFolder.add(halo.material.uniforms.coefficient, 'value').name('atmosphere coefficient');
    earthFolder.add(halo.material.uniforms.power, 'value').name('atmosphere power');

    var controlsFolder = this.gui.addFolder('earth dragging');
    controlsFolder.add(this.earthRotationController, 'dragSpeed').name('drag speed');
    controlsFolder.add(this.earthRotationController, 'autoRotateSpeed').name('auto rotate speed');
    controlsFolder.add(this.earthRotationController, 'damping', 0.0, 1.0).name('smoothing');
  },

  initStars:function() {
    //var prefabGeometry = new THREE.TetrahedronGeometry(0.5);
    var prefabGeometry = new THREE.Geometry();
    prefabGeometry.vertices.push(new THREE.Vector3(-1,  1, 0));
    prefabGeometry.vertices.push(new THREE.Vector3( 1, -1, 0));
    prefabGeometry.vertices.push(new THREE.Vector3(-1, -1, 0));
    prefabGeometry.faces.push( new THREE.Face3(0, 1, 2));

    var mat = new THREE.Matrix4();
    var scl = 0.75;
    mat.multiply(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0));
    mat.multiply(new THREE.Matrix4().makeScale(scl, scl, scl));

    prefabGeometry.applyMatrix(mat);

    var starSystem = new StarAnimationSystem(prefabGeometry, 20000, 400, 1400);
    starSystem.material.emissive.set(config.clearColor);
    this.root.addTo(starSystem, 'earth');

    var earthRotationController = this.earthRotationController;

    this.root.addUpdateCallback(function() {
      starSystem.update();
      starSystem.rotation.y -= earthRotationController.rotationSpeed.y * 1.25;
      //console.log(earthRotationController.rotationSpeed);
    });

    // DAT.GUI

    var folder = this.gui.addFolder('stars');
    utils.createColorController(folder, starSystem.material, 'color', 'star color');
    utils.createColorController(folder, starSystem.material, 'emissive', 'star emissive');
    utils.createColorController(folder, starSystem.material, 'specular', 'star specular');
    folder.add(starSystem.material, 'shininess').name('specular focus');
  },

  initMarkers:function() {
    var prefabGeometry = new THREE.SphereGeometry(0.03, 8, 6);
    var introAnimation = this.introMarkerAnimation = new IntroMarkerAnimationSystem(prefabGeometry, this.markerPositions);
    var idleAnimation = this.idleMakerAnimation = new IdleMarkerAnimationSystem(prefabGeometry, this.markerPositions, introAnimation.geometry.attributes.color.array);

    var earth = this.root.get('earth');
    var halo = this.root.get('halo');
    var earthMatrixInverse = new THREE.Matrix4();

    var searchLight = new THREE.PointLight(0xffffff, 0.0, 8.0, 2.0);
    this.root.addTo(searchLight, 'earth');

    var interactionSettings = {
      overAttenuationDistance: 2.0,
      downAttenuationDistance: 6.0
    };

    if (this.pointerController.isTouchDevice) {
      earth.addEventListener('pointer_down', function(e) {
        updatePointerPosition(e.intersection.point);
        showSearchLight();

        TweenMax.to(idleAnimation, 1.0, {attenuationDistance: interactionSettings.downAttenuationDistance, ease:Power2.easeOut});
      });

      earth.addEventListener('pointer_up', function(e) {
        hideSearchLight();

        TweenMax.to(idleAnimation, 1.0, {attenuationDistance: 0.0, ease:Power2.easeOut});
      });
    }
    else {
      earth.addEventListener('pointer_down', function(e) {
        TweenMax.to(halo.rotationAnimation, 1.0, {timeScale:0.25});
        TweenMax.to(idleAnimation, 1.0, {attenuationDistance: interactionSettings.downAttenuationDistance, ease:Power2.easeOut});
      });

      earth.addEventListener('pointer_up', function(e) {
        TweenMax.to(halo.rotationAnimation, 1.0, {timeScale:1.0});
        TweenMax.to(idleAnimation, 1.0, {attenuationDistance: interactionSettings.overAttenuationDistance, ease:Power2.easeOut});
      });

      earth.addEventListener('pointer_over', function(e) {
        showSearchLight();

        TweenMax.fromTo(idleAnimation, 0.5, {attenuationDistance:0.0}, {attenuationDistance: interactionSettings.overAttenuationDistance, ease:Power2.easeOut});
      });

      earth.addEventListener('pointer_out', function(e) {
        hideSearchLight();

        TweenMax.to(idleAnimation, 0.5, {attenuationDistance:0.0, ease:Power2.easeOut});
      });
    }

    earth.addEventListener('pointer_move', function(e) {
      updatePointerPosition(e.intersection.point);
    });

    function updatePointerPosition(point) {
      earthMatrixInverse.identity().getInverse(earth.matrixWorld);
      point.applyMatrix4(earthMatrixInverse);

      idleAnimation.setPointerPosition(point);

      searchLight.position.copy(point);
      searchLight.position.multiplyScalar(1.25);
    }

    function showSearchLight() {
      TweenMax.fromTo(searchLight, 0.5, {intensity:0.0}, {intensity:1.0, ease:Power2.easeOut});
    }

    function hideSearchLight() {
      TweenMax.to(searchLight, 0.5, {intensity:0.0, ease:Power2.easeOut});
    }

    // DAT.GUI

    var folder = this.gui.addFolder('markers');
    utils.createColorController(folder, idleAnimation.material.uniforms.uPassiveColor, 'value', 'passive color');
    utils.createColorController(folder, idleAnimation.material.uniforms.uActiveColor, 'value', 'active color');
    folder.add(idleAnimation.material.uniforms.uScale.value, 'x').name('passive scale delta');
    folder.add(idleAnimation.material.uniforms.uScale.value, 'y').name('active scale delta');
    folder.add(interactionSettings, 'overAttenuationDistance').name('hover radius');
    folder.add(interactionSettings, 'downAttenuationDistance').name('down radius');

    utils.createColorController(folder, searchLight, 'color', 'light color');
    folder.add(searchLight, 'distance').name('light distance');
    folder.add(searchLight, 'decay').name('light decay');
  },

  createIntroAnimation:function() {
    var rotationController = this.earthRotationController;
    var vignettePass = this.vignettePass;
    var preloader = document.querySelector('#preloader');
    var eventDispatcher = this.eventDispatcher;

    var tl = new TimelineMax({repeat:0});

    tl.call(function() {
      rotationController.enabled = false;
      eventDispatcher.dispatchEvent({type:'preloader_hide_start'});
    });
    tl.to(preloader, 1.00, {opacity:0, ease:Power1.easeIn}, 0);
    tl.set(preloader, {display:'none'}, 1.0);
    tl.add(function() {
      eventDispatcher.dispatchEvent({type:'preloader_hide_complete'});
    }, 1.00);
    tl.add('preloader_hide_complete');

    tl.to(this.root.renderer.domElement, 2.00, {opacity:1, ease:Circ.easeIn}, 0);

    tl.add(this.createCameraAnimation(11), 0.0);
    tl.add(this.createMarkersAnimation(10), 1.0);
    tl.from(vignettePass.uniforms.offset, 11, {value:0}, 0.0);

    tl.add(function() {
      rotationController.enabled = true;
    }, '-=1.0');

    tl.timeScale(2);

    // gui
    var ctrl = {
      replay:function() {
        tl.play('preloader_hide_complete');
      }
    };

    this.gui.add(ctrl, 'replay').name('replay intro');
  },

  createMarkersAnimation:function(duration) {
    var introAnimation = this.introMarkerAnimation;
    var idleAnimation = this.idleMakerAnimation;

    var tl = new TimelineMax();
    var root = this.root;

    tl.call(function() {
      root.remove(introAnimation);
      root.remove(idleAnimation);

      root.addTo(introAnimation, 'earth');
    });
    tl.fromTo(introAnimation, duration, {animationProgress:0}, {animationProgress:1, ease:Power0.easeIn});
    tl.call(function() {
      root.remove(introAnimation);
      root.addTo(idleAnimation, 'earth');

      root.addUpdateCallback(function() {
        idleAnimation.update();
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

    function update() {
      var x = Math.cos(proxy.angle) * proxy.distance;
      var y = proxy.eyeHeight;
      var z = Math.sin(proxy.angle) * proxy.distance;

      camera.position.set(x, y, z);
      camera.lookAt(target);
    }

    var tl = new TimelineMax({onUpdate: update});

    tl.to(proxy, duration, {angle:Math.PI * -1.5, distance:32, eyeHeight:eyeHeight, ease:Power1.easeInOut});

    update();

    return tl;
  },

  setGlobeTexture:function(image) {
    this.root.objects['earth'].material.map.image = image;
    this.root.objects['earth'].material.map.needsUpdate = true;
    this.root.objects['earth'].material.map.anisotropy = config.maxAnisotropy;
  },
};

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

// colors getters for gui
Object.defineProperty(THREE.BAS.PhongAnimationMaterial.prototype, 'color', {
  get: function () {
    return this.uniforms.diffuse.value;
  },
  set: function (v) {
    this.uniforms.diffuse.value.set(v);
  }
});
Object.defineProperty(THREE.BAS.PhongAnimationMaterial.prototype, 'specular', {
  get: function () {
    return this.uniforms.specular.value;
  },
  set: function (v) {
    this.uniforms.specular.value.set(v);
  }
});
Object.defineProperty(THREE.BAS.PhongAnimationMaterial.prototype, 'emissive', {
  get: function () {
    return this.uniforms.emissive.value;
  },
  set: function (v) {
    this.uniforms.emissive.value.set(v);
  }
});
Object.defineProperty(THREE.BAS.PhongAnimationMaterial.prototype, 'shininess', {
  get: function () {
    return this.uniforms.shininess.value;
  },
  set: function (v) {
    this.uniforms.shininess.value = v;
  }
});
Object.defineProperty(THREE.BAS.BasicAnimationMaterial.prototype, 'color', {
  get: function () {
    return this.uniforms.diffuse.value;
  },
  set: function (v) {
    this.uniforms.diffuse.value.set(v);
  }
});