//=require ../vendor/**/*.js

//=require marker_data.js

//=require utils.js
//=require three/*.js
//=require objects/*.js
//=require controllers/*.js

var config = {
  earthRadius:8,
  maxAnisotropy:1,

  dirBlurFactor:16,
  clearColor:'#000000'
};

var Globe = function(textureRoot) {
  // init root / do some basic scene stuff
  this.root = new THREERoot({
    createCameraControls: !true,
    autoStart: false,
    fov: 20
  });

  this.root.renderer.setClearColor(config.clearColor);
  this.root.camera.position.y = 160;

  var light = new THREE.DirectionalLight(0xffffff, 2.0);
  light.position.set(-1.0, 0.5, -0.1);
  this.root.add(light, 'main_light');

  this.root.addResizeCallback(_.bind(function() {
    this.root.camera.position.z = this.computeCameraDistance();
  }, this));

  // init event dispatcher
  this.eventDispatcher = new THREE.EventDispatcher();

  // for three.js inspector
  window.scene = this.root.scene;

  // improve texture rendering near poles
  config.maxAnisotropy = this.root.renderer.getMaxAnisotropy();

  // mobile / destkop settings
  var device = new MobileDetect(window.navigator.userAgent);
  this.mobileMode = device.mobile();

  if (!this.mobileMode) {
    this.initGUI();
  }

  if (this.mobileMode) {
    this.initMobileResizeMode();
  }

  // load the things
  this.loader = new THREELoader(_.bind(this.loadedHandler, this), textureRoot);
  //this.loader.loadTexture('earth_data', 'earth_data.jpg');
  this.loader.loadTexture('earth_color', 'earth_color_2x.jpg');
  this.loader.loadTexture('earth_disp', 'earth_disp.jpg');
  this.loader.loadTexture('earth_bump', 'earth_bump.jpg');
  this.loader.loadTexture('earth_spec', 'earth_spec.jpg');
  this.loader.loadTexture('cloud_alpha_map', 'earth_cld_alpha.jpg');

  // console things
  console.warn = function() {}; // shhhhh!
  console.log("Howdy! WebGL goodies brought to you by @zadvorsky. Press '~' to play around with our development settings :D");

  // DAT.GUI
  if (!this.gui) return;

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
  loadedHandler:function() {
    this.pointerController = new PointerController(this.root.camera); //this.root.renderer.domElement
    this.root.addUpdateCallback(_.bind(this.pointerController.update, this.pointerController));

    this.processMarkerPositions();

    this.initEarth();
    this.initStars();
    this.initMarkers();
    this.initAsteroids();

    if (!this.mobileMode) {
      this.initPostProcessing();
    }

    this.createIntroAnimation();

    this.root.start();
  },

  initMobileResizeMode: function() {
    window.removeEventListener('resize', this.root.resize);

    var currentWidth = window.innerWidth;
    var currentHeight = window.innerHeight;

    var globeContainer = document.querySelector('.globe');

    globeContainer.style.height = currentHeight + 'px';

    this.root.resize = _.bind(function() {
      var newWidth = window.innerWidth;
      var newHeight = window.innerHeight;

      if (newWidth === currentWidth) return;

      currentWidth = newWidth;
      currentHeight = newHeight;

      globeContainer.style.height = currentHeight + 'px';

      this.camera.aspect = currentWidth / currentHeight;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(currentWidth, currentHeight);

      this.resizeCallbacks.forEach(function(callback) {callback()});
    }, this.root);

    window.addEventListener('resize', this.root.resize, false);
  },

  initGUI:function() {
    var gui = this.gui = new dat.GUI();

    gui.domElement.style.visibility = 'hidden';
    gui.domElement.parentNode.style.zIndex = '9001';
    gui.width = 400;

    var overlay = document.querySelector('.special-headline');

    var debugCamera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 10000);

    debugCamera.position.z = 100;

    this.root.addResizeCallback(function() {
      debugCamera.aspect = window.innerWidth / window.innerHeight;
      debugCamera.updateProjectionMatrix();
    });

    var controls = new THREE.OrbitControls(debugCamera);
    var defaultCamera = this.root.camera;
    var usingDebugCamera = false;
    var _this = this;

    controls.enabled = false;

    var ctrl = {
      toggleDebugCamera:function() {
        if (usingDebugCamera) {
          controls.enabled = false;
          _this.earthRotationController.enabled = true;
          _this.pointerController.enabled = true;
          _this.root.get('extra_special').visible = false;
          _this.renderPass.camera = defaultCamera;
        }
        else {
          controls.enabled = true;
          _this.earthRotationController.enabled = false;
          _this.pointerController.enabled = false;
          _this.root.get('extra_special').visible = true;
          _this.renderPass.camera = debugCamera;
        }

        usingDebugCamera = !usingDebugCamera;
      }
    };

    gui.add(ctrl, 'toggleDebugCamera').name('toggle debug cam & controls');

    window.addEventListener('keydown', function(e) {
      if (e.keyCode === 192) { // tilde
        if (gui.domElement.style.visibility === 'hidden') {
          gui.domElement.style.visibility = 'visible';
          overlay && (overlay.style.display = 'none');
        }
        else {
          gui.domElement.style.visibility = 'hidden';
          overlay && (overlay.style.display = '');
        }
      }
    });
  },

  initPostProcessing:function() {
    var renderPass = new THREE.RenderPass(this.root.scene, this.root.camera);
    var hBlurPass = new THREE.ShaderPass(THREE.HorizontalBlurShader);
    var vBlurPass = new THREE.ShaderPass(THREE.VerticalBlurShader);
    var copyPass = new THREE.ShaderPass(THREE.CopyShader);

    this.renderPass = renderPass;

    hBlurPass.uniforms.h.value = 1.0 / window.innerWidth;
    vBlurPass.uniforms.v.value = 1.0 / window.innerHeight;

    this.root.initPostProcessing([
      renderPass,
      hBlurPass,
      vBlurPass,
      copyPass
    ]);

    this.root.addUpdateCallback(_.bind(function() {
      var rs = this.earthRotationController.rotationSpeed;
      var v = Math.abs(rs.y) * config.dirBlurFactor;

      if (v >= 0.1) {
        hBlurPass.enabled = true;
        vBlurPass.enabled = true;
        copyPass.renderToScreen = false;
        vBlurPass.renderToScreen = true;

        hBlurPass.uniforms.strength.value = v;
        vBlurPass.uniforms.strength.value = v * 0.25;
      }
      else {
        hBlurPass.enabled = false;
        vBlurPass.enabled = false;
        copyPass.renderToScreen = true;
        vBlurPass.renderToScreen = false;
      }
    }, this));

    this.root.addResizeCallback(function() {
      hBlurPass.uniforms.h.value = 1.0 / window.innerWidth;
      vBlurPass.uniforms.v.value = 1.0 / window.innerHeight;
    });

    // DAT.GUI
    if (!this.gui) return;

    var folder = this.gui.addFolder('postprocessing');
    folder.add(config, 'dirBlurFactor').name('motion blur factor');
  },

  processMarkerPositions:function() {
    //var markerImage = this.loader.get('earth_data').image;
    //var markerCnv = document.createElement('canvas');
    //var markerCtx = markerCnv.getContext('2d');
    //
    //markerCnv.width = markerImage.width;
    //markerCnv.height = markerImage.height;
    //markerCtx.drawImage(markerImage, 0, 0, markerCnv.width, markerCnv.height);
    //
    //var elevationImage = this.loader.get('earth_disp').image;
    //var elevationCnv = document.createElement('canvas');
    //var elevationCtx = elevationCnv.getContext('2d');
    //
    //elevationCnv.width = markerImage.width;
    //elevationCnv.height = markerImage.height;
    //elevationCtx.drawImage(elevationImage, 0, 0, markerCnv.width, markerCnv.height);
    //
    //var markerData = markerCtx.getImageData(0, 0, markerCnv.width, markerCnv.height).data;
    //var elevationData = elevationCtx.getImageData(0, 0, elevationCnv.width, elevationCnv.height).data;
    //
    //var threshold = 255;
    //var elevationScale = 0.4;
    //var elevationOffset = 0.2;
    //
    //var positions = [];
    //
    //for (var i = 0; i < markerData.length; i+=4) {
    //  var r = markerData[i];
    //
    //  if (r >= threshold) {
    //    var x = ((i / 4) % markerCnv.width) / markerCnv.width;
    //    var y = (((i / 4) / markerCnv.width) | 0) / markerCnv.height;
    //    var elevation = (elevationData[i] / 255 * elevationScale) + elevationOffset;
    //
    //    positions.push({x: x, y: y, elevation: elevation});
    //  }
    //}
    //
    //positions.sort(function(a, b) {
    //  return a.x < b.x;
    //});
    //console.log(JSON.stringify(positions));

    // output from the commented function above
    var positions = JSON.parse(window.markerDataStr);

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

        displacementMap: this.mobileMode ? undefined : this.loader.get('earth_disp'),
        displacementScale: 0.55,
        displacementBias: -0.10,

        bumpMap: this.loader.get('earth_bump'),
        bumpScale: 0.1,

        specularMap: this.loader.get('earth_spec'),
        specular: 0x878787,
        shininess: 1.0
      })
    );
    var halo = new THREE.Mesh(
      new THREE.SphereGeometry(config.earthRadius, 100, 100),
      new AtmosphereMaterial({
        alphaMap: this.loader.get('cloud_alpha_map'),
        color: 0xAFD2E4,
        power: 7.0,
        coefficient: 1.0 // weird ios bug causes blackness with values < 1 :(
      })
    );

    halo.scale.setScalar(1.125);

    TweenMax.to(halo.scale, 6, {x:1.175, y:1.175, z: 1.175, ease:Power1.easeInOut, repeat:-1, yoyo:true});

    halo.rotationAnimation = TweenMax.to(halo.rotation, 16, {y:Math.PI * 2, ease:Power0.easeIn, repeat:-1});

    this.root.add(earth, 'earth');
    this.root.addTo(halo, 'earth', 'halo');
    this.pointerController.register(earth);

    this.earthRotationController = new ObjectRotationController(earth, this.root.renderer.domElement);
    this.root.addUpdateCallback(_.bind(this.earthRotationController.update, this.earthRotationController));

    // DAT.GUI
    if (!this.gui) return;

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
    var scl = 0.5;
    mat.multiply(new THREE.Matrix4().makeScale(scl, scl, scl));

    prefabGeometry.applyMatrix(mat);
    prefabGeometry.center();

    var starSystem = new StarAnimationSystem(prefabGeometry, 20000, 400, 1400);
    this.root.addTo(starSystem, 'earth', 'stars');

    var earthRotationController = this.earthRotationController;

    this.root.addUpdateCallback(function() {
      starSystem.update();
      starSystem.rotation.y -= earthRotationController.rotationSpeed.y * 1.25;
    });

    // DAT.GUI
    if (!this.gui) return;

    var folder = this.gui.addFolder('stars');
    utils.createColorController(folder, starSystem.material, 'color', 'star color');
  },

  initAsteroids:function() {
    var prefabGeometry = new THREE.TetrahedronGeometry(2.0);

    var asteroidSystem = new AsteroidAnimationSystem(prefabGeometry, 200, 50, 400);

    this.root.add(asteroidSystem);

    this.root.addUpdateCallback(function() {
      asteroidSystem.update();
    });

    // DAT.GUI
    if (!this.gui) return;

    var extraSpecialGeometry = new THREE.TetrahedronGeometry(1.0);
    var extraSpecial = new AsteroidAnimationSystem(extraSpecialGeometry, 600, 0, 0);
    this.root.add(extraSpecial, 'extra_special');

    this.root.addUpdateCallback(function() {
      extraSpecial.update(0.1);
    });

    var folder = this.gui.addFolder('asteroids');
    utils.createColorController(folder, asteroidSystem.material, 'color', 'asteroid color');
    utils.createColorController(folder, asteroidSystem.material, 'emissive', 'asteroid emissive');
    utils.createColorController(folder, asteroidSystem.material, 'specular', 'asteroid specular');
    folder.add(asteroidSystem.material, 'shininess').name('specular focus');
  },

  initMarkers:function() {
    var prefabGeometry = new THREE.SphereGeometry(0.015, 8, 6);
    var introAnimation = this.introMarkerAnimation = new IntroMarkerAnimationSystem(prefabGeometry, this.markerPositions);
    var idleAnimation = this.idleMakerAnimation = new IdleMarkerAnimationSystem(prefabGeometry, this.markerPositions, introAnimation.geometry.attributes.color.array);

    var earth = this.root.get('earth');
    var halo = this.root.get('halo');
    var earthMatrixInverse = new THREE.Matrix4();

    var searchLight = new THREE.PointLight(0xffffff, 0.0, 8.0, 2.0);
    this.root.addTo(searchLight, 'earth');

    this.root.addUpdateCallback(function() {
      idleAnimation.update();
    });

    var interactionSettings = {
      overAttenuationDistance: 2.0,
      downAttenuationDistance: 4.0
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
      TweenMax.fromTo(searchLight, 0.5, {intensity:0.0}, {intensity:2.0, ease:Power2.easeOut});
    }

    function hideSearchLight() {
      TweenMax.to(searchLight, 0.5, {intensity:0.0, ease:Power2.easeOut});
    }

    // DAT.GUI
    if (!this.gui) return;

    var folder = this.gui.addFolder('markers');
    //utils.createColorController(folder, idleAnimation.material.uniforms.uPassiveColor, 'value', 'passive color');
    utils.createColorController(folder, idleAnimation.material.uniforms.uActiveColor, 'value', 'active color');
    folder.add(idleAnimation.material.uniforms.uScale.value, 'x').name('scale');
    folder.add(idleAnimation.material.uniforms.uScale.value, 'y').name('passive scale delta');
    folder.add(idleAnimation.material.uniforms.uScale.value, 'z').name('active scale delta');
    folder.add(interactionSettings, 'overAttenuationDistance').name('hover radius');
    folder.add(interactionSettings, 'downAttenuationDistance').name('down radius');

    utils.createColorController(folder, searchLight, 'color', 'light color');
    folder.add(searchLight, 'distance').name('light distance');
    folder.add(searchLight, 'decay').name('light decay');
  },

  createIntroAnimation:function() {
    var rotationController = this.earthRotationController;
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

    tl.fromTo(this.root.get('main_light'), 10.0, {intensity:0.0}, {intensity:2.0}, 0.0);

    tl.add(this.createCameraAnimation(11), 0.0);
    tl.add(this.createMarkersAnimation(10), 1.0);

    tl.add(function() {
      rotationController.enabled = true;
    }, '-=1.0');

    tl.timeScale(2);

    // gui
    if (!this.gui) return;

    var ctrl = {
      replay:function() {
        rotationController.enabled = false;
        rotationController.reset();
        tl.play('preloader_hide_complete');
      },
      timeScale:tl.timeScale()
    };

    var folder = this.gui.addFolder('intro');

    folder.add(ctrl, 'timeScale').name('animation time scale').onChange(function(v) {
      tl.timeScale(v);
    });
    folder.add(ctrl, 'replay').name('replay intro');
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

      idleAnimation.resetIdleAnimation();
    });

    return tl;
  },
  createCameraAnimation:function(duration) {
    var proxy = {
      angle:Math.PI * -3.5,
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
    var distance = this.computeCameraDistance();

    tl.to(proxy, duration, {angle:Math.PI * -1.5, distance:distance, eyeHeight:eyeHeight, ease:Power1.easeInOut});

    update();

    return tl;
  },

  computeCameraDistance:function() {
    var ratio = window.innerWidth / window.innerHeight;
    var distance;

    if (ratio < 1.0) {
      distance = 32 + 64 * (1.0 - ratio);
    }
    else {
      distance = 32;
    }

    return distance;
  },

  setGlobeTexture:function(image) {
    this.root.objects['earth'].material.map.image = image;
    this.root.objects['earth'].material.map.needsUpdate = true;
    this.root.objects['earth'].material.map.anisotropy = config.maxAnisotropy;
  },

  enableScrollLock:function() {
    this.pointerController.scrollLocked = true;
  },
  disableScrollLock:function() {
    this.pointerController.scrollLocked = false;
    this.pointerController.touchEnabled = false;
  },

  addEventListener:function(type, handler) {
    this.eventDispatcher.addEventListener(type, handler);
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