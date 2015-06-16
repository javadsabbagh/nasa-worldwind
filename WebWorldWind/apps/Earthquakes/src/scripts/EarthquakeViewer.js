/**
 * Created by Matthew on 6/11/2015.
 */

requirejs(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'http://worldwindserver.net/webworldwind/examples/LayerManager.js',
        'http://worldwindserver.net/webworldwind/examples/CoordinateController.js'],
    function (ww,
              LayerManager,
              CoordinateController) {
        "use strict";

        // Tell World Wind to log only warnings.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        // Create the World Window.
        var wwd = new WorldWind.WorldWindow("canvasOne");
        console.log(wwd)
        /**
         * Added imagery layers.
         */
        var layers = [
            {layer: new WorldWind.BMNGLayer(), enabled: true},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
            {layer: new WorldWind.OpenStreetMapImageLayer(null), enabled: false},
            {layer: new WorldWind.CompassLayer(), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }



        function RetrieveGeoJSONObject(filenameURL){
            var xhttp = new XMLHttpRequest();
            xhttp.open( 'GET', 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson', false );
            xhttp.send();
            xhttp.getServerResponse = function () {
                if (xhttp.readyState === 4 && xhttp.status === 200) {
                }
            };
            return xhttp.getServerResponse();
        }
        function RetrieveXMLObject(filenameURL) {
            //use var databaseObj = retrieveXMLObject(filenameURL);
            var xhttp = new XMLHttpRequest();

            xhttp.open("GET", filenameURL, false);//this has to be false in third parameter. This means the script will wait for a response to continue.
            xhttp.send();
            xhttp.getServerResponse = function () {
                if (xhttp.readyState === 4 && xhttp.status === 200) {
                    xhttp.responseXML.getKeyData = function(keyArray,keyArrayIndex){

                        if (!keyArray.length === keyArrayIndex.length){
                            console.log("Key array must have a corrosponding index.");
                            return;
                        }

                        var path = this;

                        for (var i = 0; i<keyArray.length; i++){

                            if (path === undefined){return "failed"}
                            path = path.getElementsByTagName(keyArray[i])[keyArrayIndex[i]];
                        }
                        return path.childNodes[0].nodeValue
                    };
                    return xhttp.responseXML;
                }
            };
            return xhttp.getServerResponse();
        }
        function GetColorSpectrum(fraction,spectrumArrayColors){
            //array looks like [[r,g,b],[r,g,b],...
            var divisions = spectrumArrayColors.length-1;
            for (var i = 0; i < divisions; i++){
                if (fraction >= i/divisions && fraction <= (i+1)/divisions){
                    var r = spectrumArrayColors[i][0]+fraction*(spectrumArrayColors[i+1][0]-spectrumArrayColors[i][0]),
                        g = spectrumArrayColors[i][1]+fraction*(spectrumArrayColors[i+1][1]-spectrumArrayColors[i][1]),
                        b = spectrumArrayColors[i][2]+fraction*(spectrumArrayColors[i+1][2]-spectrumArrayColors[i][2]);

                    r = Math.round(r)
                    g = Math.round(g)
                    b = Math.round(b)
                    return "rgb("+ r+","+ g+","+ b+")";
                }
            }

        }
        var EQDB = new RetrieveXMLObject("http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.quakeml");


        var MarkerLayer = function (wwd,dataB){
            var placemark,
                placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
                highlightAttributes,
                placemarkLayer = new WorldWind.RenderableLayer("Earthquake Markers");


            var animatedEarthquake = 1;
            var globalColorA = [[255,0,0],[225,132,0],[200,167,0],[178,200,0],[152,255,0]];
            this.worldWindow = wwd;
            this.earthquakeData = [];
            this.parsedEarthquakeData = [];
            this.createAllDataArray = function (eQDb) {
                //stores all earthquake data in earthquakemarkerlayer.earthquakeData[]
                var i=0;
                var stopSwitch= true;
                while(stopSwitch) {
                    var eQuake;
                    eQuake = {};
                    eQuake.lat = eQDb.getKeyData(["latitude","value"],[i,0]);
                    eQuake.long = eQDb.getKeyData(["longitude","value"],[i,0]);
                    eQuake.magnitude = eQDb.getKeyData(["magnitude","value"],[i,0]);
                    eQuake.date = eQDb.getKeyData(["time","value"],[i,0]);
                    eQuake.depth = eQDb.getKeyData(["depth","value"],[i,0]);
                    //simultaneously calculates age in days or if the age is less than a day, it counts the age in hours.
                    eQuake.age = Math.abs(
                        (new Date().getTime() - new Date(eQuake.date).getTime()) / (24 * 60 * 60 * 1000)
                    );

                    switch (Math.floor(eQuake.age)) {
                        case 0:
                            eQuake.stamp = Math.floor(Math.abs(
                                    (new Date().getTime() - new Date(eQuake.date).getTime()) / (60 * 60 * 1000)
                                )) + " Hours Ago";
                            break;
                        case 1:
                            eQuake.stamp = Math.floor(eQuake.age) + " Day Ago";
                            break;
                        default:
                            eQuake.stamp = Math.floor(eQuake.age) + " Days Ago";
                    }

                    eQuake.info = "M " + eQuake.magnitude + " - "
                        + eQDb.getKeyData(["description","text"],[i,0])
                        + "<br>" + eQuake.stamp + "<br>" + Math.round(eQuake.depth) / 1000 + "km deep";
                    this.earthquakeData[i] = eQuake;
                    if (eQDb.getKeyData(["latitude","value"],[i+1,0]) === 'failed') {
                        console.log('Stopped')
                        stopSwitch = false;
                    } else {
                        i++;
                    }

                }
            };
            this.parseDesiredEarthquakesByMag = function (minMag,earthquakeArray){
                var indexForHashing = 0;
                for (var i = 0; i < earthquakeArray.length; i++){
                    if (earthquakeArray[i].magnitude >= minMag){
                        this.parsedEarthquakeData[indexForHashing] = {};
                        this.parsedEarthquakeData[indexForHashing] = earthquakeArray[i];
                        indexForHashing++;
                    }
                }
            };
            this.clearEarthquakesDisplay= function (layer){
                layer.removeAllRenderables()
            };
            this.drawDesiredEarthquakes = function(layer,earthquakeArray){

                //Creates a placemark for each earthquake object.
                for (var i = 0; i < earthquakeArray.length; i++){
                    // Create the custom image for the placemark for each earthquake.
                    var canvas = document.createElement("canvas"),
                        ctx2d = canvas.getContext("2d"),
                        size = earthquakeArray[i].magnitude*5 , c = size / 2  - 0.5, innerRadius = 0, outerRadius = earthquakeArray[i].magnitude*2.2;
                    canvas.width = size;
                    canvas.height = size;

                    ctx2d.fillStyle = GetColorSpectrum(earthquakeArray[i].age/earthquakeArray[earthquakeArray.length-1].age,globalColorA);
                    ctx2d.alpha = true;
                    ctx2d.globalAlpha = .55;
                    ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
                    ctx2d.fill();

                    // Create the placemark.
                    placemark = new WorldWind.Placemark(new WorldWind.Position(earthquakeArray[i].lat, earthquakeArray[i].long, 1e2));
                    placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

                    // Create the placemark attributes for the placemark.
                    placemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
                    placemarkAttributes.imageScale = 1;
                    placemarkAttributes.imageColor = WorldWind.Color.WHITE;

                    // Wrap the canvas created above in an ImageSource object to specify it as the placemark image source.
                    placemarkAttributes.imageSource = new WorldWind.ImageSource(canvas);
                    placemark.attributes = placemarkAttributes;
                    // Create the highlight attributes for this placemark. Note that the normal attributes are specified as
                    // the default highlight attributes so that all properties are identical except the image scale. You could
                    // instead vary the color, image, or other property to control the highlight representation.
                    highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
                    highlightAttributes.imageScale = 1.2;
                    highlightAttributes.imageSource = new WorldWind.ImageSource(canvas);
                    placemark.highlightAttributes = highlightAttributes;
                    // Add the placemark to the layer.
                    layer.addRenderable(placemark);
                    earthquakeArray[i].renderableIndex =  layer.renderables.length-1
                }
            };
            //marker is the index of the desired marker in the parsedearthquakedata array
            this.animationController = {
                thisLayer: this,
                animate: function (layer,markerArg){
                    var EToAni = markerArg;
                    var Handler = this.thisLayer;
                    var currentIndex = 0;
                    this.LAYER = layer;
                    this.MARKERARG = markerArg;
                    var animatorID = window.setInterval(function () {var marker = Handler.parsedEarthquakeData[EToAni].renderableIndex;// picks the index of the earthquake to be animated from the renderables in the layer.
                        var canvas = document.createElement("canvas"),
                            ctx2d = canvas.getContext("2d"),
                            size = Handler.parsedEarthquakeData[marker].magnitude * 5, c = size / 2 - 0.5, innerRadius = 0,
                            outerRadius = Handler.parsedEarthquakeData[marker].magnitude * 2.2;
                        canvas.width = size;
                        canvas.height = size;

                        ctx2d.fillStyle = GetColorSpectrum(Handler.parsedEarthquakeData[marker].age/Handler.parsedEarthquakeData[Handler.parsedEarthquakeData.length - 1].age,globalColorA);
                        ctx2d.alpha = true;
                        ctx2d.globalAlpha = 1 - currentIndex / 20;
                        ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
                        ctx2d.fill();
                        currentIndex += 1;
                        layer.renderables[marker].attributes.imageScale = .8 + currentIndex / 10;
                        layer.renderables[marker].highlightAttributes.imageScale = 1.6 + currentIndex / 10 * 2;
                        layer.renderables[marker].attributes.imageSource = new WorldWind.ImageSource(canvas);
                        layer.renderables[marker].highlightAttributes.imageSource = new WorldWind.ImageSource(canvas);
                        if (currentIndex > 20) {
                            currentIndex = 0;
                        }
                        Handler.worldWindow.redraw();
                    },50);
                    this.animatedMarkerID = animatorID;
                },
                animateStop: function(){
                    var marker = this.thisLayer.parsedEarthquakeData[this.MARKERARG].renderableIndex;// picks the index of the earthquake to be animated from the renderables in the layer.
                    var canvas = document.createElement("canvas"),
                        ctx2d = canvas.getContext("2d"),
                        size = this.thisLayer.parsedEarthquakeData[marker].magnitude * 5, c = size / 2 - 0.5, innerRadius = 0,
                        outerRadius = this.thisLayer.parsedEarthquakeData[marker].magnitude * 2.2;
                    canvas.width = size;
                    canvas.height = size;

                    ctx2d.fillStyle = GetColorSpectrum(this.thisLayer.parsedEarthquakeData[marker].age/this.thisLayer.parsedEarthquakeData[this.thisLayer.parsedEarthquakeData.length - 1].age,[[255,0,0],[255,132,0],[152,255,0]]);
                    ctx2d.alpha = true;
                    ctx2d.globalAlpha = .55;
                    ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
                    ctx2d.fill();
                    this.LAYER.renderables[marker].attributes.imageScale = .8;
                    this.LAYER.renderables[marker].highlightAttributes.imageScale = 1.2;
                    this.LAYER.renderables[marker].attributes.imageSource = new WorldWind.ImageSource(canvas);
                    this.LAYER.renderables[marker].highlightAttributes.imageSource = new WorldWind.ImageSource(canvas);
                    this.thisLayer.worldWindow.redraw();
                    clearTimeout(this.animatedMarkerID);
                }
            };



            this.createAllDataArray(dataB);
            this.parseDesiredEarthquakesByMag(3,this.earthquakeData);
            this.drawDesiredEarthquakes(placemarkLayer,this.parsedEarthquakeData);
            this.animationController.animate(placemarkLayer,animatedEarthquake);
            return placemarkLayer;
        }

        MarkerLayer.prototype = Object.create(WorldWind.RenderableLayer);
        Object.defineProperties(MarkerLayer.prototype,{
            MarkerLayer: {Key: "hi"}
        });
        console.log(MarkerLayer);

        var earthquakeMarkerLayer = new MarkerLayer(wwd,EQDB)
        $(document).ready(function() {

            $('#magnitudeSlider').slider({
                formatter: function(value) {
                    return 'Current value: ' + value;
                },

            });
            $('#magnitudeSlider').on("slide",function(val){
                console.log(earthquakeMarkerLayer)
                earthquakeMarkerLayer.clearEarthquakesDisplay(earthquakeMarkerLayer);
                earthquakeMarkerLayer.parseDesiredEarthquakesByMag(val.value,earthquakeMarkerLayer.earthquakeData);
                earthquakeMarkerLayer.drawDesiredEarthquakes(earthquakeMarkerLayer,earthquakeMarkerLayer.parsedEarthquakeData);
                console.log('hi')
            });
            $('#ex1').slider({
                formatter: function(value) {
                    return 'Current value: ' + value;
                }
            });



        });


        wwd.addLayer(earthquakeMarkerLayer);

        // Draw the World Window for the first time.
        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager(wwd);


        // Create a coordinate controller to update the coordinate overlay elements.
        var coordinateController = new CoordinateController(wwd);

        var highlightController = new WorldWind.HighlightController(wwd);


    });
