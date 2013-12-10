/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import "MovingMapViewController.h"
#import "WorldWind.h"
#import "WorldWindView.h"
#import "WWLayerList.h"
#import "WWRenderableLayer.h"
#import "WWSceneController.h"
#import "WWBMNGLandsatCombinedLayer.h"
#import "LayerListController.h"
#import "AppConstants.h"
#import "WWElevationShadingLayer.h"
#import "Settings.h"
#import "ButtonWithImageAndText.h"
#import "METARLayer.h"
#import "WWPointPlacemark.h"
#import "WWNavigatorState.h"
#import "WWPosition.h"
#import "WWGlobe.h"
#import "WWVec4.h"
#import "METARDataViewController.h"
#import "WWPickedObject.h"
#import "WWPickedObjectList.h"
#import "PIREPLayer.h"
#import "PIREPDataViewController.h"
#import "OpenWeatherMapLayer.h"
#import "WWNavigator.h"
#import "FAAChartsAlaskaLayer.h"
#import "CompassLayer.h"
#import "ScaleBarView.h"
#import "FlightRouteListController.h"
#import "FlightPathsLayer.h"
#import "PositionReadoutController.h"
#import "ChartViewController.h"
#import "WWUtil.h"
#import "ChartsTableController.h"
#import "WeatherCamLayer.h"
#import "WeatherCamViewController.h"
#import "WaypointFile.h"
#import "WaypointLayer.h"

@implementation MovingMapViewController
{
    CGRect myFrame;
    NSArray* normalConstraints;
    NSArray* splitViewConstraints;
    BOOL isSplitView;

    UIToolbar* topToolBar;
    UIBarButtonItem* connectivityButton;
    //UIBarButtonItem* flightPathsButton;
    UIBarButtonItem* overlaysButton;
    UIBarButtonItem* splitViewButton;
    UIBarButtonItem* quickViewsButton;
    UIBarButtonItem* routePlanningButton;
    ScaleBarView* scaleBarView;
    ChartsTableController* chartsListController;
    ChartViewController* chartViewController;
    UINavigationController* chartListNavController;

    LayerListController* layerListController;
    UIPopoverController* layerListPopoverController;

    FAAChartsAlaskaLayer* faaChartsLayer;
    OpenWeatherMapLayer* precipitationLayer;
    OpenWeatherMapLayer* cloudsLayer;
    OpenWeatherMapLayer* temperatureLayer;
    OpenWeatherMapLayer* snowLayer;
    OpenWeatherMapLayer* windLayer;
    WWElevationShadingLayer* terrainAltitudeLayer;
    METARLayer* metarLayer;
    PIREPLayer* pirepLayer;
    WeatherCamLayer* weatherCamLayer;
    CompassLayer* compassLayer;
    FlightPathsLayer* flightPathsLayer;

    UITapGestureRecognizer* tapGestureRecognizer;

    METARDataViewController* metarDataViewController;
    UIPopoverController* metarDataPopoverController;
    PIREPDataViewController* pirepDataViewController;
    UIPopoverController* pirepDataPopoverController;
    PositionReadoutController* positionReadoutViewController;
    UIPopoverController* positionReadoutPopoverController;
    WeatherCamViewController* weatherCamViewController;
    UIPopoverController* weatherCamPopoverController;

    WaypointFile* waypointFile;
    WaypointLayer* waypointLayer;
    WWRenderableLayer* flightRouteLayer;
    FlightRouteListController* flightRouteController;
    UIPopoverController* flightRoutePopoverController;
}

- (id) initWithFrame:(CGRect)frame
{
    self = [super initWithNibName:nil bundle:nil];

    myFrame = frame;

    metarDataViewController = [[METARDataViewController alloc] init];
    pirepDataViewController = [[PIREPDataViewController alloc] init];
    positionReadoutViewController = [[PositionReadoutController alloc] init];
    weatherCamViewController = [[WeatherCamViewController alloc] init];

    return self;
}

- (void) loadView
{
    self.view = [[UIView alloc] initWithFrame:myFrame];
    self.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    self.view.autoresizesSubviews = YES;

    [self createWorldWindView];
    [self createTopToolbar];
    [self createChartsController];

    float x = 20;//myFrame.size.width - 220;
    float y = myFrame.size.height - 70;
    scaleBarView = [[ScaleBarView alloc] initWithFrame:CGRectMake(x, y, 200, 50) worldWindView:_wwv];
    scaleBarView.autoresizingMask = UIViewAutoresizingFlexibleRightMargin | UIViewAutoresizingFlexibleTopMargin;
    [self.view addSubview:scaleBarView];

    [topToolBar setTranslatesAutoresizingMaskIntoConstraints:NO];
    [_wwv setTranslatesAutoresizingMaskIntoConstraints:NO];
    [[chartListNavController view] setTranslatesAutoresizingMaskIntoConstraints:NO];

    UIView* view = [self view];
    UIView* chartView = [chartListNavController view];
    NSDictionary* viewsDictionary = NSDictionaryOfVariableBindings(view, _wwv, chartView, topToolBar, scaleBarView);

    [view addConstraints:[NSLayoutConstraint constraintsWithVisualFormat:@"H:|[topToolBar]|"
                                                                 options:0 metrics:nil views:viewsDictionary]];
    [view addConstraints:[NSLayoutConstraint constraintsWithVisualFormat:@"V:|[topToolBar(==80)][_wwv(>=400)]|"
                                                                 options:0 metrics:nil views:viewsDictionary]];
    [view addConstraints:[NSLayoutConstraint constraintsWithVisualFormat:@"V:|[topToolBar(==80)][chartView(>=400)]|"
                                                                 options:0 metrics:nil views:viewsDictionary]];

    normalConstraints = [NSLayoutConstraint constraintsWithVisualFormat:@"H:|[_wwv(==view)][chartView(==0)]|"
                                                                options:0 metrics:nil views:viewsDictionary];
    splitViewConstraints = [NSLayoutConstraint constraintsWithVisualFormat:@"H:|[_wwv(>=400)][chartView(==350)]|"
                                                                   options:0 metrics:nil views:viewsDictionary];

    isSplitView = [Settings getBoolForName:@"gov.nasa.worldwind.taiga.splitview.enabled" defaultValue:NO];
    [view addConstraints:isSplitView ? splitViewConstraints : normalConstraints];
    if (isSplitView)
        [self loadMostRecentlyUsedChart];

    [self loadWaypoints];
}

- (void) loadMostRecentlyUsedChart
{
    NSString* chartFileName = [[NSUserDefaults standardUserDefaults]
            objectForKey:@"gov.nasa.worldwind.taiga.splitview.chartpath"];

    if (chartFileName == nil || chartFileName.length == 0)
        return;

    NSString* chartName = [[NSUserDefaults standardUserDefaults]
            objectForKey:@"gov.nasa.worldwind.taiga.splitview.chartname"];
    if (chartName == nil || chartName.length == 0)
        return;

    [chartsListController selectChart:chartFileName chartName:chartName];
}

- (void) loadWaypoints
{
    NSString* airportsPath = @"http://worldwindserver.net/taiga/dafif/ARPT2_ALASKA.TXT";
    NSString* waypointsPath = @"http://worldwindserver.net/taiga/dafif/WPT2_ALASKA.TXT";

    waypointFile = [[WaypointFile alloc] init];
    [waypointFile loadWaypointLocations:@[airportsPath, waypointsPath]
                          finishedBlock:^(WaypointFile* retrievedWaypointFile)
                          {
                              [self waypointsDidLoad];
                          }];
}

- (void) waypointsDidLoad
{
    waypointLayer = [[WaypointLayer alloc] initWithWaypointFile:waypointFile];
    [waypointLayer setDisplayName:@"Airports"];
    [waypointLayer setEnabled:[Settings getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [waypointLayer displayName]] defaultValue:NO]];
    [waypointLayer setOpacity:[Settings getFloatForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.%@.opacity", [waypointLayer displayName]] defaultValue:[waypointLayer opacity]]];
    [[[_wwv sceneController] layers] insertLayer:waypointLayer atIndex:0];

    flightRouteLayer = [[WWRenderableLayer alloc] init];
    [flightRouteLayer setDisplayName:@"Flight Routes"];
    [[flightRouteLayer userTags] setObject:@"" forKey:TAIGA_HIDDEN_LAYER];
    [[[_wwv sceneController] layers] insertLayer:flightRouteLayer atIndex:1];

    flightRouteController = [[FlightRouteListController alloc] initWithWaypointFile:waypointFile
                                                                      worldWindView:_wwv
                                                                   flightRouteLayer:flightRouteLayer];
    [routePlanningButton setEnabled:YES];

    [[NSNotificationCenter defaultCenter] postNotificationName:WW_REQUEST_REDRAW object:self];
}

- (void) viewDidLoad
{
    [super viewDidLoad];

    WWLog(@"View Did Load. World Wind iOS Version %@", WW_VERSION);

    WWLayerList* layers = [[_wwv sceneController] layers];

    WWLayer* layer = [[WWBMNGLandsatCombinedLayer alloc] init];
    [[layer userTags] setObject:@"" forKey:TAIGA_HIDDEN_LAYER];
    [layers addLayer:layer];

    faaChartsLayer = [[FAAChartsAlaskaLayer alloc] init];
    [faaChartsLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [faaChartsLayer displayName]] defaultValue:YES]];
    [[[_wwv sceneController] layers] addLayer:faaChartsLayer];

    flightPathsLayer = [[FlightPathsLayer alloc] initWithPathsLocation:@"http://worldwind.arc.nasa.gov/mobile/PassageWays.json"];
    [flightPathsLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [flightPathsLayer displayName]] defaultValue:NO]];
    [[[_wwv sceneController] layers] addLayer:flightPathsLayer];

    precipitationLayer = [[OpenWeatherMapLayer alloc] initWithLayerName:@"precipitation" displayName:@"Precipitation"];
    [precipitationLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [precipitationLayer displayName]] defaultValue:NO]];
    [precipitationLayer setOpacity:0.4];
    [[[_wwv sceneController] layers] addLayer:precipitationLayer];

    cloudsLayer = [[OpenWeatherMapLayer alloc] initWithLayerName:@"clouds" displayName:@"Clouds"];
    [cloudsLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [cloudsLayer displayName]] defaultValue:NO]];
    [cloudsLayer setOpacity:0.4];
    [[[_wwv sceneController] layers] addLayer:cloudsLayer];

    temperatureLayer = [[OpenWeatherMapLayer alloc] initWithLayerName:@"temp" displayName:@"Temperature"];
    [temperatureLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [temperatureLayer displayName]] defaultValue:NO]];
    [temperatureLayer setOpacity:0.4];
    [[[_wwv sceneController] layers] addLayer:temperatureLayer];

    snowLayer = [[OpenWeatherMapLayer alloc] initWithLayerName:@"snow" displayName:@"Snow"];
    [snowLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [snowLayer displayName]] defaultValue:NO]];
    [snowLayer setOpacity:0.4];
    [[[_wwv sceneController] layers] addLayer:snowLayer];

    windLayer = [[OpenWeatherMapLayer alloc] initWithLayerName:@"wind" displayName:@"Wind"];
    [windLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [windLayer displayName]] defaultValue:NO]];
    [windLayer setOpacity:0.4];
    [[[_wwv sceneController] layers] addLayer:windLayer];

    [self createTerrainAltitudeLayer];
    [terrainAltitudeLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [terrainAltitudeLayer displayName]] defaultValue:NO]];
    [layers addLayer:terrainAltitudeLayer];

    metarLayer = [[METARLayer alloc] init];
    [metarLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [metarLayer displayName]] defaultValue:NO]];
    [[[_wwv sceneController] layers] addLayer:metarLayer];

    pirepLayer = [[PIREPLayer alloc] init];
    [pirepLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [pirepLayer displayName]] defaultValue:NO]];
    [[[_wwv sceneController] layers] addLayer:pirepLayer];

    weatherCamLayer = [[WeatherCamLayer alloc] init];
    [weatherCamLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [weatherCamLayer displayName]] defaultValue:NO]];
    [[[_wwv sceneController] layers] addLayer:weatherCamLayer];

    compassLayer = [[CompassLayer alloc] init];
    [[compassLayer userTags] setObject:@"" forKey:TAIGA_HIDDEN_LAYER];
    [compassLayer setEnabled:[Settings                                                                               getBoolForName:
            [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.enabled.%@", [compassLayer displayName]] defaultValue:YES]];
    [[[_wwv sceneController] layers] addLayer:compassLayer];

    layerListController = [[LayerListController alloc] initWithWorldWindView:_wwv];

    tapGestureRecognizer = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(handleTap:)];
    [tapGestureRecognizer setNumberOfTapsRequired:1];
    [tapGestureRecognizer setNumberOfTouchesRequired:1];
    [_wwv addGestureRecognizer:tapGestureRecognizer];

    // Set any persisted layer opacity.
    for (WWLayer* wwLayer in [[[_wwv sceneController] layers] allLayers])
    {
        NSString* settingName = [[NSString alloc] initWithFormat:@"gov.nasa.worldwind.taiga.layer.%@.opacity",
                                                                 [wwLayer displayName]];
        float opacity = [Settings getFloatForName:settingName defaultValue:[wwLayer opacity]];
        [wwLayer setOpacity:opacity];
    }
}

- (void) viewWillAppear:(BOOL)animated
{
//    [((UINavigationController*) [self parentViewController]) setNavigationBarHidden:YES animated:YES];
}

- (void) createWorldWindView
{
    CGFloat wwvWidth = self.view.bounds.size.width;
    CGFloat wwvHeight = self.view.bounds.size.height - TAIGA_TOOLBAR_HEIGHT;
//    CGFloat wwvOriginY = self.view.bounds.origin.y + TAIGA_TOOLBAR_HEIGHT;
    CGFloat wwvOriginY = TAIGA_TOOLBAR_HEIGHT;

    _wwv = [[WorldWindView alloc] initWithFrame:CGRectMake(0, wwvOriginY, wwvWidth, wwvHeight)];
    if (_wwv == nil)
    {
        NSLog(@"Unable to create a WorldWindView");
        return;
    }

    WWPosition* position = [[WWPosition alloc] initWithDegreesLatitude:65 longitude:-150 altitude:0];
    [[_wwv navigator] setToRegionWithCenter:position radius:800e3];

    //[_wwv setContentScaleFactor:[[UIScreen mainScreen] scale]]; // enable retina resolution
    [self.view addSubview:_wwv];
}

- (void) createChartsController
{
    chartsListController = [[ChartsTableController alloc] initWithParent:self];
    chartListNavController = [[UINavigationController alloc] initWithRootViewController:chartsListController];
    [self.view addSubview:[chartListNavController view]];
}

- (void) loadChart:(NSString*)chartPath chartName:(NSString*)chartName
{
    if ([[NSFileManager defaultManager] fileExistsAtPath:chartPath])
    {
        if (chartName == nil)
            chartName = @"";

        if (chartViewController == nil)
            chartViewController = [[ChartViewController alloc] initWithFrame:[[chartsListController view] frame]];

        [[chartViewController imageView] setImage:[WWUtil convertPDFToUIImage:[[NSURL alloc]
                initFileURLWithPath:chartPath]]];
        [chartViewController setTitle:chartName];

        [[NSUserDefaults standardUserDefaults] setObject:[chartPath lastPathComponent]
                                                  forKey:@"gov.nasa.worldwind.taiga.splitview.chartpath"];
        [[NSUserDefaults standardUserDefaults] setObject:chartName
                                                  forKey:@"gov.nasa.worldwind.taiga.splitview.chartname"];
        [[NSUserDefaults standardUserDefaults] synchronize];

        [self performSelectorOnMainThread:@selector(pushChart) withObject:nil waitUntilDone:NO];
    }
}

- (void) pushChart
{
    [((UINavigationController*) [chartsListController parentViewController]) pushViewController:chartViewController animated:YES];
}

- (void) createTopToolbar
{
    topToolBar = [[UIToolbar alloc] init];
    topToolBar.frame = CGRectMake(0, 0, self.view.frame.size.width, TAIGA_TOOLBAR_HEIGHT);
    [topToolBar setAutoresizingMask:UIViewAutoresizingFlexibleWidth];
    [topToolBar setBarStyle:UIBarStyleBlack];
    [topToolBar setTranslucent:NO];

    CGSize size = CGSizeMake(140, TAIGA_TOOLBAR_HEIGHT);

    connectivityButton = [[UIBarButtonItem alloc] initWithImage:[UIImage imageNamed:@"275-broadcast"]
                                                          style:UIBarButtonItemStylePlain
                                                         target:nil
                                                         action:nil];
    [connectivityButton setTintColor:[UIColor whiteColor]];

    //flightPathsButton = [[UIBarButtonItem alloc] initWithCustomView:[[ButtonWithImageAndText alloc]
    //        initWithImageName:@"38-airplane" text:@"Flight Paths" size:size target:self action:@selector
    //        (handleFlightPathsButton)]];
    //UIColor* color = [[UIColor alloc] initWithRed:1.0 green:242. / 255. blue:183. / 255. alpha:1.0];
    //[((ButtonWithImageAndText*) [flightPathsButton customView]) setTextColor:color];
    //[((ButtonWithImageAndText*) [flightPathsButton customView]) setFontSize:15];

    overlaysButton = [[UIBarButtonItem alloc] initWithCustomView:[[ButtonWithImageAndText alloc]
            initWithImageName:@"328-layers2" text:@"Overlays" size:size target:self action:@selector
            (handleOverlaysButton)]];
    UIColor* color = [[UIColor alloc] initWithRed:1.0 green:242. / 255. blue:183. / 255. alpha:1.0];
    [((ButtonWithImageAndText*) [overlaysButton customView]) setTextColor:color];
    [((ButtonWithImageAndText*) [overlaysButton customView]) setFontSize:15];

    splitViewButton = [[UIBarButtonItem alloc] initWithCustomView:[[ButtonWithImageAndText alloc]
            initWithImageName:@"362-2up" text:@"Split View" size:size target:self action:@selector
            (handleSplitViewButton)]];
    color = [[UIColor alloc] initWithRed:1.0 green:242. / 255. blue:183. / 255. alpha:1.0];
    [((ButtonWithImageAndText*) [splitViewButton customView]) setTextColor:color];
    [((ButtonWithImageAndText*) [splitViewButton customView]) setFontSize:15];
//
//    quickViewsButton = [[UIBarButtonItem alloc] initWithCustomView:[[ButtonWithImageAndText alloc]
//            initWithImageName:@"309-thumbtack" text:@"Quick Views" size:size target:self action:@selector
//            (handleButtonTap)]];
//    color = [[UIColor alloc] initWithRed:1.0 green:242. / 255. blue:183. / 255. alpha:1.0];
//    [((ButtonWithImageAndText*) [quickViewsButton customView]) setTextColor:color];
//    [((ButtonWithImageAndText*) [quickViewsButton customView]) setFontSize:15];

    routePlanningButton = [[UIBarButtonItem alloc] initWithCustomView:[[ButtonWithImageAndText alloc]
            initWithImageName:@"122-stats" text:@"Route Planning" size:size target:self action:@selector
            (handleRoutePlanningButton)]];
    color = [[UIColor alloc] initWithRed:1.0 green:242. / 255. blue:183. / 255. alpha:1.0];
    [((ButtonWithImageAndText*) [routePlanningButton customView]) setTextColor:color];
    [((ButtonWithImageAndText*) [routePlanningButton customView]) setFontSize:15];
    [routePlanningButton setEnabled:NO]; // route planning button is enabled after waypoints load

    UIBarButtonItem* flexibleSpace = [[UIBarButtonItem alloc]
            initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace target:nil action:nil];

    [topToolBar setItems:[NSArray arrayWithObjects:
            //flexibleSpace,
            //flightPathsButton,
            flexibleSpace,
            overlaysButton,
            flexibleSpace,
            splitViewButton,
//            flexibleSpace,
//            quickViewsButton,
            flexibleSpace,
            routePlanningButton,
            flexibleSpace,
            connectivityButton,
            nil]];

    [self.view addSubview:topToolBar];
}

- (void) createTerrainAltitudeLayer
{
    terrainAltitudeLayer = [[WWElevationShadingLayer alloc] init];
    [terrainAltitudeLayer setDisplayName:@"Terrain Altitude"];

    float threshold = [Settings getFloatForName:TAIGA_SHADED_ELEVATION_THRESHOLD_RED defaultValue:3000.0];
    [terrainAltitudeLayer setRedThreshold:threshold];
    [Settings setFloat:threshold forName:TAIGA_SHADED_ELEVATION_THRESHOLD_RED];

    float offset = [Settings getFloatForName:TAIGA_SHADED_ELEVATION_OFFSET defaultValue:304.8]; // 1000 feet
    [terrainAltitudeLayer setYellowThreshold:[terrainAltitudeLayer redThreshold] - offset];
    [Settings setFloat:offset forName:TAIGA_SHADED_ELEVATION_OFFSET];

    float opacity = [Settings getFloatForName:TAIGA_SHADED_ELEVATION_OPACITY defaultValue:0.3];
    [terrainAltitudeLayer setOpacity:opacity];
    [Settings setFloat:opacity forName:TAIGA_SHADED_ELEVATION_OPACITY];
}

- (void) handleButtonTap
{
    NSLog(@"BUTTON TAPPED");
}

//- (void) handleFlightPathsButton
//{
//    [flightPathsLayer setEnabled:![flightPathsLayer enabled]];
//    [[NSNotificationCenter defaultCenter] postNotificationName:WW_LAYER_LIST_CHANGED object:self];
//    [[NSNotificationCenter defaultCenter] postNotificationName:WW_REQUEST_REDRAW object:self];
//}

- (void) handleOverlaysButton
{
    if (layerListPopoverController == nil)
    {
        UINavigationController* navController = [[UINavigationController alloc]
                initWithRootViewController:layerListController];
        [navController setDelegate:layerListController];
        layerListPopoverController = [[UIPopoverController alloc] initWithContentViewController:navController];
    }

    if ([layerListPopoverController isPopoverVisible])
    {
        [layerListPopoverController dismissPopoverAnimated:YES];
    }
    else
    {
        [layerListPopoverController presentPopoverFromBarButtonItem:overlaysButton
                                           permittedArrowDirections:UIPopoverArrowDirectionAny animated:YES];
        [layerListController flashScrollIndicator];
    }
}

- (void) handleRoutePlanningButton
{
    if (flightRoutePopoverController == nil)
    {
        UINavigationController* navController = [[UINavigationController alloc]
                initWithRootViewController:flightRouteController];
        [navController setDelegate:flightRouteController];
        flightRoutePopoverController = [[UIPopoverController alloc] initWithContentViewController:navController];
    }

    if ([flightRoutePopoverController isPopoverVisible])
    {
        [flightRoutePopoverController dismissPopoverAnimated:YES];
    }
    else
    {
        [flightRoutePopoverController presentPopoverFromBarButtonItem:routePlanningButton
                                             permittedArrowDirections:UIPopoverArrowDirectionAny animated:YES];
    }
}

- (void) handleSplitViewButton
{
    isSplitView = !isSplitView;

    [[self view] layoutIfNeeded]; // Ensure all pending layout operations have completed.

    [UIView animateWithDuration:0.3
                          delay:0.0
                        options:UIViewAnimationOptionBeginFromCurrentState // Animate scroll views from their current state.
                     animations:^
                     {
                         [self transitionSplitView];
                         [[self view] layoutIfNeeded]; // Force layout to capture constraint frame changes in the animation block.
                     }
                     completion:nil];

    if (!isSplitView)
    {
        [[NSUserDefaults standardUserDefaults] setObject:@"" forKey:@"gov.nasa.worldwind.taiga.splitview.chartpath"];
        [[NSUserDefaults standardUserDefaults] setObject:@"" forKey:@"gov.nasa.worldwind.taiga.splitview.chartname"];
    }
    [Settings setBool:isSplitView forName:@"gov.nasa.worldwind.taiga.splitview.enabled"];
}

- (void) transitionSplitView
{
    UIView* view = [self view];
    [view removeConstraints:isSplitView ? normalConstraints : splitViewConstraints];
    [view addConstraints:isSplitView ? splitViewConstraints : normalConstraints];
}

- (void) handleTap:(UITapGestureRecognizer*)recognizer
{
    if ([recognizer state] == UIGestureRecognizerStateEnded)
    {
        CGPoint tapPoint = [recognizer locationInView:_wwv];
        WWPickedObjectList* pickedObjects = [_wwv pick:tapPoint];

        WWPickedObject* topObject = [pickedObjects topPickedObject];

        if (topObject.isTerrain)
        {
            [self showPositionReadout:topObject];
        }
        else if ([[topObject userObject] isKindOfClass:[WWPointPlacemark class]])
        {
            WWPointPlacemark* pm = (WWPointPlacemark*) [topObject userObject];
            if ([pm userObject] != nil)
            {
                if ([[[topObject parentLayer] displayName] isEqualToString:@"METAR Weather"])
                    [self showMETARData:pm];
                else if ([[[topObject parentLayer] displayName] isEqualToString:@"PIREPS"])
                    [self showPIREPData:pm];
                else if ([[[topObject parentLayer] displayName] isEqualToString:@"Weather Cams"])
                    [self showWeatherCam:pm];
            }
        }
    }
}

- (void) showPositionReadout:(WWPickedObject*)po
{
    WWPosition* position = [po position];
    WWVec4* cartesianPoint = [[WWVec4 alloc] init];
    WWVec4* screenPoint = [[WWVec4 alloc] init];

    [[[_wwv sceneController] globe] computePointFromPosition:[position latitude] longitude:[position longitude]
                                                    altitude:[position altitude] outputPoint:cartesianPoint];
    [[[_wwv sceneController] navigatorState] project:cartesianPoint result:screenPoint];

    CGPoint uiPoint = [[[_wwv sceneController] navigatorState] convertPointToView:screenPoint];
    CGRect rect = CGRectMake(uiPoint.x, uiPoint.y, 1, 1);

    [positionReadoutViewController setPosition:position];

    if (positionReadoutPopoverController == nil)
        positionReadoutPopoverController = [[UIPopoverController alloc]
                initWithContentViewController:positionReadoutViewController];
    [positionReadoutPopoverController presentPopoverFromRect:rect inView:_wwv
                                    permittedArrowDirections:UIPopoverArrowDirectionAny animated:YES];
}

- (void) showMETARData:(WWPointPlacemark*)pm
{
    // Compute a screen position that corresponds with the placemarks' position, then show data popover at
    // that screen position.

    WWPosition* pmPos = [pm position];
    WWVec4* pmPoint = [[WWVec4 alloc] init];
    WWVec4* screenPoint = [[WWVec4 alloc] init];

    [[[_wwv sceneController] globe] computePointFromPosition:[pmPos latitude] longitude:[pmPos longitude]
                                                    altitude:[pmPos altitude] outputPoint:pmPoint];
    [[[_wwv sceneController] navigatorState] project:pmPoint result:screenPoint];

    CGPoint uiPoint = [[[_wwv sceneController] navigatorState] convertPointToView:screenPoint];
    CGRect rect = CGRectMake(uiPoint.x, uiPoint.y, 1, 1);

    // Give the controller the placemark's dictionary.
    [metarDataViewController setEntries:[pm userObject]];

    // Ensure that the first line of the data is at the top of the data table.
    [[metarDataViewController tableView] scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:0 inSection:0]
                                               atScrollPosition:UITableViewScrollPositionTop animated:YES];

    if (metarDataPopoverController == nil)
        metarDataPopoverController = [[UIPopoverController alloc] initWithContentViewController:metarDataViewController];
    [metarDataPopoverController presentPopoverFromRect:rect inView:_wwv
                              permittedArrowDirections:UIPopoverArrowDirectionAny animated:YES];
}

- (void) showPIREPData:(WWPointPlacemark*)pm
{
    // Compute a screen position that corresponds with the placemarks' position, then show data popover at
    // that screen position.

    WWPosition* pmPos = [pm position];
    WWVec4* pmPoint = [[WWVec4 alloc] init];
    WWVec4* screenPoint = [[WWVec4 alloc] init];

    [[[_wwv sceneController] globe] computePointFromPosition:[pmPos latitude] longitude:[pmPos longitude]
                                                    altitude:[pmPos altitude] outputPoint:pmPoint];
    [[[_wwv sceneController] navigatorState] project:pmPoint result:screenPoint];

    CGPoint uiPoint = [[[_wwv sceneController] navigatorState] convertPointToView:screenPoint];
    CGRect rect = CGRectMake(uiPoint.x, uiPoint.y, 1, 1);

    // Give the controller the placemark's dictionary.
    [pirepDataViewController setEntries:[pm userObject]];

    // Ensure that the first line of the data is at the top of the data table.
    [[pirepDataViewController tableView] scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:0 inSection:0]
                                               atScrollPosition:UITableViewScrollPositionTop animated:YES];

    if (pirepDataPopoverController == nil)
        pirepDataPopoverController = [[UIPopoverController alloc] initWithContentViewController:pirepDataViewController];
    [pirepDataPopoverController presentPopoverFromRect:rect inView:_wwv
                              permittedArrowDirections:UIPopoverArrowDirectionAny animated:YES];
}

- (void) showWeatherCam:(WWPointPlacemark*)pm
{
    // Compute a screen position that corresponds with the placemarks' position, then show data popover at
    // that screen position.

    WWPosition* pmPos = [pm position];
    WWVec4* pmPoint = [[WWVec4 alloc] init];
    WWVec4* screenPoint = [[WWVec4 alloc] init];

    [[[_wwv sceneController] globe] computePointFromPosition:[pmPos latitude] longitude:[pmPos longitude]
                                                    altitude:[pmPos altitude] outputPoint:pmPoint];
    [[[_wwv sceneController] navigatorState] project:pmPoint result:screenPoint];

    CGPoint uiPoint = [[[_wwv sceneController] navigatorState] convertPointToView:screenPoint];
    CGRect rect = CGRectMake(uiPoint.x, uiPoint.y, 1, 1);

    // Give the controller the placemark's dictionary.
    [weatherCamViewController setSiteInfo:[pm userObject]];

    if (weatherCamPopoverController == nil)
        weatherCamPopoverController = [[UIPopoverController alloc] initWithContentViewController:weatherCamViewController];
    [weatherCamPopoverController presentPopoverFromRect:rect inView:_wwv
                               permittedArrowDirections:0 animated:YES];
}

@end