THREE.ImageLoader = function ( manager ) {

  this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.ImageLoader.prototype = {

  constructor: THREE.ImageLoader,

  load: function ( url, onLoad, onProgress, onError ) {

    if ( this.path !== undefined ) url = this.path + url;

    var scope = this;

    var cached = THREE.Cache.get( url );

    if ( cached !== undefined ) {

      scope.manager.itemStart( url );

      if ( onLoad ) {

        setTimeout( function () {

          onLoad( cached );

          scope.manager.itemEnd( url );

        }, 0 );

      } else {

        scope.manager.itemEnd( url );

      }

      return cached;

    }

    var image = document.createElement( 'img' );
    var imageLoadedHandler = function () {

      THREE.Cache.add( url, this );

      if ( onLoad ) onLoad( this );

      scope.manager.itemEnd( url );
    };

    image.addEventListener( 'load', imageLoadedHandler, false );

    if ( onProgress !== undefined ) {

      image.addEventListener( 'progress', function ( event ) {

        onProgress( event );

      }, false );

    }

    image.addEventListener( 'error', function ( event ) {

      if ( onError ) onError( event );

      scope.manager.itemError( url );

    }, false );

    if ( this.crossOrigin !== undefined ) image.crossOrigin = this.crossOrigin;

    scope.manager.itemStart( url );

    // this is the hack
    setTimeout(function() {
      image.src = url;
    }, 0);

    return image;

  },

  setCrossOrigin: function ( value ) {

    this.crossOrigin = value;

  },

  setPath: function ( value ) {

    this.path = value;

  }

};