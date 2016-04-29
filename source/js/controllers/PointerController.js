function PointerController(camera, element) {
  element = element || window;

  var mTouchEnabled = true;
  var mScrollLocked = true;

  var mRayCaster = new THREE.Raycaster();
  var mPointerNDC = new THREE.Vector2();
  var mPointerXY = new THREE.Vector2();
  var mIntersections = [];
  var mObjects = [];

  var mDownObject = null;
  var mHoverObject = null;

  function updatePointerPosition(viewX, viewY) {
    mPointerXY.x = viewX;
    mPointerXY.y = viewY;
    mPointerNDC.x = (viewX / window.innerWidth) * 2 - 1;
    mPointerNDC.y = -(viewY / window.innerHeight) * 2 + 1;
  }

  function updateIntersections() {
    mRayCaster.setFromCamera(mPointerNDC, camera);
    mIntersections = mRayCaster.intersectObjects(mObjects);

    return mIntersections;
  }

  function handlePointerDown() {
    var intersection = updateIntersections()[0];

    if (intersection) {
      mDownObject = intersection.object;
      intersection.object.dispatchEvent({
        type: 'pointer_down',
        pointer: mPointerXY.clone(),
        intersection: intersection
      });
    }
  }

  function handlePointerUp() {
    var intersection = updateIntersections()[0];

    if (mDownObject) {
      mDownObject.dispatchEvent({
        type: 'pointer_up',
        pointer: mPointerXY.clone(),
        intersection: intersection
      });
      mDownObject = null;
    }
  }

  // maybe throttle this guy
  var handlePointerMove = _.throttle(function() {
    var intersection = updateIntersections()[0];

    if (intersection && !mHoverObject) {
      // over
      mHoverObject = intersection.object;
      mHoverObject.dispatchEvent({
        type: 'pointer_over',
        pointer: mPointerXY.clone(),
        intersection: intersection
      });

      updateCursor();
    }
    else if (!intersection && mHoverObject) {
      // out
      mHoverObject.dispatchEvent({
        type: 'pointer_out',
        pointer: mPointerXY.clone(),
        intersection: null
      });
      mHoverObject = null;

      updateCursor();
    }
    else if (intersection) {
      // move
      mHoverObject.dispatchEvent({
        type: 'pointer_move',
        pointer: mPointerXY.clone(),
        intersection: intersection
      });

      updateCursor();
    }
  }, 1000 / 30);

  var mCursorBodyClass = '';

  function updateCursor() {
    if (mHoverObject) {
      mCursorBodyClass && document.body.classList.remove(mCursorBodyClass);

      if (mDownObject) {
        mCursorBodyClass = 'three-grabbing';
      }
      else {
        mCursorBodyClass = 'three-grab';
      }

      document.body.classList.add(mCursorBodyClass);
    }
    else if (mCursorBodyClass) {
      document.body.classList.remove(mCursorBodyClass);
    }
  }

  // mouse
  element.addEventListener('mousedown', function(e) {
    updatePointerPosition(e.clientX, e.clientY);
    handlePointerDown();
  });
  element.addEventListener('mouseup', function(e) {
    updatePointerPosition(e.clientX, e.clientY);
    handlePointerUp();
  });
  element.addEventListener('mousemove', function(e) {
    updatePointerPosition(e.clientX, e.clientY);
    handlePointerMove();
  });

  // touch
  element.addEventListener('touchstart', function(e) {
    if (!mTouchEnabled) return;

    var touch = e.changedTouches[0];
    updatePointerPosition(touch.clientX, touch.clientY);
    handlePointerDown();

    //e.preventDefault();
  });
  element.addEventListener('touchend', function(e) {
    if (!mTouchEnabled) return;

    var touch = e.changedTouches[0];
    updatePointerPosition(touch.clientX, touch.clientY);
    handlePointerUp();

    //e.preventDefault();
  });
  element.addEventListener('touchmove', function(e) {
    if (!mTouchEnabled) return;

    var touch = e.changedTouches[0];
    updatePointerPosition(touch.clientX, touch.clientY);
    handlePointerMove();

    if (mScrollLocked) {
      e.preventDefault();
    }
  });

  this.update = function() {
    if (mHoverObject) handlePointerMove();
  };

  this.register = function(object) {
    mObjects.push(object);
  };

  Object.defineProperty(this, 'isTouchDevice', {
    get: function() {
      return 'ontouchstart' in window || navigator.maxTouchPoints;
    }
  });

  Object.defineProperty(this, 'intersections', {
    get:function() {return mIntersections}
  });

  Object.defineProperty(this, 'scrollLocked', {
    set:function(v) {mScrollLocked = v}
  });

  Object.defineProperty(this, 'touchEnabled', {
    set:function(v) {

      if (!v) {
        handlePointerUp();
      }

      mTouchEnabled = v
    }
  });
}