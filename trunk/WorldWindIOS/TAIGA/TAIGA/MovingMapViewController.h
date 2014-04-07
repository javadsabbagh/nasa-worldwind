/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import <UIKit/UIKit.h>

@class FlightRoute;
@class WaypointDatabase;
@class WorldWindView;

@interface MovingMapViewController : UIViewController <UIGestureRecognizerDelegate, UINavigationControllerDelegate>

@property (nonatomic, readonly) WorldWindView* wwv;

@property (nonatomic, readonly) WaypointDatabase* waypointDatabase;

/// @name Initializing MovingMapViewController

- (MovingMapViewController*) initWithFrame:(CGRect)frame;

/// @name Managing the Flight Route List

- (NSUInteger) flightRouteCount;

- (FlightRoute*) flightRouteAtIndex:(NSUInteger)index;

- (NSUInteger) indexOfFlightRoute:(FlightRoute*)flightRoute;

- (void) insertFlightRoute:(FlightRoute*)flightRoute atIndex:(NSUInteger)index;

/// @name Creating and Presenting Flight Routes

- (void) newFlightRoute:(void (^)(FlightRoute* newFlightRoute))completionBlock;

- (FlightRoute*) presentedFlightRoute;

- (void) presentFlightRouteAtIndex:(NSUInteger)index editing:(BOOL)editing;

/// @name Editing Flight Route Waypoints

- (void) editFlightRoute:(FlightRoute*)flightRoute waypointAtIndex:(NSUInteger)index;

@end
