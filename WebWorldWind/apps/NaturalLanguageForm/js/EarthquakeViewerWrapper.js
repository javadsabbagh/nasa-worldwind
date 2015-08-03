/**
 * Created by Matthew on 7/30/2015.
 */

define(['../../Earthquakes/src/scripts/EarthquakeViewLayer',
    '../../Earthquakes/src/scripts/UGSDataRetriever',
    'HUDMaker',
    '../../Earthquakes/src/scripts/CommandsPanel'],
    function (EarthquakeViewer, USGSDataRetriever, HUDMaker, CommandsPanel) {

        function EarthquakeViewerWrapper ( wwd, name) {
            var jQueryDoc = $(window.document)
            wwd.addLayer(new WorldWind.BMNGLayer());

            var usgs = new USGSDataRetriever();
            var eV = EarthquakeViewer(wwd,name);
            var self = eV;
            usgs.retrieveRecords(function(arg){
                eV.Manage.createDataArray(arg);
                if (window.layerManager){
                    window.layerManager.synchronizeLayerList();
                }

                // Couldn't get this to work
                //var commands = new HUDMaker('Commands', [jQueryDoc.width()-300, 0] );
                //var anchor = $('<div>');
                //anchor.attr('id', 'eData');
                //commands.addAnchor(anchor);

            });


            var highlightController = new WorldWind.HighlightController(wwd);
            wwd.addEventListener('mousedown', function (o) {
                eV.renderables.forEach(function(renderable){
                    if (renderable.highlighted) {
                        var HudTest = new HUDMaker(
                            'Earthquake Information',
                            [o.x,o.y]
                        );
                        console.log(renderable)
                        HudTest.assembleDisplay(renderable.info)
                    }
                });
            });

            return eV
        }

        return EarthquakeViewerWrapper
    }
)