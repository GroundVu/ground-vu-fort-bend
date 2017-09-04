define([
  'esri/dijit/LayerList',
  'dojo/_base/declare', 'dojo/_base/lang'
], function(
  LayerList,
  declare, lang
) {
  return declare(null, {
    constructor: function(options, el) {
      lang.mixin(this, options);

      this.hide.addEventListener('click', lang.hitch(this, function() {
         // this.mapContainer.style.width = '100%';
         this.wrapper.style.display = 'none';
      }));
      this.show.addEventListener('click', lang.hitch(this, function() {
        this.wrapper.style.display = 'block';
        // this.mapContainer.style.width = '70%';
      }));
      
      this.layerList = new LayerList(options, el);
      this.layerList.startup();

      // Disable toggling of points representing photos.
      var layerIndex;
      this.layerList.layers.forEach(function(layer, index) {
        if ( layer.layer && layer.layer.hasOwnProperty('id') && layer.layer.id === this.pointLayer.id ) {
          layerIndex = index;
        }
      }, this);
      var pointsSelector = 'input[data-layer-index="' + layerIndex + '"]';
      var pointsToggle = document.querySelector(pointsSelector);
      if ( pointsToggle ) {
        pointsToggle.setAttribute('disabled', true);
      }
    }
  });
});
