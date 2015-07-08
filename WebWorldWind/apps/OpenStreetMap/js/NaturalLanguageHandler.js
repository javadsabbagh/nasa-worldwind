/**
 * Created by Matthew on 6/30/2015.
 */


define(['OverpassAPIWrapper','RouteAPIWrapper','OSMDataRetriever'],
    function(OAW,RAW,ODR){
        'use strict';

        function NaturalLanguageHandler (wwd){
            var self = this;
            this._wwd = wwd;
            // THIS IS ALL FOR MATT. NOTES ON HOW I WANTED TO DO THE SEARCH.
            // self.nearNames = ['Elgin','Near Me'];
            // self.places = ['Starbucks'];
            //I am at _here/name__ near _location__ looking for __key/name__ within __miles__ of _location__
            //OR I am looking for __key/name__ within __miles__ of _location__
            //build bounding box based on location and miles
            //search for key/name using OSM data retriever
            //search for here/name using osm data retriever or use myLoc
            //if more than one turns up, clarify
            //get each location
            //route it
        };

        /* Call receiveInput with the output of the natural language search as a parameter.
        * 1 - translateAndSend(RawInputFromNaturalLanguageSearch, CallbackS1) -- Change 'near me' string to user's location.
        * 2 - callbackS1(translatedInput) -- Change BB center to Bounding Box array... I don't know why I didn't just
        *                                       put this in translateAndSend...
        * 3 - clarityCallback(RawInputFromOverpassAPI) -- return data containing exactly one feature to the routing funcs
        *
        * @param someInput: Array containing the words corrosponding to the selection in the
        *                   natural language search sentence. Looks like
        *                   [Location of Center of BB, Key search for API, value of Key for API, ...]
        **/

        NaturalLanguageHandler.prototype.receiveInput = function (someInput, callback) {
            var self = this;
            var OSMDR;

            // Default NHS input...
            if (!someInput){
                someInput = ['Near Me','name','Walmart'];
            }

            /* This 'modifies' the callback so that if the API returns more than one feature, it asks the user
            *  to choose one. This is called once all the input strings are turned into usable numbers.
            *
            *  @param data: This is the data that is returned from calling Overpass API
            **/

            var clarityCallback = function (data) {
                if (data.features.length > 1) {

                    // FUNCTION HERE: Add a function that tells the canvas to prompt the user for clarification.
                    //                prompt is used A.T.M.
                    // WhichLocation asks the user to choose the feature to select for directions.
                    var whichLocation = prompt("Type the number of the location of...(Temp) " + (data.features.length-1).toString(), 0);

                    // If the user chose a number, return data.features equal to an array containing that element.
                    if (whichLocation != null){
                        data.features = [data.features[whichLocation]];
                        callback(data)
                    }

                    // FUNCTION HERE: Add a function that tells the canvas to hide.
                } else {
                    callback(data);

                    // FUNCTION HERE: Add a function that tells the canvas to hide.
                }
            };

            /* This takes the strings from the input and turns them into arrays/numbers.
            *
            *   @param input: input should be the array of strings corrosponding to selected words in the NHL.
            *   @param callbackS1: this should be the call back function that turns the bounding box center into
            *                       a bounding box array. That callback should then call the API.
            **/

            var TranslateAndSend = function (input, callbackS1) {

                // This is matts house. This is in case the navigator fails to retrieve user's location.
                var defaultLocation = [42.038, -88.323];

                // infoToPass[0] is the array [lat, long] of the start location.
                // infoToPass[1] is the key for the Overpass API
                // infoToPass[2] is the value of the key for the Overpass API, this may be blank to return all values
                //              of the key in the bounding box.
                var infoToPass = [];
                infoToPass[1] = input[1];
                infoToPass[2] = input[2];

                // If the user inputs 'Near Me' as the start location, it tries to use the users current position.
                if (input[0] === 'Near Me'){
                    if (navigator.geolocation) {
                        var returnUsersLocation = function(inputFromGCP){
                            infoToPass[0] = inputFromGCP.coords;
                            callbackS1(infoToPass);
                        };
                        var returnDefaultLocation = function(inputFromGCP){
                            console.log('Error finding users location.')
                            infoToPass[0] = defaultLocation;
                            callbackS1(infoToPass);
                        };

                        // Sets the location to get directions from as the user's location.
                        // If it fails to get the user's location, it goes to the default location... Matt's house.
                        navigator.geolocation.getCurrentPosition(returnUsersLocation, returnDefaultLocation);
                    }
                } else {

                    //Currently this is here so that it returns the default location if nothing else.
                    // FUNCTION HERE: Put a function here to determine the 'location' of the string and set it
                    //                  to infoToPass[0]
                    infoToPass[0] = defaultLocation;
                    callbackS1(infoToPass)
                }
            };

            /* Builds the bounding box based around a center.
            *
            *   @param translatedArrayData: The input array from the NHL after it has been
            *                               processed by translateAndSend.
            **/

            var areaFetcherWrapper = function(translatedArrayData){

                // Create an open street map API caller if not done already.
                if (!OSMDR){OSMDR = new ODR()}

                // Build the bounding box around the center.
                var boundingBox = self.buildBB(translatedArrayData[0]);

                // Call the API with the translated data and bounding box and return the data from the API
                //      to the callback.
                OSMDR.requestOSMData(boundingBox, translatedArrayData[1], clarityCallback, translatedArrayData[2])
            }

            // Calls the API after someInput is translated and the bounding box is determined.
            // Translate(someInput) -> areaFetcherWrapper(translatedSomeInput)
            TranslateAndSend(someInput, areaFetcherWrapper)

        };

        /* Builds the bounding box based around a center.
        *
        *   @param BBCenter: The center of where the bounding box needs to be.
        **/

        NaturalLanguageHandler.prototype.buildBB = function (BBCenter){
            return [BBCenter[0] -.075, BBCenter[1] -.075, BBCenter[0] +.075, BBCenter[1] +.075]
        };


        return NaturalLanguageHandler

    });