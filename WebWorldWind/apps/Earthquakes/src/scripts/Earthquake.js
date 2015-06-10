requirejs(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'http://worldwindserver.net/webworldwind/examples/LayerManager.js',
        'http://worldwindserver.net/webworldwind/examples/CoordinateController.js'],
    function (ww,
              LayerManager,
              CoordinateController) {
        "use strict";

        //set the earthquake database
        //var baseT1 = new Date().getTime()/(1000)
        //console.log(new Date().getTime()/(1000) - baseT1)
        var baseT1 = new Date().getTime()/(1000)
        var xmlDocA = loadXMLDoc("http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.quakeml");
        console.log(new Date().getTime()/(1000) - baseT1)
        //displays earthquake info on mouseover. This is a rough cut to be changed as it does not localize itself to the window.
        var displayInfo = function (database,handler) {
            var display = $('#eData');

            for (var i in placemarkLayer.renderables) {

                if (placemarkLayer.renderables[i].highlighted) {
                    display.empty();
                    display.append('<p>' + handler.earthquakeData[i].info + '</p>');
                }

            }
        };


        function getColorSpectrum(daysAge,limittingAge){
            var r, g, b;
            var paramOne = 255, retVar, paramTwo = 0, paramThree = 0;
            var hashSect = daysAge/limittingAge;
            if (hashSect <= .34){
                paramTwo = (hashSect/.34)*132
                retVar = "rgb("+ Math.round(paramOne.toString())
                    + "," + Math.round(paramTwo.toString())
                    + "," + Math.round(paramThree.toString()) +")";
            } else if (hashSect <= .67){
                paramOne = 255-((hashSect - .34)/.33)*(255-158)
                paramTwo = 132 + ((hashSect - .34)/.33)*(255-132)
                retVar = "rgb("+ Math.round(paramOne.toString())
                    + "," + Math.round(paramTwo.toString())
                    + "," + Math.round(paramThree.toString()) +")";
            } else{
                paramOne = 152 - ((hashSect - .34)/.33)*(152)
                paramTwo = 255 - ((hashSect - .34)/.33)*(255)
                paramThree = (hashSect/.34)*255
                retVar = "rgb("+ Math.round(paramOne.toString())
                    + "," + Math.round(paramTwo.toString())
                    + "," + Math.round(paramThree.toString()) +")";
            };
            return retVar;
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

        //retrieve a number from that database that has a value tag
        var getXVal = function(ex,database,iter){
            return database.getElementsByTagName(ex)[iter].getElementsByTagName("value")[0].childNodes[0].nodeValue;
        };
        var getX = function(ex,database,iter){
            return database.getElementsByTagName(ex)[iter].childNodes[0].nodeValue;

        };

        var oldestEarthquake = 0;

        //this is the primary handler for the earthquake app
        function EarthquakeHandler (database,minMag,wwd,layer) {
            var globalMinMag; //The minimum magnitude to be displayed
            var Handler = this; //for objects inside this one that need to call a method/property from this object.
            this.xmlHasher = []; //Maps the temporary loop variable to the number in which that earthquake resides in the xml database

            //counts all the earthquakes that have equal to or greater than the minimum magnitude in a given database.
            this.countEarthquakes = function(database,minMag) {
                var numEarth = 0;
                var itchy = 0;
                while (typeof xmlDocA.getElementsByTagName("event")[itchy] === 'object'){
                    if (getXVal("mag",database,itchy) >= minMag) {
                        this.xmlHasher[numEarth] = itchy;
                        numEarth++;
                    };
                    itchy++;
                };
                return numEarth;
            };

            //grabs all the relevant earthquake data from a given database. It then draws the earthquakes and updates the window if thenDraw = true
            this.updateEarthquakes = function (database,minMag,wwd) {
                minMag = typeof minMag !== 'undefined' ? minMag: 2.5;
                var thenDraw = true; //do we want to autmatically update the worldwindow?
                var stop = 8500; //the stopping point in the earthquake data array for which we stop considering earthquakes
                var start = 0; //the starting point in the earthquake data array for which we start considering earthquakes
                this.earthquakeData = []; //this array will store earthquake ids. Earth element in the array in an object associated with an earthquake.
                this.numberOfEarthquakes = this.countEarthquakes(database,minMag);

                //this loops through all the earthquakes that met the criteria of min mag and grabs the relevant info
                for (var i = start; i < Math.min(this.xmlHasher.length,stop); i++){
                    this.earthquakeData[i] = {};
                    this.earthquakeData[i].lat = getXVal("latitude",database, this.xmlHasher[i]);
                    this.earthquakeData[i].long = getXVal("longitude",database, this.xmlHasher[i]);
                    this.earthquakeData[i].magnitude = getXVal("mag",database, this.xmlHasher[i]);
                    this.earthquakeData[i].date = getXVal("time",database,this.xmlHasher[i]);

                    //simultaneously calculates age in days or if the age is less than a day, it counts the age in hours.
                    this.earthquakeData[i].age = Math.abs(
                            (new Date().getTime() - new Date(this.earthquakeData[i].date).getTime())/(24*60*60*1000)
                    )
                    switch (Math.floor(this.earthquakeData[i].age)){
                        case 0: this.earthquakeData[i].stamp = Math.floor(Math.abs(
                                (new Date().getTime() - new Date(this.earthquakeData[i].date).getTime())/(60*60*1000)
                            )) + " Hours Ago"
                            break;
                        case 1: this.earthquakeData[i].stamp = Math.floor(this.earthquakeData[i].age) + " Day Ago"
                            break;
                        default: this.earthquakeData[i].stamp = Math.floor(this.earthquakeData[i].age) + " Days Ago"
                    }

                    this.earthquakeData[i].info = "M " + getXVal("mag",database,this.xmlHasher[i]) + " - "
                        + database.getElementsByTagName("description")[this.xmlHasher[i]].getElementsByTagName("text")[0].childNodes[0].nodeValue
                        + "<br>"  + this.earthquakeData[i].stamp + "<br>" + Math.round(getXVal("depth",database,i))/1000 + "km deep";
                }

                if (thenDraw){this.drawEarthquakes(start,stop); wwd.redraw();}
            };

            //adds earthquake placemark to the layer and redraws the window
            this.drawEarthquakes = function(start,stop){

                //Creates a placemark for each earthquake object.
                for (var i = start; i < Math.min(this.numberOfEarthquakes,stop); i++){
                    // Create the custom image for the placemark for each earthquake.
                    var canvas = document.createElement("canvas"),
                        ctx2d = canvas.getContext("2d"),
                        size = this.earthquakeData[i].magnitude*5 , c = size / 2  - 0.5, innerRadius = 0, outerRadius = this.earthquakeData[i].magnitude*2.2;
                    canvas.width = size;
                    canvas.height = size;

                    ctx2d.fillStyle = getColorSpectrum(this.earthquakeData[i].age,this.earthquakeData[Handler.numberOfEarthquakes-1].age);
                    ctx2d.alpha = true;
                    ctx2d.globalAlpha = .55;
                    ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
                    ctx2d.fill();

                    // Create the placemark.
                    placemark = new WorldWind.Placemark(new WorldWind.Position(this.earthquakeData[i].lat, this.earthquakeData[i].long, 1e2));
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
                    placemark.highlightAttributes = highlightAttributes;

                    // Add the placemark to the layer.
                    placemarkLayer.addRenderable(placemark);
                };
            };

            //this creates the dropdown button for the minimum magnitude and also adds functionality. Modelled off of layerManager
            this.MagnitudeManager = function (worldWindow,layer) {
                var thisExplorer = this;

                this.wwd = worldWindow;

                //Creates the list of options
                this.createMagOptions();
                $("#minMag").find(" li").on("click", function (e) {
                    thisExplorer.onProjectionClick(e,layer);
                });
            };

            //this adds functionality. Whenever the option is clicked, it sets globalMinMag to that value.
            this.MagnitudeManager.prototype.onProjectionClick = function (event,layer) {
                var magSelected = event.target.innerText || event.target.innerHTML; //retrieves the value of the button selected in the dropdown menu
                $("#minMag").find("button").html(magSelected + ' <span class="caret"></span>'); //finds the button in the dropdown menu
                switch (magSelected) {
                    case ("2.5"): globalMinMag = 2.5;
                        break;
                    case ("3"): globalMinMag = 3;
                        break;
                    case ("4"): globalMinMag = 4;
                        break;
                    case ("5"): globalMinMag = 5;
                        break;
                    case ("6"): globalMinMag = 6;
                        break;
                    case ("7"): globalMinMag = 7;
                        break;
                    default: globalMinMag = 2.5;
                }

                layer.removeAllRenderables(); //clears the layer of all earthquakes so the ones we care about can be readded.
                Handler.updateEarthquakes(database,globalMinMag,wwd); //adds the relevant earthquakes back to the layer and then refreshes the window
            };

            //this creates the dropdown menu. No real functionality.
            this.MagnitudeManager.prototype.createMagOptions = function () {
                var magSelection = [
                    "2.5",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7"
                ];

                var magDropdown = $("#minMag");

                var dropdownButton = $('<button class="btn btn-info btn-block dropdown-toggle" type="button" data-toggle="dropdown">Magnitude<span class="caret"></span></button>');
                magDropdown.append(dropdownButton);

                var ulItem = $('<ul class="dropdown-menu">');
                magDropdown.append(ulItem);

                for (var i = 0; i < magSelection.length; i++) {
                    var magOption = $('<li><a >' + magSelection[i] + '</a></li>');
                    ulItem.append(magOption);
                }

                ulItem = $('</ul>');
                magDropdown.append(ulItem);
            };

            this.updateEarthquakes(database,globalMinMag,wwd); //adds all the earthquakes for the first time.
            this.magManager = new this.MagnitudeManager(wwd,layer); //creates the manager for the first
            // Animate Latest Earthquake
            var currentIndex = 0;
            window.setInterval(function (){
                // Create the custom image for the placemark for each earthquake.
                var canvas = document.createElement("canvas"),
                    ctx2d = canvas.getContext("2d"),
                    size = Handler.earthquakeData[0].magnitude*5 , c = size / 2  - 0.5, innerRadius = 0,
                    outerRadius = Handler.earthquakeData[0].magnitude*2.2;
                canvas.width = size;
                canvas.height = size;

                ctx2d.fillStyle = getColorSpectrum(Handler.earthquakeData[0].age,Handler.earthquakeData[Handler.numberOfEarthquakes-1].age);
                ctx2d.alpha = true;
                ctx2d.globalAlpha = 1-currentIndex/20;
                ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
                ctx2d.fill();

                currentIndex += 1
                placemarkLayer.renderables[0].attributes.imageScale = currentIndex/10;
                placemarkLayer.renderables[0].highlightAttributes.imageScale = currentIndex/10*2;
                placemarkLayer.renderables[0].attributes.imageSource = new WorldWind.ImageSource(canvas);
                placemarkLayer.renderables[0].highlightAttributes.imageSource = new WorldWind.ImageSource(canvas);
                if (currentIndex > 20){
                    currentIndex = 0;
                };
                wwd.redraw();
            }, 50);
        };

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
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: false}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }
        var placemark,
            placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
            highlightAttributes,
            placemarkLayer = new WorldWind.RenderableLayer("Placemarks");

        //var baseT1 = new Date().getTime()/(1000)
        //console.log(new Date().getTime()/(1000) - baseT1)

        var earthquakeHandler = new EarthquakeHandler(xmlDocA,3,wwd,placemarkLayer);

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


        //adds the earthquake info to the webpage on mouseover. This needs to be localized to the window. Could be done by changing the worldwindow event listener
        document.getElementById("canvasOne").onmousemove = function tss () {
            displayInfo(xmlDocA,earthquakeHandler);
        };
    });