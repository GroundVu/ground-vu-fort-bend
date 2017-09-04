require(['indoorvu/app'], function(App, config) {

  // Provide references to DOM elements for various UI pieces.
  var options = {
    instructions: document.getElementById('instruction'),
    loading: document.getElementById('map-loading'),
    signOut: document.getElementById('sign-out'),
    viewerContainer: document.getElementById('imagery'),
    layersOptions: {
      hide: document.getElementById('layers-close'),
      show: document.getElementById('layers-show'),
      mapContainer: document.getElementById('map'),
      wrapper: document.getElementById('layers-wrapper')
    },
    measureOptions: {
      hide: document.getElementById('measure-close'),
      show: document.getElementById('measure-show'),
      mapContainer: document.getElementById('map'),
      wrapper: document.getElementById('measure-wrapper')
    }
  };
  var app = new App(options);

});
