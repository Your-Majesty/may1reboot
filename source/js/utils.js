var utils = {
  llToVec:function(lat, lon, radius, v) {
    var phi = (lat) * Math.PI / 180;
    var theta = (lon - 180) * Math.PI / 180;

    var x = -(radius) * Math.cos(phi) * Math.cos(theta);
    var y = (radius) * Math.sin(phi);
    var z = (radius) * Math.cos(phi) * Math.sin(theta);

    v = v || new THREE.Vector3();
    v.set(x, y, z);

    return v;
  },
  randomSpherical:function(minRadius, maxRadius, v) {
    var phi = Math.random() * Math.PI * 2;
    var theta = Math.random() * Math.PI * 2;
    var radius = THREE.Math.randFloat(minRadius, maxRadius);

    var x = -(radius) * Math.cos(phi) * Math.cos(theta);
    var y = (radius) * Math.sin(phi);
    var z = (radius) * Math.cos(phi) * Math.sin(theta);

    v = v || new THREE.Vector3();
    v.set(x, y, z);

    return v;
  }
};
