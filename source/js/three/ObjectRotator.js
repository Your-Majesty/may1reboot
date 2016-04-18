function ObjectRotator(object, camera, element) {
  element = element || window;

  var isDragging = false;

  var center = new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5);

  var position = new THREE.Vector2();
  var startPosition = new THREE.Vector2();
  var targetRotation = new THREE.Vector2();
  var startRotation = new THREE.Vector2();
  var delta = new THREE.Vector2();

  var dragSpeed = 0.01;
  var autoRotateSpeed = 0.01;
  var damping = 0.05;
  var vMin = -Math.PI * 0.5;
  var vMax = 0.25;

  var rayCaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();

  var enabled = true;

  Object.defineProperty(this, 'enabled', {
    get:function() {return enabled},
    set:function(v) {enabled = v}
  });

  element.addEventListener('mousedown', function(e) {
    if (!enabled) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    rayCaster.setFromCamera(mouse, camera);

    if (rayCaster.intersectObject(object).length > 0) {
      isDragging = true;

      startPosition.set(e.clientX, e.clientY).sub(center);
      startRotation.copy(targetRotation);
    }
  });
  element.addEventListener('mouseup', function(e) {
    if (!enabled) return;

    isDragging = false;
  });
  element.addEventListener('mousemove', function(e) {
    if (!enabled || !isDragging) return;

    position.set(e.clientX, e.clientY).sub(center);

    delta.subVectors(position, startPosition);
    targetRotation.copy(startRotation);
    targetRotation.addScaledVector(delta, dragSpeed);
  });

  this.update = function() {
    if (!isDragging) {
      targetRotation.x += autoRotateSpeed;
    }

    object.rotation.y += (targetRotation.x - object.rotation.y) * damping;
    object.rotation.x += (targetRotation.y - object.rotation.x) * damping;

    object.rotation.x = THREE.Math.clamp(object.rotation.x, vMin, vMax);
    targetRotation.y = THREE.Math.clamp(targetRotation.y, vMin, vMax);
  }
}
