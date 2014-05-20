/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import <Foundation/Foundation.h>

#define TAIGA_VERSION (@"0.0033")
#define TAIGA_VERSION_DATE (@"4/10/14")

#define TAIGA_CURRENT_AIRCRAFT_POSITION (@"gov.nasa.worldwind.taiga.currentaircraftposition")
#define TAIGA_DATA_FILE_ID (@"gov.nasa.worldwind.taiga.data.file.id")
#define TAIGA_DATA_FILE_NUM_FILES_EXTRACTED (@"gov.nasa.worldwind.taiga.data.file.num.files.extracted")
#define TAIGA_DATA_FILE_INSTALLATION_PROGRESS (@"gov.nasa.worldwind.taiga.data.file.installation.progress")
#define TAIGA_GPS_QUALITY (@"gov.nasa.worldwind.taiga.gpsfixquality")
#define TAIGA_EARTH_RADIUS (6378137.0)
#define TAIGA_HIDDEN_LAYER (@"gov.nasa.worldwind.taiga.hiddenlayer")
#define TAIGA_KNOTS_TO_METERS_PER_SECOND (0.51444444444)
#define TAIGA_METERS_TO_FEET (3.28083989501)
#define TAIGA_MILES_TO_METERS (1609.34)
#define TAIGA_TOOLBAR_HEIGHT (80)
#define TAIGA_SETTING_CHANGED (@"gov.nasa.worldwind.taiga.setting.changed")
#define TAIGA_FLIGHT_ROUTE_REMOVED (@"gov.nasa.worldwind.taiga.flightroute.removed")
#define TAIGA_FLIGHT_ROUTE_CHANGED (@"gov.nasa.worldwind.taiga.flightroute.changed")
#define TAIGA_FLIGHT_ROUTE_WAYPOINT_INDEX (@"gov.nasa.worldwind.taiga.flightroute.waypoint.index")
#define TAIGA_FLIGHT_ROUTE_WAYPOINT_INSERTED (@"gov.nasa.worldwind.taiga.flightroute.waypoint.inserted")
#define TAIGA_FLIGHT_ROUTE_WAYPOINT_REMOVED (@"gov.nasa.worldwind.taiga.flightroute.waypoint.removed")
#define TAIGA_FLIGHT_ROUTE_WAYPOINT_REPLACED (@"gov.nasa.worldwind.taiga.flightroute.waypoint.replaced")
#define TAIGA_FLIGHT_ROUTE_WAYPOINT_MOVED (@"gov.nasa.worldwind.taiga.flightroute.waypoint.moved")
#define TAIGA_FLIGHT_ROUTE_WAYPOINT_UPDATED (@"gov.nasa.worldwind.taiga.flightroute.waypoint.updated")
#define TAIGA_SHADED_ELEVATION_OFFSET (@"gov.nasa.worldwind.taiga.shadedelevation.offset")
#define TAIGA_SHADED_ELEVATION_OPACITY (@"gov.nasa.worldwind.taiga.shadedelevation.opacity")
#define TAIGA_SHADED_ELEVATION_THRESHOLD_RED (@"gov.nasa.worldwind.taiga.shadedelevation.threshold.red")
#define TAIGA_SHOW_TERRAIN_PROFILE (@"gov.nasa.worldwind.taiga.terrainprofile.show")
#define TAIGA_SIMULATION_WILL_BEGIN (@"gov.nasa.worldwind.taiga.simulationwillbegin")
#define TAIGA_SIMULATION_WILL_END (@"gov.nasa.worldwind.taiga.simulationwillend")
#define TAIGA_LOCATION_TRACKING_MODE (@"gov.nasa.worldwind.taiga.navigation.mode")
#define TAIGA_LOCATION_TRACKING_MODE_COCKPIT (@"gov.nasa.worldwind.taiga.location.tracking.mode.cockpit")
#define TAIGA_LOCATION_TRACKING_MODE_NORTH_UP (@"gov.nasa.worldwind.taiga.location.tracking.mode.northup")
#define TAIGA_LOCATION_TRACKING_MODE_TRACK_UP (@"gov.nasa.worldwind.taiga.location.tracking.mode.trackup")
#define TAIGA_DEFAULT_LOCATION_TRACKING_MODE (TAIGA_LOCATION_TRACKING_MODE_TRACK_UP)

@interface AppConstants : NSObject
@end