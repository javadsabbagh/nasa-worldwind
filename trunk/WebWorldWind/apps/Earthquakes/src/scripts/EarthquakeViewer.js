/**
 * Created by Matthew on 6/16/2015.
 */


define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'http://worldwindserver.net/webworldwind/examples/LayerManager.js',
        'http://worldwindserver.net/webworldwind/examples/CoordinateController.js',
        'UGSDataRetriever'],
    function (ww,
              LayerManager,
              CoordinateController,UGSDataRetriever) {
        "use strict";
        // Tell World Wind to log only warnings.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        // Create the World Window.
        var wwd = new WorldWind.WorldWindow("canvasOne");

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

        //displays info of highlighted earthquake in eData division
        var displayInfo = function (layer) {

            //location to display the info
            var display = $('#eData');

            //finds the highlighted renderable
            for (var i in layer.renderables) {

                if (layer.renderables[i].highlighted) {
                    display.empty();
                    display.append('<p>' + layer.Manage.ParsedData[i].info + '</p>');
                }

            }
        };

        //each layer can only handle one dataset
        var EarthquakeViewLayer = function (worldWindow,name) {
            var wwd = worldWindow;
            var eLayer = new WorldWind.RenderableLayer(name); //creates the layer on which the earthquakes will be mapped

            //manages most of what goes on in the layer. See methods of Manage for more details.
            eLayer.Manage = {

                //adds the data to the layer (does not draw on the layer). Stores all data in eLayer.Manage.Data as array of earthquake objects
                createDataArray: function (JSONFile) {
                    eLayer.Manage.Data = JSONFile;
                    eLayer.Manage.parseDataArrayMag(2);//parse out most of the insignificant earthquakes.
                },

                //shows the array of all earthquake objects and returns it if needed
                showDataArray:function(){
                    console.log(eLayer.Manage.Data);
                    return eLayer.Manage.Data
                },

                //filters the data array to eLayer.Manage.ParsedData which contains earthquakes that meet or exceed the argument.
                parseDataArrayMag: function (val) {

                    eLayer.Manage.ParsedData = eLayer.Manage.Data.filter(function(earthquake) {
                        return earthquake.magnitude >= val;
                    });

                    eLayer.Manage.drawDesiredData();
                },

                //draws all the earthquakes in eLayer.Manage.ParsedData onto the layer
                drawDesiredData: function () {
                    eLayer.Layer.clearLayer();
                    var placemark, highlightAttributes,
                        placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
                        Array = eLayer.Manage.ParsedData;
                    var colorSpect = [[255,0,0],[0,255,0]];
                    //returns color based on the array and the fraction.
                    var GetColorSpectrum = function (fraction,spectrumArrayColors){
                        //array looks like [[r,g,b],[r,g,b],...
                        var divisions = spectrumArrayColors.length-1;
                        for (var i = 0; i < divisions; i++){
                            if (fraction >= i/divisions && fraction <= (i+1)/divisions){
                                var r = spectrumArrayColors[i][0]+fraction*(spectrumArrayColors[i+1][0]-spectrumArrayColors[i][0]),
                                    g = spectrumArrayColors[i][1]+fraction*(spectrumArrayColors[i+1][1]-spectrumArrayColors[i][1]),
                                    b = spectrumArrayColors[i][2]+fraction*(spectrumArrayColors[i+1][2]-spectrumArrayColors[i][2]);

                                r = Math.round(r);
                                g = Math.round(g);
                                b = Math.round(b);
                                return "rgb("+ r + "," + g + "," + b + ")";
                            }
                        }

                    };

                    //adds all the earthquakes as renderables to the layer
                    for (var i = 0; i < Array.length; i++){
                        // Create the custom image for the placemark for each earthquake.
                        var canvas = document.createElement("canvas"),
                            ctx2d = canvas.getContext("2d"),
                            size = Array[i].magnitude*5 , c = size / 2  - 0.5, innerRadius = 0, outerRadius = Array[i].magnitude*2.2;
                        canvas.width = size;
                        canvas.height = size;

                        ctx2d.fillStyle = GetColorSpectrum(Array[i].age/eLayer.Manage.Data[eLayer.Manage.Data.length-1].age,colorSpect)
                        ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
                        ctx2d.fill();

                        // Create the placemark.
                        placemark = new WorldWind.Placemark(new WorldWind.Position(Array[i].lat, Array[i].long, 1e2));
                        placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

                        // Create the placemark attributes for the placemark.
                        placemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
                        placemarkAttributes.imageScale = 1;
                        placemarkAttributes.imageColor = new WorldWind.Color(1,1,1,.55)

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
                        eLayer.addRenderable(placemark);
                    }
                    wwd.redraw();
                },

                //controls animated placemarks
                Animations: {

                    //animates argument renderable.
                    animate: function (renderable) {
                        if (eLayer.Manage.ParsedData.length > 0 && eLayer.Manage.Animations.animating === true) {
                            eLayer.Manage.Animations.stopAnimation();
                        } else if (!eLayer.Manage.ParsedData.length > 0){
                            return
                        }
                        //saves the renderable memory location
                        eLayer.Manage.Animations.animated = renderable;

                        //saves what the renderable looks like before animation
                        eLayer.Manage.Animations.CCdAnimated = Object.create(renderable);
                        var INDEX = 0;

                        //grabs the interval key and begins animation
                        eLayer.Manage.Animations.animated.Key = window.setInterval(function () {
                            //changes alpha of the placemark
                            renderable.attributes.imageColor = new WorldWind.Color(1,0,0,1 - INDEX/20);
                            renderable.highlightAttributes.imageColor = new WorldWind.Color(1,0,0,1 - INDEX/20);
                            renderable.attributes.imageScale = 2* (.5+INDEX/20);
                            renderable.highlightAttributes.imageScale = 2.8* (.5+INDEX/20);
                            INDEX++;
                            //animation resets after 20
                            if (INDEX > 20){
                                INDEX = 0;
                            }
                            eLayer.Manage.Animations.animating = true;
                            wwd.redraw();
                        },50)
                    },

                    //self explanatory
                    stopAnimation: function () {

                        //stops animation
                        clearTimeout(eLayer.Manage.Animations.animated.Key);

                        //returns all attributes of placemark before animation to the placemark
                        eLayer.Manage.Animations.animated = eLayer.Manage.Animations.CCdAnimated

                        eLayer.Manage.Animations.animating = false;
                    }
                }
            };

            //contains various layer functions
            eLayer.Layer = {
                //clears the layer for the earthquake data to be refreshed or changed
                clearLayer: function () {
                    eLayer.removeAllRenderables();
                }
            };
            return eLayer
        }
        var newLayer = new EarthquakeViewLayer(wwd,"ThisLay");

        //see UGSDataRetriever documentation
        var dataRetriever = new UGSDataRetriever();
        console.log('Loading USGS Data')
        //waits for the data to be retrieved and parsed and then passes it to the earthquake layer.
        dataRetriever.retrieveRecords(function(arg) {
            console.log('Loaded')

            //passes the retrieved data to the layer
            newLayer.Manage.createDataArray(arg);


            wwd.addLayer(newLayer);




            //wait for the slider to be ready
            $('#magnitudeSlider').ready(function() {

                //instantiate the slider
                var magSlider = $('#magnitudeSlider').slider({
                    formatter: function(value) {
                        return 'Current value: ' + value;
                    }
                });
                magSlider.on('slideStop',function(arg){

                    //passes slider value to the layer
                    newLayer.Manage.parseDataArrayMag(arg.value);

                    //again animates the most recent displayed earthquake. When the renderables change, the renderable ceases to be animated.
                    newLayer.Manage.Animations.animate(newLayer.renderables[0]);
                });

                //parses and draws earthquakes on layer. Set minimum visible magnitude to the default value of the slider
                newLayer.Manage.parseDataArrayMag(magSlider.slider('getValue'));

                //animates most recent earthquake. the first renderable in the layer is the most recent earthquake
                newLayer.Manage.Animations.animate(newLayer.renderables[0]);
            });

            //crude implementation to display the info of the earthquake highlighted
            document.getElementById("canvasOne").onmousemove = function tss () {
                displayInfo(newLayer);
            };
        });

        // Draw the World Window for the first time.
        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager(wwd);


        // Create a coordinate controller to update the coordinate overlay elements.
        var coordinateController = new CoordinateController(wwd);

        //
        var highlightController = new WorldWind.HighlightController(wwd);



    });