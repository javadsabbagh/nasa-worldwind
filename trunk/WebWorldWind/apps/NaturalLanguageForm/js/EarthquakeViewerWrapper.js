/**
 * Created by Matthew on 7/30/2015.
 */

requirejs.config(
    //{
    //    baseURL: '../../EarthquakesRefactored/src/scripts/',
    //    paths:
    //}
     {
         paths: {
             'EarthquakeViewLayer': ' ../../EarthquakesRefactored/src/scripts/EarthquakeViewLayer',
             'USGSDataRetriever': '../../EarthquakesRefactored/src/scripts/USGSDataRetriever',
             'MinimumMagnitudeSlider': '../../EarthquakesRefactored/src/scripts/MinimumMagnitudeSlider',
             'CommandsPanel': '../../EarthquakesRefactored/src/scripts/CommandsPanel',
             'TectonicPlatesLayer': '../../EarthquakesRefactored/src/scripts/TectonicPlatesLayer',
             'PlateBoundaryDataProvider': '../../EarthquakesRefactored/src/scripts/PlateBoundaryDataProvider',
             'TourManager': '../../EarthquakesRefactored/src/scripts/TourManager',
             'Tour': '../../EarthquakesRefactored/src/scripts/Tour',
             'PlateBoundaryJsonReader': '../../EarthquakesRefactored/src/scripts/PlateBoundaryJsonReader'
         }
    }
);


define(['../../EarthquakesRefactored/src/scripts/EarthquakeApp',
    'HUDMaker'],
    function (EarthquakeApp, HUDMaker) {

        function EarthquakeViewerWrapper ( wwd, name) {
            var commandPanel = new HUDMaker('cpanel',[160,0])
            var panelDiv = $('<div>')
            panelDiv.attr('id', 'Panels')
            commandPanel.addAnchor(panelDiv)

            new EarthquakeApp(wwd, name)
        }

        return EarthquakeViewerWrapper
    }
)