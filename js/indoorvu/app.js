define([
  'esri/arcgis/utils', 'esri/arcgis/Portal', 
  'esri/arcgis/OAuthInfo', 'esri/IdentityManager',
  'esri/urlUtils', 'esri/request', 'esri/config', 
  'esri/tasks/GeometryService',
  'esri/dijit/Search',

  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on',

  'indoorvu/symbols', 'indoorvu/layers', 'indoorvu/measurement', 
  'indoorvu/panoramic'
], function (
  arcgis, Portal, 
  OAuthInfo, esriId,
  urlUtils, esriRequest, esriConfig, 
  GeometryService,
  Search,

  declare, lang, on,

  symbols, Layers, Measurement, 
  Panoramic
) {
  return declare(null, {
    constructor: function(options) {
      lang.mixin(this, options);
      // Track of layers that are updating to know when to hide the spinner.
      this.finishedUpdating = {};
      // All photos for the building.
      this.photoLookup = { all: [] };
      this.gettingPhotoInfo = false;
      var protocol = window.location.protocol;
      
      this.urlParameters = urlUtils.urlToObject(window.document.location.href).query;
      if ( !this.urlParameters || 
           !this.urlParameters.hasOwnProperty('config') || 
           !this.urlParameters.hasOwnProperty('org') ) {
        console.error('Missing required URL parameters:  config and org.');
        console.log('Try adding this to the URL:  ?config=e200844175bc400887d17137c1746417&org=indoorvu');
        this.instructions.innerHTML = 'No config or org specified. Make sure the url includes config and org parametrs.'
        this.loading.remove();
        return;
      }

      this.orgBase = this.urlParameters.org + '.maps.arcgis.com';
      this.photoBase = protocol + '//' + this.orgBase + '/sharing/rest/content/items/';
      // Org user.
      this.user = null;
      
      // Configure things to talk to the org.
      esriConfig.defaults.io.corsEnabledServers.push(this.orgBase);
      var orgName = this.orgBase.split('.arcgis.com')[0];
      arcgis.arcgisUrl = arcgis.arcgisUrl.replace('www', orgName);

      var agolGeometryService = '//utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer';
      esriConfig.defaults.geometryService = new GeometryService(agolGeometryService);

      this.run = lang.hitch(this, this.run);
      this.createOrg = lang.hitch(this, this.createOrg);
      this.createMap = lang.hitch(this, this.createMap);
      this.createSearch = lang.hitch(this, this.createSearch);
      this.queryGroup = lang.hitch(this, this.queryGroup);
      this.watchLayerUpdate = lang.hitch(this, this.watchLayerUpdate);
      this.checkUpdateStatus = lang.hitch(this, this.checkUpdateStatus);
      this.handlePhotos = lang.hitch(this, this.handlePhotos);
      // this.checkInstructions = lang.hitch(this, this.checkInstructions);

      var info = new OAuthInfo({
        appId: 'af6zbQsBuSYVJtVP',
        popup: false,
        portalUrl: window.location.protocol + '//' + this.orgBase
      });
      // esriId.registerOAuthInfos([info]);
      this.createOrg(info.portalUrl);

      // Wire up sign out button.
      this.signOut.addEventListener('click', function() {
        esriId.destroyCredentials();
        window.location.reload();
      });
    },

    createOrg: function(portalUrl) {
      // org = new Portal.Portal(portalUrl);
      // org.signIn().then(
        // lang.hitch(this, function(portalUser) {
          // console.log('Signed in to the portal as:  ', portalUser);
          // this.user = portalUser.username;
          document.getElementById('sign-out').style.display = 'block';

          // Get config object from arcgis.com.
          var id = this.urlParameters.config;
          esriRequest({
            url: '//' + this.orgBase + '/sharing/rest/content/items/' + id + '/data',
            content: {
              f: 'json'
            }
          }).then(
            lang.hitch(this, function(response) {
              // Mixin config parameters from JSON from arcgis.com.
              lang.mixin(this, response);
              this.start();
            }), 
            function(error) {
              console.log('config from URL ERROR', error);
            }
          );
        // }),
        // function(error){
        //   console.log('Error occurred while signing in: ', error);
        // }
      // );
    },

    start: function() {
      this.createMap();
      this.queryGroup(this.user, 1);
    },

    createMap: function() {
      arcgis.createMap(this.webmapId, 'map', { 
        mapOptions: { 
          logo: false,
          smartNavigation: false,
          showAttribution: false
        } 
      }).then(
        lang.hitch(this, function(response) {
          this.response = response;
          this.response.clickEventHandle.remove();
          this.map = this.response.map;
          this.map.infoWindow.anchor = 'top';

          this.map.layerIds.forEach(this.watchLayerUpdate, this);
          this.map.graphicsLayerIds.forEach(this.watchLayerUpdate, this);

          this.pano = new Panoramic({
            container: this.viewerContainer,
            map: this.map,
            photoBase: this.photoBase,
            photoLookup: this.photoLookup,
            photoUrlAttribute: this.photoUrlAttribute,
            symbolColor: this.symbolColor,
            symbolSize: this.symbolSize
          });

          // Find the point layer.
          var pointLayerId = this.map.graphicsLayerIds.filter(function(id) {
            var layer = this.map.getLayer(id);
            console.log('layer id...', id, layer.name)
            return layer.geometryType == 'esriGeometryPoint' && 
              layer.visible &&
              (id.indexOf(this.pointLayerName) > -1 || layer.name.indexOf(this.pointLayerName) > -1)
          }, this);
          if ( pointLayerId.length === 1 ) {
            this.pointLayer = this.map.getLayer(pointLayerId[0]);
            // Reorder so that highlight layer doesn't block clicks.
            this.map.reorderLayer(this.pano.graphicsLayer, this.pointLayer.layerId + 1);

            this.pointLayer.on('click', lang.hitch(this, function(e) {
              // this.checkInstructions();
              this.pano.update(e.graphic);
            }));

            // Add a layer list.
            this.layersOptions.layers = arcgis.getLayerList(response);
            this.layersOptions.map = this.map;
            this.layersOptions.showLegend = true;
            this.layersOptions.pointLayer = this.pointLayer;
            var layerList = new Layers(this.layersOptions, 'layers');

            // Add measurement tool.
            this.measureOptions.defaultLengthUnit = 'esriFeetUS';
            this.measureOptions.defaultAreaUnit = 'esriSquareFeetUS';
            this.measureOptions.fillSymbol = symbols.orangeFill
            this.measureOptions.lineSymbol = symbols.orangeLine
            this.measureOptions.pointSymbol = symbols.orangeMarker
            this.measureOptions.map = this.map;
            this.measure = new Measurement(this.measureOptions, 'measure');

            // Show/hide map.
            var hideMap = document.getElementById('hide-map');
            var showMap = document.getElementById('show-map');
            hideMap.addEventListener('click', function() {
              document.getElementById('map').style.display = 'none';
              document.getElementById('tools-wrapper').style.display = 'none';
            });
            showMap.addEventListener('click', function() {
              document.getElementById('map').style.display = 'inline-block';
              document.getElementById('tools-wrapper').style.display = 'inline-block';
            })

            // Hook up the search widget.
            this.createSearch();

          } else {
            console.log('No point layer found for', pointLayerId);
          }
        }), 
        function(error) {
          console.log('error creating map from webmap', error);
        }
      );
    },

    queryGroup: function(user, start) {
      console.log('querying a group', this.orgBase, this.photoGroupId);
      this.gettingPhotoInfo = true;
      esriRequest({
        url: window.location.protocol + '//' + this.orgBase + '/sharing/rest/search',
        content: {
          f: 'json',
          q: 'group:' + this.photoGroupId,
          start: start,
          sortField: 'title',
          sortOrder: 'asc',
          num: 100
        }
      }).then(
        lang.hitch(this, function(response) {
          var token = '';
          if ( esriId.credentials.length && esriId.credentials[0].token ) {
            token = esriId.credentials[0].token;
          }
          this.handlePhotos(this.user, token, response);
        }), 
        function(error) {
          console.log('errory querying groups', error);
        }
      );
    },

    createSearch: function() {
      this.searchWidget = new Search({
        map: this.map,
        showInfoWindowOnSelect: false
      }, this.search);
      this.searchWidget.startup();
    },

    watchLayerUpdate: function(id) {
      var layer = this.map.getLayer(id);
      if ( !layer.loaded || layer.updating ) {
        this.finishedUpdating[id] = false;
        var handle = on.once(layer, 'update-end', lang.hitch(this, function() {
          handle.remove();
          this.finishedUpdating[id] = true;
          if ( this.checkUpdateStatus() ) {
            this.loading.remove();
            // Give the pano viewer a photo point.
            this.pano.update(this.pointLayer.graphics[0]);
          }
        }));
      }
    },

    checkUpdateStatus: function() {
      var allFinished = true;
      for ( var id in this.finishedUpdating ) {
        if ( !this.finishedUpdating[id] ) {
          allFinished = false;
          break;
        }
      }
      if ( this.gettingPhotoInfo ) {
        allFinished = false;
      }
      return allFinished;
    },

    handlePhotos: function(user, token, response) {
      // Populate photoLookup.
      this.photoLookup.all = this.photoLookup.all.concat(response.results);
      if ( response.nextStart !== -1 ) {
        this.queryGroup(user, response.nextStart)
      } else {
        this.photoLookup.all.forEach(function(item) {
          this.photoLookup[item.name] = item.id;
        }, this);
        this.photoLookup.token = token;
        console.log('got photos', this.photoLookup)
        this.gettingPhotoInfo = false;
        if ( this.checkUpdateStatus() ) {
          this.loading.remove();
          // Give the pano viewer a photo point.
          this.pano.update(this.pointLayer.graphics[0]);
        }
      }
    },

    checkInstructions: function() {
      if ( this.instructions ) {
        this.instructions.remove();
      }
    }

  });
});
