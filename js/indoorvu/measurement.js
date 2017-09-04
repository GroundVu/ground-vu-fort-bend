define([
  'esri/dijit/Measurement',
  'dojo/_base/declare', 'dojo/_base/lang'
], function(
  Measurement,
  declare, lang
) {
  return declare(null, {
    constructor: function(options, el) {
      lang.mixin(this, options);

      this.hide.addEventListener('click', lang.hitch(this, function() {
        // this.mapContainer.style.width = '100%';
        this.wrapper.style.display = 'none';
        this.map.setMapCursor('default');
      }));
      this.show.addEventListener('click', lang.hitch(this, function() {
        this.wrapper.style.display = 'block';
        // this.mapContainer.style.width = '70%';
      }));
      
      this.measureTool = new Measurement(options, el);
      this.measureTool.on('tool-change', function(e) {
        if ( e.toolName ) {
          this.map.setMapCursor('crosshair');
        } else {
          this.map.setMapCursor('default');
        }
      });
      this.measureTool.startup();
    }
  });
});
