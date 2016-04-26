function THREELoader(onComplete, textureRoot) {
  this.textureRoot = (textureRoot || '') + '/';
  this.manager = new THREE.LoadingManager(onComplete);
  this.data = {};
}
THREELoader.prototype = {
  loadTexture: function(key, path, onComplete) {
    var data = this.data;

    new THREE.TextureLoader(this.manager).load(this.textureRoot + path, function(texture) {
      texture.anisotropy = config.maxAnisotropy;

      data[key] = texture;
      onComplete && onComplete(texture);
    });
  },
  get: function(key) {
    return this.data[key];
  }
};
