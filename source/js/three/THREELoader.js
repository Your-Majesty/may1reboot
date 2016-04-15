function THREELoader(onComplete) {
  this.manager = new THREE.LoadingManager(onComplete);
  this.data = {};
}
THREELoader.prototype = {
  loadTexture: function(key, path, onComplete) {
    var data = this.data;

    new THREE.TextureLoader(this.manager).load(path, function(texture) {
      data[key] = texture;
      onComplete && onComplete(texture);
    });
  },
  get: function(key) {
    return this.data[key];
  }
};
