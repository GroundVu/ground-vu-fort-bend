define([
  'esri/Color', 'esri/symbols/SimpleMarkerSymbol',
  'esri/graphic', 'esri/layers/GraphicsLayer',

  'dojo/_base/declare', 'dojo/_base/lang'
], function(
  Color, Marker, 
  Graphic, GraphicsLayer, 

  declare, lang
) {
  return declare(null, {
    constructor: function(options) {
      lang.mixin(this, options);

      // Photo rotation (yaw) starts at the same angle. 
      // Pannellum makes the left edge of the photo -180,
      // right edge 180. The camera is 11/16ths into the right half
      // which is 61.875 degrees (11/16 * 90 degrees).
      this.yawStart = 61.875;
      this.currentYaw = this.yawStart;
      this.selectedPoint = null;
      this.viewer = null;

      this.symbolColor = new Color(this.symbolColor);

      // Add a graphics layer to show heading.
      this.graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this.graphicsLayer);
      // Create a symbol to show heading.
      this.heading = new Marker();
      this.heading.setSize(this.symbolSize);
      // A cone.
      this.heading.setPath('M17.063,5.243L25,12.916C25,19.585 19.399,25 12.5,25C5.601,25 0,19.585 0,12.916L7.937,5.243C9.078,6.502 10.701,7.289 12.5,7.289C14.299,7.289 15.922,6.502 17.063,5.243Z');
      this.heading.setColor(this.symbolColor);
      this.heading.setOutline(null);

      this.highlight = new Marker('solid', 6, null, this.symbolColor);

      // Update the symbol on the map when the iamgery is panned.
      this.container.addEventListener('mousemove', lang.hitch(this, function(e) {
        // Make sure event is click and move, not just move.
        // e.which is for safari.
        var mouseDown = e.buttons || e.which;
        if ( !mouseDown ) {
          return;
        }
        this.moveFieldOfViewGraphic(e);
      }));
      // Touch-enabled browsers.
      this.container.addEventListener('touchmove', lang.hitch(this, function(e) {
        this.moveFieldOfViewGraphic(e);
      }));
    },

    update: function(graphic) {
      console.log('graphic', graphic);
      // Make the clicked point match the color of the cone.
      if ( this.selectedPoint ) {
        this.selectedPoint.setSymbol(null);
      }
      this.selectedPoint = graphic;
      this.selectedPoint.setSymbol(this.highlight);
      this.selectedPoint._graphicsLayer.redraw();

      if ( this.viewer && this.viewer.destroy ) {
        this.viewer.destroy();
        this.currentYaw = this.yawStart;
      }
      var attributes = graphic.attributes;
      var pieces = attributes[this.photoUrlAttribute].split('/');
      var id = pieces[pieces.length - 1];
      var itemId;
      if ( id.indexOf('photoId=') > -1 ) {
        // Parse id as a query string.
        var queryString = id.replace('?', '').split('&');
        var queryObject = {};
        queryString.forEach(function(kv) {
          var parts = kv.split('=');
          queryObject[parts[0]] = parts[1];
        });
        itemId = queryObject.photoId;
      } else {
        itemId = this.photoLookup[id];
      }
      if ( !id ) {
        console.log('Unknown photo item ID, photo url attribute:  ', graphic.attributes[this.photoUrlAttribute]);
        console.log('Photo lookup object:  ', this.photoLookup);
      }
      var photo = this.photoBase + itemId + '/data?token=' + this.photoLookup.token;
      // console.log('photo', photo);
      // Pannellum's defaults aren't great.
      // Make sure there aren't any controls on the imagery.
      // Specify yaw so that the orientation of the image matches the symbol on the map.
      // Use hfov to make sure the viewer isn't zoomed in on the image.
      this.viewer = pannellum.viewer(this.container, {
        autoLoad: true,
        showControls: false,
        panorama: photo,
        yaw: this.yawStart,
        hfov: 120
      });
      // Add a graphic showing heading.
      this.graphicsLayer.clear();
      var angle = attributes.Heading_Deg1 || attributes.Heading_De || attributes.Heading_Deg_ || attributes.alt;
      // In testing, cones was consistently off by 45 degrees.
      // Subtract 45 to get it right.
      angle = angle - 45;
      var offsets = this.calculateSymbolOffsets(270 - angle);
      this.heading.setAngle(angle);
      this.heading.setOffset(offsets[0], offsets[1]);
      this.graphicsLayer.add(new Graphic(graphic.geometry, this.heading));
    },

    moveFieldOfViewGraphic: function(e) {
      var yaw = this.viewer.getYaw();
      if ( yaw !== this.currentYaw ) {
        var yawChange = this.currentYaw - yaw;
        var nextAngle = this.graphicsLayer.graphics[0].symbol.angle - yawChange;
        this.currentYaw = yaw;
        this.graphicsLayer.graphics[0].symbol.setAngle(nextAngle);
        var offsets = this.calculateSymbolOffsets(270 - nextAngle);
        this.graphicsLayer.graphics[0].symbol.setOffset(offsets[0], offsets[1]);
        this.graphicsLayer.redraw();
      }
    },

    calculateSymbolOffsets: function(angle) { 
      var offsets = [];
      offsets[0] = this.symbolSize / 2 * Math.cos(this.toRadians(angle));
      offsets[1] = this.symbolSize / 2 * Math.sin(this.toRadians(angle));
      // console.log('angle and offsets', angle, offsets);
      // console.log('angle adjusted to', angle);
      return offsets;
    },

    toRadians: function(angle) {
      return angle * (Math.PI / 180);
    }
  });
});
