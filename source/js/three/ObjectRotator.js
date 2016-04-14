function ObjectRotator(object, element) {
  element = element || window;

  this.object = object;

  var isDragging = false;
  var lastPosition = new THREE.Vector2();
  var delta = new THREE.Vector2();
  var quaternion = new THREE.Quaternion();
  var euler = new THREE.Euler();

  element.addEventListener('mousedown', function(e) {
    isDragging = true;

    lastPosition.x = e.clientX;
    lastPosition.y = e.clientY;
  });
  element.addEventListener('mouseup', function(e) {
    isDragging = false;
  });
  element.addEventListener('mousemove', function(e) {

    if (!isDragging) return;

    delta.x = e.clientX - lastPosition.x;
    delta.y = e.clientY - lastPosition.y;

    lastPosition.x = e.clientX;
    lastPosition.y = e.clientY;

    euler.set(
      THREE.Math.degToRad(delta.y),
      THREE.Math.degToRad(delta.x),
      0
    );
    quaternion.setFromEuler(euler);

    object.quaternion.multiplyQuaternions(quaternion, object.quaternion);
  });
}
ObjectRotator.prototype = {
  update:function() {

  }
};
