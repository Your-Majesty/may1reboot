function ObjectRotationController(object, element) {
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

  var dragSpeed = 0.0035;
  var autoRotateSpeed = -0.0025;
  var damping = 0.05;
  var vMin = -Math.PI * 0.5;
  var vMax = 0.25;

  object.addEventListener('pointer_down', function(e) {
    if (!enabled) return;

    isDragging = true;

    startPosition.copy(e.pointer).sub(center);
    startRotation.copy(targetRotation);
  });

  object.addEventListener('pointer_up', function(e) {
    if (!enabled) return;

    isDragging = false;
  });

  object.addEventListener('pointer_move', function(e) {
      if (!enabled || !isDragging) return;

      position.copy(e.pointer).sub(center);

      delta.subVectors(position, startPosition);
      targetRotation.copy(startRotation);
      targetRotation.addScaledVector(delta, dragSpeed);
  });

  this.update = function() {
    if (!enabled) return;

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

  Object.defineProperty(this, 'dragSpeed', {
    get:function() {return dragSpeed},
    set:function(v) {dragSpeed = v}
  });
  Object.defineProperty(this, 'autoRotateSpeed', {
    get:function() {return autoRotateSpeed},
    set:function(v) {autoRotateSpeed = v}
  });
  Object.defineProperty(this, 'damping', {
    get:function() {return damping},
    set:function(v) {damping = v}
  });

  Object.defineProperty(this, 'rotationSpeed', {
    get:function() {return rotationSpeed}
  });
}
