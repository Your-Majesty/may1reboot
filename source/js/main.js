//=require ../vendor/**/*.js

//=require utils.js
//=require three/*.js

var Globe = function() {
  this.root = new THREERoot();
  this.root.camera.position.set(0, 0, 30);

  this.initSphere();
  this.initMarkers();
};
Globe.prototype = {
  initSphere:function() {
    var geo = new THREE.SphereGeometry(10, 32, 32);
    var mat = new THREE.MeshBasicMaterial({
      wireframe: false,
      map: THREE.ImageUtils.loadTexture('res/tex/earth_map.jpg')
    });
    var mesh = new THREE.Mesh(geo, mat);

    this.root.scene.add(mesh);
  },

  initMarkers:function() {
    var geo = new THREE.SphereGeometry(0.1);
    var mat = new THREE.MeshBasicMaterial({
      color:0xff0000
    });
    var scene = this.root.scene;

    function addMarker(lat, long) {
      var mesh = new THREE.Mesh(geo, mat);
      utils.llToVec(lat, long, 10, mesh.position);
      scene.add(mesh);
    }

    for (var i = 0; i < 100; i++) {
      var lat = Math.random() * 360;
      var long = Math.random() * 360;

      addMarker(lat, long);
    }
  }
};

window.globe = new Globe();
