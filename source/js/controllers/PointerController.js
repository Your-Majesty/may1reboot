function PointerController(camera, element) {
  element = element || window;

  var enabled = true;

  var rayCaster = new THREE.Raycaster();
  var pointerNDC = new THREE.Vector2();
  var pointerXY = new THREE.Vector2();
  var intersections = [];
  var objects = [];

  var downObject = null;

  function updateMouse(viewX, viewY) {
    pointerXY.x = viewX;
    pointerXY.y = viewY;
    pointerNDC.x = (viewX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(viewY / window.innerHeight) * 2 + 1;
  }

  function updateIntersections() {
    rayCaster.setFromCamera(pointerNDC, camera);
    intersections = rayCaster.intersectObjects(objects);

    return intersections;
  }

  function handlePointerDown() {
    var intersection = updateIntersections()[0];

    if (intersection) {
      downObject = intersection.object;
      intersection.object.dispatchEvent({
        type: 'pointer_down',
        pointer: pointerXY.clone(),
        intersection: intersection
      });
    }
  }

  function handlePointerUp() {
    var intersection = updateIntersections()[0];

    if (downObject) {
      downObject.dispatchEvent({
        type: 'pointer_up',
        pointer: pointerXY.clone(),
        intersection: intersection
      });
    }
  }

  element.addEventListener('mousedown', function(e) {
    updateMouse(e.clientX, e.clientY);
    handlePointerDown();
  });
  element.addEventListener('mouseup', function(e) {
    updateMouse(e.clientX, e.clientY);
    handlePointerUp();
  });
  element.addEventListener('mousemove', function(e) {
    updateMouse(e.clientX, e.clientY);
  });

  this.update = function() {
    if (!enabled) return;

    updateIntersections();
  };

  this.register = function(object) {
    objects.push(object);
  };

  Object.defineProperty(this, 'intersections', {
    get:function() {return intersections}
  });
}