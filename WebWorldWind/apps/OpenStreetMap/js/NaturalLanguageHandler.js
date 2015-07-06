/**
 * Created by Matthew on 6/30/2015.
 */


define(['OverpassAPIWrapper','RouteAPIWrapper','OSMDataRetriever'],
    function(OAW,RAW,ODR){
        'use strict';

        function NaturalLanguageHandler (wwd){
            var self = this;
            this._wwd = wwd;
            self.nearNames = ['Elgin','Near Me'];
            self.places = ['Starbucks'];
            //I am at _here/name__ near _location__ looking for __key/name__ within __miles__ of _location__
            //OR I am looking for __key/name__ within __miles__ of _location__
            //build bounding box based on location and miles
            //search for key/name using OSM data retriever
            //search for here/name using osm data retriever or use myLoc
            //if more than one turns up, clarify
            //get each location
            //route it

        };

        NaturalLanguageHandler.prototype.receiveInput = function (someInput, callback) {
            var self = this;
            var OSMDR;
            // var someBB = [42.00,-88.35,42.15,-88.2];
            // Each entry in someInput corrosponds to a blank in the NLS
            someInput = ['Starbucks','Near Me'];

            // This checks if there is more than one returned location and then asks the user to clarify.
            var clarityCallback = function (data) {
                if (data.features.length > 1) {
                    // Put something here to handle the NLH
                    // Append or initiate a second natural language handler
                    console.log('Too Many features.')
                    callback(data)
                } else {
                    console.log('One or No features.')
                    callback(data)
                    // something here to slide the overlay over
                }
            };

            // Step 1, translate someInput
            var TranslateAndSend = function (input, callbackS1) {
                var defaultLocation = [42.075, -88.275];
                // Do nothing with the name right now.
                // input[0] = input[0]
                var infoToPass = [];
                infoToPass[0] = input[0]

                // Below here is for finding the BB center. This does not build the BB yet.
                if (input[1] === 'Near Me'){
                    if (navigator.geolocation) {
                        var returnUsersLocation = function(inputFromGCP){
                            infoToPass[1] = inputFromGCP.coords;
                            callbackS1(infoToPass);
                        };
                        var returnDefaultLocation = function(inputFromGCP){
                            // This is by my house
                            console.log('Error finding users location.')
                            infoToPass[1] = defaultLocation;
                            callbackS1(infoToPass);
                        };
                        navigator.geolocation.getCurrentPosition(returnUsersLocation, returnDefaultLocation);
                    }
                } else {
                    //look up what the location of this is.
                    infoToPass[1] = defaultLocation;
                    callbackS1(infoToPass)
                }
            };

            // Use this for the step1 callback.
            var areaFetcherWrapper = function(translatedArrayData){
                if (!OSMDR){OSMDR = new ODR()}
                var boundingBox = self.buildBB(translatedArrayData[1])
                OSMDR.requestOSMData(boundingBox, 'name', clarityCallback, translatedArrayData[0])
            }

            TranslateAndSend(someInput, areaFetcherWrapper)

            // areaFetcher.requestOSMData(someBB, 'name', clarityCallback, someInput[0])
        };

        NaturalLanguageHandler.prototype.buildBB = function (BBCenter){
            return [BBCenter[0] -.075, BBCenter[1] -.075, BBCenter[0] +.075, BBCenter[1] +.075]
                //something here to build a bounding box based on location given
        };


        return NaturalLanguageHandler

    });