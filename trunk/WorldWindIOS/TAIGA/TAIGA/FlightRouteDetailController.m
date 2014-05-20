/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.

 @version $Id$
 */

#import "FlightRouteDetailController.h"
#import "FlightRoute.h"
#import "Waypoint.h"
#import "WaypointPicker.h"
#import "AltitudePicker.h"
#import "ColorPicker.h"
#import "BulkRetrieverController.h"
#import "AppConstants.h"
#import "TAIGA.h"
#import "UnitsFormatter.h"
#import "WorldWind/Geometry/WWExtent.h"
#import "WorldWind/Geometry/WWLocation.h"
#import "WorldWind/Geometry/WWPosition.h"
#import "WorldWind/Geometry/WWSector.h"
#import "WorldWind/Geometry/WWVec4.h"
#import "WorldWind/Navigate/WWNavigator.h"
#import "WorldWind/Render/WWSceneController.h"
#import "WorldWind/Terrain/WWGlobe.h"
#import "WorldWind/Util/WWMath.h"
#import "WorldWind/Util/WWColor.h"
#import "WorldWind/WorldWindView.h"

#define EDIT_ANIMATION_DURATION (0.3)
#define SECTION_PROPERTIES (0)
#define SECTION_WAYPOINTS (1)
#define ROW_COLOR (0)
#define ROW_DEFAULT_ALTITUDE (1)
#define ROW_DOWNLOAD (2)

@implementation FlightRouteDetailController

//--------------------------------------------------------------------------------------------------------------------//
//-- Initializing FlightRouteDetailController --//
//--------------------------------------------------------------------------------------------------------------------//

- (id) initWithFlightRoute:(FlightRoute*)flightRoute worldWindView:(WorldWindView*)wwv
{
    self = [super initWithNibName:nil bundle:nil];

    [[self navigationItem] setTitle:[flightRoute displayName]];
    [[self navigationItem] setRightBarButtonItem:[self editButtonItem]];

    _flightRoute = flightRoute;
    _wwv = wwv;

    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(handleFlightRouteWaypointInserted:)
                                                 name:TAIGA_FLIGHT_ROUTE_WAYPOINT_INSERTED object:_flightRoute];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(handleFlightRouteWaypointRemoved:)
                                                 name:TAIGA_FLIGHT_ROUTE_WAYPOINT_REMOVED object:_flightRoute];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(handleFlightRouteWaypointReplaced:)
                                                 name:TAIGA_FLIGHT_ROUTE_WAYPOINT_REPLACED object:_flightRoute];

    return self;
}

- (void) viewDidAppear:(BOOL)animated
{
    [super viewDidAppear:animated];
    [self flashScrollIndicators];
}

- (void) flashScrollIndicators
{
    [flightRouteTable flashScrollIndicators];
    [waypointPicker flashScrollIndicators];
}

//--------------------------------------------------------------------------------------------------------------------//
//-- Flight Route Notifications --//
//--------------------------------------------------------------------------------------------------------------------//

- (void) handleFlightRouteWaypointInserted:(NSNotification*)notification
{
    // Make the flight route table view match the change in the model, using UIKit animations to display the change.
    // The waypoint index indicates the row index that has been inserted.
    NSUInteger index = [[[notification userInfo] objectForKey:TAIGA_FLIGHT_ROUTE_WAYPOINT_INDEX] unsignedIntegerValue];
    NSIndexPath* indexPath = [NSIndexPath indexPathForRow:index inSection:SECTION_WAYPOINTS];
    [flightRouteTable insertRowsAtIndexPaths:@[indexPath] withRowAnimation:UITableViewRowAnimationFade];
    [flightRouteTable scrollToRowAtIndexPath:indexPath atScrollPosition:UITableViewScrollPositionNone animated:YES];
}

- (void) handleFlightRouteWaypointRemoved:(NSNotification*)notification
{
    // Make the flight route table view match the change in the model, using UIKit animations to display the change.
    // The waypoint index indicates the row index that has been removed.
    NSUInteger index = [[[notification userInfo] objectForKey:TAIGA_FLIGHT_ROUTE_WAYPOINT_INDEX] unsignedIntegerValue];
    NSIndexPath* indexPath = [NSIndexPath indexPathForRow:index inSection:SECTION_WAYPOINTS];
    [flightRouteTable deleteRowsAtIndexPaths:@[indexPath] withRowAnimation:UITableViewRowAnimationAutomatic];
}

- (void) handleFlightRouteWaypointReplaced:(NSNotification*)notification
{
    // Make the flight route table view match the change in the model, using UIKit animations to display the change.
    // The waypoint index indicates the row index that has been replaced.
    NSUInteger index = [[[notification userInfo] objectForKey:TAIGA_FLIGHT_ROUTE_WAYPOINT_INDEX] unsignedIntegerValue];
    NSIndexPath* indexPath = [NSIndexPath indexPathForRow:index inSection:SECTION_WAYPOINTS];
    [flightRouteTable reloadRowsAtIndexPaths:@[indexPath] withRowAnimation:UITableViewRowAnimationNone];
}

//--------------------------------------------------------------------------------------------------------------------//
//-- View Layout --//
//--------------------------------------------------------------------------------------------------------------------//

- (void) loadView
{
    UIView* view = [[UIView alloc] initWithFrame:CGRectMake(0, 0, 1, 1)];
    [view setAutoresizingMask:UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight];
    [self setView:view];

    flightRouteTable = [[UITableView alloc] initWithFrame:CGRectMake(0, 0, 1, 1) style:UITableViewStyleGrouped];
    [flightRouteTable setDataSource:self];
    [flightRouteTable setDelegate:self];
    [flightRouteTable setAllowsSelectionDuringEditing:YES];
    [view addSubview:flightRouteTable];

    waypointPicker = [[WaypointPicker alloc] initWithFrame:CGRectMake(0, 0, 1, 1) target:self action:@selector(didPickWaypoint:)];
    [waypointPicker setWaypoints:[TAIGA waypoints]];
    [view addSubview:waypointPicker];

    [self layout];
}

- (void) layout
{
    UIView* view = [self view];
    NSDictionary* viewsDictionary = NSDictionaryOfVariableBindings(view, flightRouteTable, waypointPicker);

    // Disable automatic translation of autoresizing mask into constraints. We're using explicit layout constraints
    // below.
    [flightRouteTable setTranslatesAutoresizingMaskIntoConstraints:NO];
    [waypointPicker setTranslatesAutoresizingMaskIntoConstraints:NO];

    [view addConstraints:[NSLayoutConstraint constraintsWithVisualFormat:@"H:|[flightRouteTable]|"
                                                                 options:0 metrics:nil views:viewsDictionary]];
    [view addConstraints:[NSLayoutConstraint constraintsWithVisualFormat:@"H:|[waypointPicker]|"
                                                                 options:0 metrics:nil views:viewsDictionary]];
    normalConstraints = [NSLayoutConstraint constraintsWithVisualFormat:@"V:|[flightRouteTable(==view)][waypointPicker(==176)]"
                                                                options:0 metrics:nil views:viewsDictionary];
    editingConstraints = [NSLayoutConstraint constraintsWithVisualFormat:@"V:|[flightRouteTable][waypointPicker(==176)]|"
                                                                 options:0 metrics:nil views:viewsDictionary];
    [view addConstraints:normalConstraints];
}

- (void) layoutForEditing:(BOOL)editing
{
    UIView* view = [self view];
    [view removeConstraints:editing ? normalConstraints : editingConstraints];
    [view addConstraints:editing ? editingConstraints : normalConstraints];
    [view layoutIfNeeded];
}

- (void) setEditing:(BOOL)editing animated:(BOOL)animated
{
    [super setEditing:editing animated:animated];

    if (animated)
    {
        [[self view] layoutIfNeeded]; // Ensure all pending layout operations have completed.
        [UIView animateWithDuration:EDIT_ANIMATION_DURATION
                              delay:0.0
                            options:UIViewAnimationOptionBeginFromCurrentState // Animate scroll views from their current state.
                         animations:^
                         {
                             [self layoutForEditing:editing]; // Force layout to capture constraint frame changes in the animation block.
                         }
                         completion:^(BOOL finished)
                         {
                             [self flashScrollIndicators];
                         }];
    }
    else
    {
        [self layoutForEditing:editing]; // Force layout to capture constraint frame changes now.
        [self flashScrollIndicators];
    }

    // Place the table in editing mode and refresh the properties section, which has custom editing controls.
    [flightRouteTable setEditing:editing animated:animated];

    if (!editing)
    {
        [waypointPicker resignFirstResponder];
    }
}

//--------------------------------------------------------------------------------------------------------------------//
//-- UITableViewDataSource and UITableViewDelegate --//
//--------------------------------------------------------------------------------------------------------------------//

- (NSInteger) numberOfSectionsInTableView:(UITableView*)tableView
{
    return 2;
}

- (NSInteger) tableView:(UITableView*)tableView numberOfRowsInSection:(NSInteger)section
{
    switch (section)
    {
        case SECTION_PROPERTIES:
            return 3;
        case SECTION_WAYPOINTS:
            return [_flightRoute waypointCount];
        default:
            return 0;
    }
}

- (NSString*) tableView:(UITableView*)tableView titleForHeaderInSection:(NSInteger)section
{
    switch (section)
    {
        case SECTION_PROPERTIES:
            return nil; // Suppress properties section title.
        case SECTION_WAYPOINTS:
            return @"Waypoints";
        default:
            return nil;
    }
}

- (CGFloat) tableView:(UITableView*)tableView heightForHeaderInSection:(NSInteger)section
{
    switch (section)
    {
        case SECTION_PROPERTIES:
            return CGFLOAT_MIN;
        case SECTION_WAYPOINTS:
            return 15;
        default:
            return UITableViewAutomaticDimension;
    }
}

- (UITableViewCell*) tableView:(UITableView*)tableView cellForRowAtIndexPath:(NSIndexPath*)indexPath
{
    switch ([indexPath section])
    {
        case SECTION_PROPERTIES:
            return [self tableView:tableView cellForProperty:indexPath];
        case SECTION_WAYPOINTS:
            return [self tableView:tableView cellForWaypoint:indexPath];
        default:
            return nil;
    }
}

- (UITableViewCell*) tableView:(UITableView*)tableView cellForProperty:(NSIndexPath*)indexPath
{
    static NSString* propertyCellId = @"propertyCellId";
    static UIColor* detailTextColor;
    UITableViewCell* cell = [tableView dequeueReusableCellWithIdentifier:propertyCellId];
    if (cell == nil)
    {
        cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleValue1 reuseIdentifier:propertyCellId];
        [cell setAccessoryType:UITableViewCellAccessoryDisclosureIndicator];
        detailTextColor = [[cell detailTextLabel] textColor];
    }

    if ([indexPath row] == ROW_COLOR)
    {
        NSDictionary* colorAttrs = [[FlightRoute flightRouteColors] objectAtIndex:[_flightRoute colorIndex]];
        [[cell textLabel] setText:@"Color"];
        [[cell detailTextLabel] setText:[colorAttrs objectForKey:@"displayName"]];
        [[cell detailTextLabel] setTextColor:[[colorAttrs objectForKey:@"color"] uiColor]];
    }
    else if ([indexPath row] == ROW_DEFAULT_ALTITUDE)
    {
        double altitude = [_flightRoute defaultAltitude];
        [[cell textLabel] setText:@"Default Altitude"];
        [[cell detailTextLabel] setText:[[TAIGA unitsFormatter] formatMetersAltitude:altitude]];
        [[cell detailTextLabel] setTextColor:detailTextColor]; // show altitude detail text in the default color
    }
    else if ([indexPath row] == ROW_DOWNLOAD)
    {
        [[cell textLabel] setText:@"Download data"];
        [[cell detailTextLabel] setText:nil];
    }

    return cell;
}

- (UITableViewCell*) tableView:(UITableView*)tableView cellForWaypoint:(NSIndexPath*)indexPath
{
    static NSString* waypointCellId = @"waypointCellId";
    UITableViewCell* cell = [tableView dequeueReusableCellWithIdentifier:waypointCellId];
    if (cell == nil)
    {
        cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleValue1 reuseIdentifier:waypointCellId];
        [cell setAccessoryType:UITableViewCellAccessoryDisclosureIndicator];
        [[cell textLabel] setAdjustsFontSizeToFitWidth:YES];
    }

    Waypoint* waypoint = [_flightRoute waypointAtIndex:(NSUInteger) [indexPath row]];
    [[cell textLabel] setText:[waypoint description]];
    [[cell detailTextLabel] setText:[[TAIGA unitsFormatter] formatMetersAltitude:[waypoint altitude]]];

    return cell;
}

- (void) tableView:(UITableView*)tableView didSelectRowAtIndexPath:(NSIndexPath*)indexPath
{
    [tableView deselectRowAtIndexPath:indexPath animated:YES];

    if ([indexPath section] == SECTION_PROPERTIES && [indexPath row] == ROW_COLOR)
    {
        ColorPicker* picker = [[ColorPicker alloc] initWithFrame:CGRectMake(0, 0, 1, 1)];
        [picker addTarget:self action:@selector(didPickColor:) forControlEvents:UIControlEventValueChanged];
        [picker setColorChoices:[FlightRoute flightRouteColors]];
        [picker setSelectedColorIndex:[_flightRoute colorIndex]];

        UIViewController* viewController = [[UIViewController alloc] init];
        [viewController setView:picker];
        [viewController setTitle:@"Color"];
        [[self navigationController] pushViewController:viewController animated:YES];
    }
    else if ([indexPath section] == SECTION_PROPERTIES && [indexPath row] == ROW_DEFAULT_ALTITUDE)
    {
        AltitudePicker* picker = [[AltitudePicker alloc] initWithFrame:CGRectMake(0, 44, 1, 216)];
        [picker addTarget:self action:@selector(didPickDefaultAltitude:) forControlEvents:UIControlEventValueChanged];
        [picker setToVFRAltitudes];
        [picker setAltitude:[_flightRoute defaultAltitude]];

        UIViewController* viewController = [[UIViewController alloc] init];
        [viewController setView:picker];
        [viewController setTitle:@"Default Altitude"];
        [[self navigationController] pushViewController:viewController animated:YES];
    }
    else if ([indexPath section] == SECTION_PROPERTIES && [indexPath row] == ROW_DOWNLOAD)
    {
        if (bulkRetrieverController == nil)
            bulkRetrieverController = [[BulkRetrieverController alloc] initWithWorldWindView:_wwv];
        [((UINavigationController*) [self parentViewController]) pushViewController:bulkRetrieverController animated:YES];

        if ([_flightRoute waypointCount] == 0)
        {
            WWSector* sector = [[WWSector alloc] initWithDegreesMinLatitude:0 maxLatitude:0
                                                               minLongitude:0 maxLongitude:0];
            [bulkRetrieverController setSectors:[[NSArray alloc] initWithObjects:sector, nil]];
        }
        else if ([_flightRoute waypointCount] == 1)
        {
            Waypoint* waypoint = [_flightRoute waypointAtIndex:0];
            WWLocation* location = [[WWLocation alloc] initWithDegreesLatitude:[waypoint latitude] longitude:[waypoint longitude]];
            WWSector* sector = [[WWSector alloc] initWithLocations:@[location]];
            [bulkRetrieverController setSectors:@[sector]];
        }
        else
        {
            // The BulkRetrievalController can handle multiple sectors, but we use only one here. See the commented
            // out code below for logic that defines one sector per flight-path segment. Doing that causes
            // over-estimation of the amount of data that needs to be downloaded, so we don't use it.
            NSMutableArray* locations = [[NSMutableArray alloc] initWithCapacity:2];
            for (NSUInteger i = 0; i < [_flightRoute waypointCount]; i++)
            {
                Waypoint* waypoint = [_flightRoute waypointAtIndex:i];
                WWLocation* location = [[WWLocation alloc] initWithDegreesLatitude:[waypoint latitude] longitude:[waypoint longitude]];
                [locations addObject:location];
            }
//
//            // The below is an approximation of the full state of Alaska. I'm leaving it here so that we can do
//            // data size calculations.
//            [locations removeAllObjects];
//            [locations addObject:[[WWLocation alloc] initWithDegreesLatitude:55.7 longitude:-169.2]];
//            [locations addObject:[[WWLocation alloc] initWithDegreesLatitude:55.7 longitude:-129.5]];
//            [locations addObject:[[WWLocation alloc] initWithDegreesLatitude:71.1 longitude:-129.5]];
//            [locations addObject:[[WWLocation alloc] initWithDegreesLatitude:71.1 longitude:-169.2]];

            [bulkRetrieverController setSectors:@[[[WWSector alloc] initWithLocations:locations]]];
        }
//        else
//        {
//        // This logic causes over-estimation of the amount of data that needs to be downloaded. To avoid that the
//        // else clause above is used instead.
//            NSMutableArray* sectors = [[NSMutableArray alloc] initWithCapacity:[_flightRoute waypointCount] - 1];
//            NSMutableArray* locations = [[NSMutableArray alloc] initWithCapacity:2];
//            for (NSUInteger i = 0; i < [_flightRoute waypointCount] - 1; i++)
//            {
//                [locations removeAllObjects];
//
//                [locations addObject:[[_flightRoute waypointAtIndex:i] location]];
//                [locations addObject:[[_flightRoute waypointAtIndex:i + 1] location]];
//
//                [sectors addObject:[[WWSector alloc] initWithLocations:locations]];
//            }
//
//            [bulkRetrieverController setSectors:sectors];
//        }
    }
    else if ([indexPath section] == SECTION_WAYPOINTS)
    {
        NSUInteger index = (NSUInteger) [indexPath row];
        Waypoint* waypoint = [_flightRoute waypointAtIndex:index];

        AltitudePicker* picker = [[AltitudePicker alloc] initWithFrame:CGRectMake(0, 44, 1, 216)];
        [picker addTarget:self action:@selector(didPickWaypointAltitude:) forControlEvents:UIControlEventValueChanged];
        [picker setToVFRAltitudes];
        [picker setAltitude:[waypoint altitude]];
        [picker setUserObject:[NSNumber numberWithUnsignedInteger:index]];

        UIViewController* viewController = [[UIViewController alloc] init];
        [viewController setView:picker];
        [viewController setTitle:@"Waypoint Altitude"];
        [[self navigationController] pushViewController:viewController animated:YES];
    }
}

- (BOOL) tableView:(UITableView*)tableView canEditRowAtIndexPath:(NSIndexPath*)indexPath
{
    switch ([indexPath section])
    {
        case SECTION_PROPERTIES:
            return NO;
        case SECTION_WAYPOINTS:
            return YES;
        default:
            return NO;
    }
}

- (BOOL) tableView:(UITableView*)tableView canMoveRowAtIndexPath:(NSIndexPath*)indexPath
{
    switch ([indexPath section])
    {
        case SECTION_PROPERTIES:
            return NO;
        case SECTION_WAYPOINTS:
            return YES;
        default:
            return NO;
    }
}

- (NSIndexPath*)               tableView:(UITableView*)tableView
targetIndexPathForMoveFromRowAtIndexPath:(NSIndexPath*)sourceIndexPath
                     toProposedIndexPath:(NSIndexPath*)proposedDestinationIndexPath
{
    if ([sourceIndexPath section] != [proposedDestinationIndexPath section])
    {
        // Prevent row movement outside of the row's section by limiting a rows destination index path to either the top
        // or the bottom of the section.
        NSUInteger rowInSourceSection = ([sourceIndexPath section] > [proposedDestinationIndexPath section]) ?
                0 : (NSUInteger) [tableView numberOfRowsInSection:[sourceIndexPath section]];
        return [NSIndexPath indexPathForRow:rowInSourceSection inSection:[sourceIndexPath section]];
    }

    return proposedDestinationIndexPath;
}

- (void) tableView:(UITableView*)tableView
commitEditingStyle:(UITableViewCellEditingStyle)editingStyle
 forRowAtIndexPath:(NSIndexPath*)indexPath
{
    if ([indexPath section] == SECTION_WAYPOINTS && editingStyle == UITableViewCellEditingStyleDelete)
    {
        // Remove the waypoint at the editing index from the flight route model. The waypoint table is updated in
        // response to a notification posted by the flight route.
        NSUInteger index = (NSUInteger) [indexPath row];
        [_flightRoute removeWaypointAtIndex:index];

        // Navigate to the the flight route in the WorldWindView.
        [self navigateToFlightRoute:_flightRoute];
    }
}

- (void) tableView:(UITableView*)tableView
moveRowAtIndexPath:(NSIndexPath*)sourceIndexPath
       toIndexPath:(NSIndexPath*)destinationIndexPath
{
    if ([sourceIndexPath section] == SECTION_WAYPOINTS && [destinationIndexPath section] == SECTION_WAYPOINTS)
    {
        // Update the flight route model to match the change in the waypoint table.
        NSUInteger srcIndex = (NSUInteger) [sourceIndexPath row];
        NSUInteger dstIndex = (NSUInteger) [destinationIndexPath row];
        [_flightRoute moveWaypointAtIndex:srcIndex toIndex:dstIndex];

        // Navigate to the the flight route in the WorldWindView.
        [self navigateToFlightRoute:_flightRoute];
    }
}

- (void) didPickColor:(ColorPicker*)sender
{
    [_flightRoute setColorIndex:(NSUInteger) [sender selectedColorIndex]];

    NSIndexPath* indexPath = [NSIndexPath indexPathForRow:ROW_COLOR inSection:SECTION_PROPERTIES];
    [flightRouteTable reloadRowsAtIndexPaths:@[indexPath] withRowAnimation:UITableViewRowAnimationAutomatic];
}

- (void) didPickDefaultAltitude:(AltitudePicker*)sender
{
    [_flightRoute setDefaultAltitude:[sender altitude]];

    NSIndexPath* indexPath = [NSIndexPath indexPathForRow:ROW_DEFAULT_ALTITUDE inSection:SECTION_PROPERTIES];
    [flightRouteTable reloadRowsAtIndexPaths:@[indexPath] withRowAnimation:UITableViewRowAnimationAutomatic];
}

- (void) didPickWaypointAltitude:(AltitudePicker*)sender
{
    NSUInteger index = [[sender userObject] unsignedIntegerValue];
    Waypoint* waypoint = [_flightRoute waypointAtIndex:index];
    Waypoint* newWaypoint = [[Waypoint alloc] initWithWaypoint:waypoint metersAltitude:[sender altitude]];
    [_flightRoute replaceWaypointAtIndex:index withWaypoint:newWaypoint];
}

- (void) didPickWaypoint:(Waypoint*)waypoint
{
    // Append the waypoint to the flight route model. The waypoint table is updated in response to a notification
    // posted by the flight route.
    Waypoint* newWaypoint = [[Waypoint alloc] initWithWaypoint:waypoint metersAltitude:[_flightRoute defaultAltitude]];
    NSUInteger index = [_flightRoute waypointCount];
    [_flightRoute insertWaypoint:newWaypoint atIndex:index];

    // Navigate to the the flight route in the WorldWindView.
    [self navigateToFlightRoute:_flightRoute];
}

//--------------------------------------------------------------------------------------------------------------------//
//-- WorldWindView Interface --//
//--------------------------------------------------------------------------------------------------------------------//

- (void) navigateToFlightRoute:(FlightRoute*)flightRoute
{
    WWGlobe* globe = [[_wwv sceneController] globe];
    id<WWExtent> extent = [flightRoute extentOnGlobe:globe];

    if (extent == nil)
        return; // empty flight route; nothing to navigate to

    // Compute the center and radius of a region that bounds the flight path's waypoints. If the flight route contains
    // only a single unique waypoint we use default radius of 100km. This sphere defines the region that will be shown
    // in the left half of the WorldWindView's viewport.
    WWPosition* center = [[WWPosition alloc] initWithZeroPosition];
    WWVec4* centerPoint = [extent center];
    [globe computePositionFromPoint:[centerPoint x] y:[centerPoint y] z:[centerPoint z] outputPosition:center];
    double globeRadius = MAX([globe equatorialRadius], [globe polarRadius]);
    double radiusMeters = [extent radius] > 0 ? [extent radius] : 100000;
    double radiusDegrees = DEGREES(radiusMeters / globeRadius);

    // Compute the scale that we'll apply to the region's radius in order to make it fit in the left half of the
    // WorldWindView's viewport. The navigator will fit the radius we provide into the smaller of the two viewport
    // dimensions. When the device is in portrait mode, the radius is fit to the viewport width, so the visible region's
    // radius must be twice the actual region's radius. When the device is in landscape mode, the radius is fit to the
    // viewport height, so the visible region's radius must be scaled based on the relative size of the viewport width
    // and height.
    id<WWNavigator> navigator = [_wwv navigator];
    CGRect viewport = [_wwv viewport];
    CGFloat viewportWidth = CGRectGetWidth(viewport);
    CGFloat viewportHeight = CGRectGetHeight(viewport);
    double radiusScale = viewportWidth < viewportHeight ? 2 : (viewportWidth < 2 * viewportHeight ? 2 * viewportHeight / viewportWidth : 1);

    // Navigate to the center and radius of the a region that places the flight route's bounding sector in the left half
    // of the WorldWindView's viewport. This region has its center at the eastern edge of the flight route relative to
    // the navigator's current heading, and has its radius scaled such that the flight route fits in half of the
    // viewport width.
    WWLocation* lookAtCenter = [[WWLocation alloc] initWithZeroLocation];
    [WWLocation greatCircleLocation:center azimuth:[navigator heading] + 90 distance:radiusDegrees outputLocation:lookAtCenter];
    double lookAtRadius = radiusMeters * radiusScale;
    [navigator animateWithDuration:WWNavigatorDurationAutomatic animations:^
    {
        [navigator setCenterLocation:lookAtCenter radius:lookAtRadius];
    }];
}

@end