requirejs(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'http://worldwindserver.net/webworldwind/examples/LayerManager.js',
        'http://worldwindserver.net/webworldwind/examples/CoordinateController.js'],
    function (ww,
              LayerManager,
              CoordinateController) {
        "use strict";

        //displays
        var displayInfo = function (database) {
            var display = $('#eData');

            for (var i in placemarkLayer.renderables) {

                if (placemarkLayer.renderables[i].highlighted) {
                    display.empty();
                    display.append('<p>' + earthquakeData[i].info + '</p>');
                    //console.log(display);
                }

            }
        };

        //picks color based on days ago
        function getColor(daysAgo) {
            switch (daysAgo) {
                case 0:
                    return "red"
                    break;
                case 1:
                    return "orange"
                    break;
                case 2:
                    return "yellow"
                    break;
                case 3:
                    return "green"
                    break;
                case 4:
                    return "blue"
                    break;
                case 5:
                    return "gray"
                    break;
                case 6:
                    return "black"
                    break;
                default:
                    return "black"
            }
        };

        //calls xml doc from url
        function loadXMLDoc(filename) {
            var xmlDom;
            var xhttp = new XMLHttpRequest();
            xhttp.open("GET", filename, false);//this has to be false in third parameter.
            xhttp.send();
            xhttp.onreadystatechange = function () {
                if (xhttp.readyState === 4 && xhttp.status === 200) {
                    return xhttp.responseXML;
                } else {
                    return "Server Data Retrieval Failed"
                }

            };
            return xhttp.onreadystatechange();
        }


        //set the earthquake database
        var xmlDocA = loadXMLDoc("http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.quakeml");


        //retrieve a number from that database that has a value tag
        var getXVal = function(ex,database,iter){
            return database.getElementsByTagName(ex)[iter].getElementsByTagName("value")[0].childNodes[0].nodeValue;
        };
        var getX = function(ex,database,iter){
            return database.getElementsByTagName(ex)[iter].childNodes[0].nodeValue;

        };

        //counts the number of earthquakes
        var xmlHasher = []; //hashes the number on the array to the xml doc

        //counts the earthquakes that meat the minMag
        var countEarthquakes = function(dB,minMag) {
            var numEarth = 0;
            var itchy = 0;
            while (typeof xmlDocA.getElementsByTagName("event")[itchy] === 'object'){
                if (getXVal("mag",dB,itchy) >= minMag) {
                    xmlHasher[numEarth] = itchy;
                    numEarth++;
                };
                itchy++;
            };
            console.log(itchy)
            return numEarth;
        };

        /*
         runs through and creates objects for each earthquake
         earthquakeData[n] has properties lat, long
         */
        var earthquakeData = [];
        /*
        var updateEarthquakes = function (database,minMag) {
            minMag = typeof minMag !== 'undefined' ? minMag: 2;
            earthquakeData = [];
            var renNum = 0;
            for (var i = 0; i < countEarthquakes(xmlDocA); i++){
                if (getXVal("mag",database,i) >= minMag){
                    earthquakeData[renNum] = {};
                    earthquakeData[renNum].lat = getXVal("latitude",database, i);
                    earthquakeData[renNum].long = getXVal("longitude",database, i);
                    earthquakeData[renNum].magnitude = getXVal("mag",database, i);
                    earthquakeData[renNum].date = getXVal("time",database,i);
                    earthquakeData[renNum].age = Math.floor(
                        Math.abs(
                            (new Date().getTime() - new Date(earthquakeData[renNum].date).getTime())/(24*60*60*1000)
                        )
                    );
                    switch (earthquakeData[renNum].age){
                        case 0: earthquakeData[renNum].stamp = Math.floor(Math.abs(
                                (new Date().getTime() - new Date(earthquakeData[renNum].date).getTime())/(60*60*1000)
                            )) + " Hours Ago"
                            break;
                        case 1: earthquakeData[renNum].stamp = earthquakeData[renNum].age + " Day Ago"
                            break;
                        default: earthquakeData[renNum].stamp = earthquakeData[renNum].age + " Days Ago"
                    }

                    earthquakeData[renNum].info = "M " + getXVal("mag",database,i) + " - " + database.getElementsByTagName("description")[i].getElementsByTagName("text")[0].childNodes[0].nodeValue
                        + "<br>"  + earthquakeData[renNum].stamp + "<br>" + getXVal("depth",database,i)/1000 + "km deep";

                    renNum++;
                };
            }
        }
        */
        var earthquakeHandler = {};

        earthquakeHandler.updateEarthquakes = function (database,minMag,start,stop,thenDraw,wwd) {
            minMag = typeof minMag !== 'undefined' ? minMag: 2;
            this.numberOfEarthquakes = countEarthquakes(database,minMag);
            console.log(this.numberOfEarthquakes)
            earthquakeData = [];
            var renNum = 0;
            for (var i = start; i < Math.min(xmlHasher.length,stop); i++){
                if (getXVal("mag",database,xmlHasher[i]) >= minMag){
                    earthquakeData[renNum] = {};
                    earthquakeData[renNum].lat = getXVal("latitude",database, xmlHasher[i]);
                    earthquakeData[renNum].long = getXVal("longitude",database, xmlHasher[i]);
                    earthquakeData[renNum].magnitude = getXVal("mag",database, xmlHasher[i]);
                    earthquakeData[renNum].date = getXVal("time",database,xmlHasher[i]);
                    earthquakeData[renNum].age = Math.floor(
                        Math.abs(
                            (new Date().getTime() - new Date(earthquakeData[renNum].date).getTime())/(24*60*60*1000)
                        )
                    );
                    switch (earthquakeData[renNum].age){
                        case 0: earthquakeData[renNum].stamp = Math.floor(Math.abs(
                                (new Date().getTime() - new Date(earthquakeData[renNum].date).getTime())/(60*60*1000)
                            )) + " Hours Ago"
                            break;
                        case 1: earthquakeData[renNum].stamp = earthquakeData[renNum].age + " Day Ago"
                            break;
                        default: earthquakeData[renNum].stamp = earthquakeData[renNum].age + " Days Ago"
                    }

                    earthquakeData[renNum].info = "M " + getXVal("mag",database,xmlHasher[i]) + " - " + database.getElementsByTagName("description")[xmlHasher[i]].getElementsByTagName("text")[0].childNodes[0].nodeValue
                        + "<br>"  + earthquakeData[renNum].stamp + "<br>" + getXVal("depth",database,i)/1000 + "km deep";

                    renNum++;
                };
            }
            if (thenDraw){this.drawEarthquakes(start,stop); wwd.redraw();}
        }
        earthquakeHandler.drawEarthquakes = function(start,stop){
            //Create a placemark for each earthquake object.
            for (var i = start; i < Math.min(this.numberOfEarthquakes,stop); i++){
                // Create the custom image for the placemark for each earthquake. These are random colors but the color could corrospond to magnitude
                var canvas = document.createElement("canvas"),
                    ctx2d = canvas.getContext("2d"),
                    size = earthquakeData[i].magnitude*6 , c = size / 2  - 0.5, innerRadius = 0, outerRadius = earthquakeData[i].magnitude*3;
                canvas.width = size;
                canvas.height = size;
                ctx2d.fillStyle = getColor(earthquakeData[i].age);
                ctx2d.alpha = true;
                ctx2d.globalAlpha = .7;
                ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
                ctx2d.fill();



                var canvasTwo = document.createElement("canvas"),
                    ctx2d2 = canvasTwo.getContext("2d");
                canvasTwo.width = 50;
                canvasTwo.height = 50;
                ctx2d2.font="20px Georgia";
                ctx2d2.fillText("hi",10,50);

                // Create the placemark.
                placemark = new WorldWind.Placemark(new WorldWind.Position(earthquakeData[i].lat, earthquakeData[i].long, 1e2));
                placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

                // Create the placemark attributes for the placemark.
                placemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);

                // Wrap the canvas created above in an ImageSource object to specify it as the placemark image source.
                placemarkAttributes.imageSource = new WorldWind.ImageSource(canvas);
                placemark.attributes = placemarkAttributes;


                // Create the highlight attributes for this placemark. Note that the normal attributes are specified as
                // the default highlight attributes so that all properties are identical except the image scale. You could
                // instead vary the color, image, or other property to control the highlight representation.
                highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
                //highlightAttributes.imageSource = new WorldWind.ImageSource(canvasTwo);
                highlightAttributes.imageScale = 1.2;
                placemark.highlightAttributes = highlightAttributes;

                // Add the placemark to the layer.
                placemarkLayer.addRenderable(placemark);
            };
        }
        /*
        //update the Earthquakes object
        var baseT2 = new Date().getTime()/(1000)
        console.log("Parsing")
        console.log(xmlDocA)
        updateEarthquakes(xmlDocA);
        console.log(new Date().getTime()/(1000) - baseT2)
        */




        // Tell World Wind to log only warnings.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        // Create the World Window.
        var wwd = new WorldWind.WorldWindow("canvasOne");

        // Add imagery layers.
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

        var placemark,
            placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
            highlightAttributes,
            placemarkLayer = new WorldWind.RenderableLayer("Placemarks");

        // Set up the common placemark attributes.
        placemarkAttributes.imageScale = 1;
        placemarkAttributes.imageColor = WorldWind.Color.WHITE;

        //var baseT1 = new Date().getTime()/(1000)
        earthquakeHandler.updateEarthquakes(xmlDocA,2,0,500,true,wwd);
        //console.log(new Date().getTime()/(1000) - baseT1)

        // Add the placemarks layer to the World Window's layer list.
        wwd.addLayer(placemarkLayer);

        // Draw the World Window for the first time.
        wwd.redraw();

        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager(wwd);

        // Create a coordinate controller to update the coordinate overlay elements.
        var coordinateController = new CoordinateController(wwd);
        // Now set up to handle highlighting.
        var highlightController = new WorldWind.HighlightController(wwd);

        document.getElementById("canvasOne").onmousemove = function tss () {
            displayInfo(xmlDocA);
        };

        // Now set up to handle clicks and taps.

        // The common gesture-handling function.
        var handleClick = function (recognizer) {
            // Obtain the event location.
            var x = recognizer.clientX,
                y = recognizer.clientY;

            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            var pickList = wwd.pick(wwd.canvasCoordinates(x, y));

            // If only one thing is picked and it is the terrain, tell the world window to go to the picked location.
            if (pickList.objects.length == 1 && pickList.objects[0].isTerrain) {
                var position = pickList.objects[0].position;
                wwd.goTo(new WorldWind.Location(position.latitude, position.longitude));
            }
        };

        // Listen for mouse clicks.
        var clickRecognizer = new WorldWind.ClickRecognizer(wwd);
        clickRecognizer.addGestureListener(handleClick);

        // Listen for taps on mobile devices.
        var tapRecognizer = new WorldWind.TapRecognizer(wwd);
        tapRecognizer.addGestureListener(handleClick);
    });