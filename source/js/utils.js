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
  },

  fibSpherePoint: (function() {
    var vec = {x:0, y:0, z:0};
    var G = Math.PI * (3 - Math.sqrt(5));

    return function(i, n, radius) {
      var step = 2.0 / n;
      var r, phi;

      vec.y = i * step - 1 + (step * 0.5);
      r = Math.sqrt(1 - vec.y * vec.y);
      phi = i * G;
      vec.x = Math.cos(phi) * r;
      vec.z = Math.sin(phi) * r;

      radius = radius || 1;

      vec.x *= radius;
      vec.y *= radius;
      vec.z *= radius;

      return vec;
    }
  })(),
  spherePoint: (function() {
    return function(u, v) {
      u === undefined && (u = Math.random());
      v === undefined && (v = Math.random());

      var theta = 2 * Math.PI * u;
      var phi = Math.acos(2 * v - 1);

      var vec = {};
      vec.x = (Math.sin(phi) * Math.cos(theta));
      vec.y = (Math.sin(phi) * Math.sin(theta));
      vec.z = (Math.cos(phi));

      return vec;
    }
  })(),




  // uses TweenMax
  ease:function(ease, t, b, c, d) {
    return b + ease.getRatio(t / d) * c;
  },
  applyUniformValues: function(uniforms, values) {
    for (var key in uniforms) {
      values[key] && (uniforms[key].value = values[key]);
    }
  },

  createColorController:function(gui, target, prop, name) {
    var proxy = {};

    proxy[prop] = '#' + target[prop].getHexString();

    var g = gui.addColor(proxy, prop).onChange(applyColor(target, prop));

    name && g.name(name);

    function applyColor(target, prop) {
      var colorObject = target[prop];

      return function(color) {
        colorObject.set(color);
      };
    }

    return g;
  },

  isElementInViewport: function(el) {
    var rect = el.getBoundingClientRect();

    return (rect.bottom >= 0);
  }
};
