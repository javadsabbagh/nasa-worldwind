/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.

 @version $Id$
 */

#import <Foundation/Foundation.h>
#import "WorldWind/Layer/WWLayer.h"

@class FlightRoute;

@interface AircraftLayer : WWLayer
{
@protected
    id aircraftShape;
    FlightRoute* simulatedFlightRoute;
}

- (AircraftLayer*) init;

@end