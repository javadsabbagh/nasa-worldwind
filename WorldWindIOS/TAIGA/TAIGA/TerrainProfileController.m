/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import <CoreLocation/CoreLocation.h>
#import "TerrainProfileController.h"
#import "TerrainProfileView.h"
#import "AppConstants.h"
#import "WWLocation.h"
#import "WWPosition.h"
#import "WWMath.h"
#import "Settings.h"


@implementation TerrainProfileController

- (TerrainProfileController*) initWithTerrainProfileView:(TerrainProfileView*)terrainProfileView
{
    self = [super init];

    _terrainProfileView = terrainProfileView;

    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(handleCurrentPositionNotification:)
                                                 name:TAIGA_CURRENT_AIRCRAFT_POSITION object:nil];

    return self;
}

- (void) handleCurrentPositionNotification:(NSNotification*)notification
{
    CLLocation* position = [notification object];

    // Update the terrain profile.
    WWPosition* currentPosition = [[WWPosition alloc] initWithCLPosition:position];
    WWPosition* nextPosition = [[WWPosition alloc] init];
    double angularDistance = DEGREES(5 * TAIGA_MILES_TO_METERS / TAIGA_EARTH_RADIUS);
    [WWLocation greatCircleLocation:currentPosition azimuth:[position course] distance:angularDistance
                     outputLocation:nextPosition];
    NSArray* path = [[NSArray alloc] initWithObjects:currentPosition, nextPosition, nil];
    [_terrainProfileView setPath:path];
    [_terrainProfileView setAircraftAltitude:(float) currentPosition.altitude];
    [_terrainProfileView setMaxAltitude:(float) (1.2 * currentPosition.altitude)];
    float warningOffset = [Settings getFloatForName:TAIGA_SHADED_ELEVATION_OFFSET defaultValue:100];
    [_terrainProfileView setWarningAltitude:(float) ([currentPosition altitude] - warningOffset)
                             dangerAltitude:(float) [currentPosition altitude]];
    [_terrainProfileView setLeftLabel:@"0 miles"];
    [_terrainProfileView setCenterLabel:@"2.5 miles"];
    [_terrainProfileView setRightLabel:@"5 miles"];

    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(handleSettingChange:)
                                                 name:TAIGA_SETTING_CHANGED object:nil];
}

- (void) handleSettingChange:(NSNotification*)notification
{
    if ([[notification name] isEqualToString:TAIGA_SHADED_ELEVATION_OFFSET])
    {
        float warningOffset = [Settings getFloatForName:TAIGA_SHADED_ELEVATION_OFFSET defaultValue:100];
        float currentAltitude = [_terrainProfileView dangerAltitude];
        [_terrainProfileView setWarningAltitude:(currentAltitude - warningOffset) dangerAltitude:currentAltitude];
    }
}

@end