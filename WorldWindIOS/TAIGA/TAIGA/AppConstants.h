/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import <Foundation/Foundation.h>

#define TAIGA_VERSION (@"0.0019")
#define TAIGA_VERSION_DATE (@"11/22/13")

#define TAIGA_HIDDEN_LAYER (@"gov.nasa.worldwind.taiga.hiddenlayer")
#define TAIGA_METERS_TO_FEET (3.28083989501)
#define TAIGA_TOOLBAR_HEIGHT (80)
#define TAIGA_SETTING_CHANGED (@"gov.nasa.worldwind.taiga.setting.changed")
#define TAIGA_FLIGHT_ROUTE_CHANGED (@"gov.nasa.worldwind.taiga.flightroute.changed")
#define TAIGA_FLIGHT_ROUTE_WAYPOINT_INDEX (@"gov.nasa.worldwind.taiga.flightroute.waypointindex")
#define TAIGA_SHADED_ELEVATION_OFFSET (@"gov.nasa.worldwind.taiga.shadedelevation.offset")
#define TAIGA_SHADED_ELEVATION_OPACITY (@"gov.nasa.worldwind.taiga.shadedelevation.opacity")
#define TAIGA_SHADED_ELEVATION_THRESHOLD_RED (@"gov.nasa.worldwind.taiga.shadedelevation.threshold.red")

@interface AppConstants : NSObject
@end