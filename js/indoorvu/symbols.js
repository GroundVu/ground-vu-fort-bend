define([
  'esri/Color', 
  'esri/symbols/SimpleMarkerSymbol', 
  'esri/symbols/SimpleLineSymbol', 
  'esri/symbols/SimpleFillSymbol'
], function(Color, Marker, Line, Fill) {
  var outlineColor = new Color([255, 255, 255, 1]);
  var orange = new Color([232, 66, 48, 1]);
  var semiTransparent = new Color([255, 255, 255, 0.75]);
  var outline = new Line('solid', outlineColor, 2);
  var orangeLine = new Line('solid', orange, 2);
  var orangeMarker = new Marker('circle', 8, outline, orange);
  var orangeFill = new Fill('solid', orangeLine, semiTransparent);
  
  return {
    orangeFill: orangeFill,
    orangeLine: orangeLine,
    orangeMarker: orangeMarker
  };
});