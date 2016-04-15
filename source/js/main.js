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
  this.root.renderer.setClearColor(0x101010);

  this.root.camera.position.y = 160;

  var light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(-2.0, 4.0, 1).normalize();
  this.root.add(light, 'dirLight1');

  this.initPostProcessing();

  TweenMax.set(this.root.renderer.domElement, {opacity:0});

  var loader = new THREE.TextureLoader();

  loader.load('res/tex/earth_lights.png', _.bind(function(texture) {
    this.processMarkerPositions(texture.image);

    this.initEarth(texture);
    this.initStars();
    this.createIntroAnimation();

  }, this));

  console.warn = function() {};
};
Globe.prototype = {
  initPostProcessing:function() {
    var renderPass = new THREE.RenderPass(this.root.scene, this.root.camera);
    var bloomPass = new THREE.BloomPass(2, 25, 4.0, 512);
    var hBlurPass = new THREE.ShaderPass(THREE.HorizontalBlurShader);
    var vBlurPass = new THREE.ShaderPass(THREE.VerticalBlurShader);
    var copyPass = new THREE.ShaderPass(THREE.CopyShader);
    var vignettePass = new THREE.ShaderPass(THREE.VignetteShader);

    var blendPass = new THREE.ShaderPass(THREE.BlendShader, 'tDiffuse1');
    var savePass = new THREE.SavePass(new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight));

    hBlurPass.uniforms.h.value = 1.0 / window.innerWidth;
    vBlurPass.uniforms.v.value = 1.0 / window.innerHeight;
    hBlurPass.uniforms.strength.value = 1.0;
    vBlurPass.uniforms.strength.value = 1.0;

    vignettePass.uniforms.offset.value = 1.0;
    vignettePass.uniforms.darkness.value = 1.25;
    vignettePass.uniforms.centerOffset.value.y = 0.3;

    //this.hBlurPass = hBlurPass;
    //this.vBlurPass = vBlurPass;
    this.vignettePass = vignettePass;

    blendPass.uniforms['tDiffuse2'].value = savePass.renderTarget;
    blendPass.uniforms['mixRatio'].value = 0.5;
    blendPass.uniforms['opacity'].value = 1.00;

    this.root.initPostProcessing([
      renderPass,
      bloomPass,
      //hBlurPass,
      //vBlurPass,
      blendPass,
      savePass,
      vignettePass
    ]);
  },

  //update:function() {
    //if (this.lastCamPos) {
    //  var delta = new THREE.Vector3();
    //
    //  delta.subVectors(this.root.camera.position, this.lastCamPos);
    //
    //  var lx = delta.x * 0.25;
    //  var ly = delta.y * 0.25;
    //
    //  this.hBlurPass.uniforms.strength.value = lx;
    //  this.vBlurPass.uniforms.strength.value = ly;
    //}
    //
    //this.lastCamPos = this.root.camera.position.clone();
  //},

  processMarkerPositions:function(dataImage) {
    this.markerPositions = [];

    var cnv = document.createElement('canvas');
    var ctx = cnv.getContext('2d');

    cnv.width = dataImage.width * 0.5;
    cnv.height = dataImage.height * 0.5;
    ctx.drawImage(dataImage, 0, 0, cnv.width, cnv.height);

    var data = ctx.getImageData(0, 0, cnv.width, cnv.height).data;
    var threshold = 240;

    var positions = [];

    for (var i = 0; i < data.length; i+=4) {
      var r = data[i];

      if (r > threshold) {
        var x = (i / 4) % cnv.width;
        var y = ((i / 4) / cnv.width) | 0;

        positions.push({x:x / cnv.width, y:y / cnv.height});
      }
    }

    positions.sort(function(a, b) {
      return a.x < b.x;
    });

    console.log('position count', positions.length);

    for (var j = 0; j < positions.length; j++) {
      var p = positions[j];
      var lat = THREE.Math.mapLinear(p.y, 0, 1, 90, -90);
      var lon = THREE.Math.mapLinear(p.x, 0, 1, -180, 180);

      this.markerPositions[j] = utils.llToVec(lat, lon, config.earthRadius);
    }
  },

  initEarth:function() {
    var earth = new THREE.Mesh(
      new THREE.SphereGeometry(config.earthRadius, 100, 100),
      new THREE.MeshPhongMaterial({
        map: new THREE.Texture(),

        emissive:0x070707,

        displacementMap: THREE.ImageUtils.loadTexture('res/tex/earth_disp.jpg'),
        displacementScale: 0.5,
        displacementBias: -0.1,

        bumpMap: THREE.ImageUtils.loadTexture('res/tex/earth_bump.png'),
        bumpScale: 0.05,

        specularMap: THREE.ImageUtils.loadTexture('res/tex/earth_spec.jpg'),
        specular: 0x222222,
        shininess: 8
      })
    );
    var halo = new THREE.Mesh(
      new THREE.SphereGeometry(config.earthRadius + 0.75, 64, 64),
      new AtmosphereMaterial({
        alphaMap:'res/tex/earth_cld_alpha.jpg',
        color:0xAFD2E4,
        power:4.0,
        coefficient:0.8
      })
    );

    TweenMax.to(halo.rotation, 24, {y:Math.PI * 2, ease:Power0.easeIn, repeat:-1});

    earth.add(halo);

    this.root.add(earth, 'earth');

    var earthRotationController = new ObjectRotator(earth);

    this.root.addUpdateCallback(function() {
      earthRotationController.update();
    });
  },

  setGlobeTexture:function(image) {
    this.root.objects['earth'].material.map = new THREE.Texture(image);
    this.root.objects['earth'].material.map.needsUpdate = true;
  },

  initStars:function() {
    var prefabGeometry = new THREE.TetrahedronGeometry(0.75);
    var starSystem = new StarAnimationSystem(prefabGeometry, 8000, 100, 2000);

    this.root.addUpdateCallback(function() {
      starSystem.update();
    });

    this.root.add(starSystem);
  },

  createIntroAnimation:function() {
    //var controls = this.root.controls;
    //var hBlurPass = this.hBlurPass;
    //var vBlurPass = this.vBlurPass;
    var vignettePass = this.vignettePass;

    var tl = new TimelineMax({repeat:0});

    tl.call(function() {
      //controls.enabled = false;
      //hBlurPass.enabled = false;
      //vBlurPass.enabled = false;
    });
    tl.to(this.root.renderer.domElement, 0.25, {opacity:1}, 0);

    tl.add(this.createCameraAnimation(10), 0.0);
    tl.add(this.createMarkersAnimation(10), 0.0);
    tl.fromTo(vignettePass.uniforms.offset, 10, {value:0}, {value:1.0}, 0);

    tl.call(function() {
      //controls.enabled = true;
      //hBlurPass.enabled = true;
      //vBlurPass.enabled = true;
    });

    tl.timeScale(2);
  },

  createMarkersAnimation:function(duration) {
    var prefabGeometry = new THREE.SphereGeometry(0.025, 16, 16);
    var markerSystem = new MarkerAnimationSystem(prefabGeometry, this.markerPositions);
    var animation = TweenMax.fromTo(markerSystem, duration,
      {animationProgress:0},
      {animationProgress:1, ease:Power0.easeIn}
    );

    this.root.objects['earth'].add(markerSystem);

    return animation;
  },

  createCameraAnimation:function(duration) {
    var proxy = {
      angle:Math.PI * 1.25,
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

    tl.to(proxy, duration, {angle:Math.PI * -1.5, distance:32, eyeHeight:eyeHeight, ease:Power1.easeOut});

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
