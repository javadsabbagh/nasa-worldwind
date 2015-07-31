/**
 * Created by Matthew on 7/30/2015.
 */

define(['../../Earthquakes/src/scripts/EarthquakeViewLayer',
    '../../Earthquakes/src/scripts/UGSDataRetriever',
    'HUDMaker'],
    function (EarthquakeViewer, USGSDataRetriever, HUDMaker) {

        function EarthquakeViewerWrapper ( wwd, name) {
            wwd.addLayer(new WorldWind.BMNGLayer())



            var usgs = new USGSDataRetriever();
            var eV = EarthquakeViewer(wwd,name);
            usgs.retrieveRecords(function(arg){
                eV.Manage.createDataArray(arg);
                if (window.layerManager){
                    window.layerManager.synchronizeLayerList();
                }

            })
            return eV
        }

        return EarthquakeViewerWrapper
    }
)