function ObjectRotator(object, camera, element) {
  element = element || window;

  var enabled = true;
  var isDragging = false;

  var center = new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5);
  var position = new THREE.Vector2();
  var startPosition = new THREE.Vector2();
  var targetRotation = new THREE.Vector2();
  var startRotation = new THREE.Vector2();
  var delta = new THREE.Vector2();
  var rotationSpeed = new THREE.Vector2();

  var dragSpeed = 0.0025;
  var autoRotateSpeed = 0.0025;
  var damping = 0.05;
  var vMin = -Math.PI * 0.5;
  var vMax = 0.25;

  var rayCaster = new THREE.Raycaster();
  var mouseNDC = new THREE.Vector2();
  var objectPointerIntersections = [];

  function updateIntersections() {

    rayCaster.setFromCamera(mouseNDC, camera);
    object.updateMatrixWorld(true);

    objectPointerIntersections = rayCaster.intersectObject(object);
  }

  element.addEventListener('mousedown', function(e) {
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (!enabled) return;

    if (objectPointerIntersections.length > 0) {
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
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (!enabled || !isDragging) return;

    position.set(e.clientX, e.clientY).sub(center);

    delta.subVectors(position, startPosition);
    targetRotation.copy(startRotation);
    targetRotation.addScaledVector(delta, dragSpeed);
  });

  this.update = function() {

    updateIntersections();

    if (!isDragging) {
      targetRotation.x += autoRotateSpeed;
    }

    rotationSpeed.y = (targetRotation.x - object.rotation.y) * damping;
    rotationSpeed.x = (targetRotation.y - object.rotation.x) * damping;

    object.rotation.x += rotationSpeed.x;
    object.rotation.y += rotationSpeed.y;

    object.rotation.x = THREE.Math.clamp(object.rotation.x, vMin, vMax);
    targetRotation.y = THREE.Math.clamp(targetRotation.y, vMin, vMax);
  };

  Object.defineProperty(this, 'enabled', {
    get:function() {return enabled},
    set:function(v) {enabled = v}
  });

  Object.defineProperty(this, 'rotationSpeed', {
    get:function() {return rotationSpeed}
  });

  Object.defineProperty(this, 'objectPointerIntersections', {
    get:function() {return objectPointerIntersections}
  });
}
