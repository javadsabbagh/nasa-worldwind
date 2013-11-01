/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.

 @version $Id$
 */

#import "FlightPathDetailController.h"
#import "FlightPath.h"
#import "Waypoint.h"
#import "WaypointChooserControl.h"

#define EDIT_ANIMATION_DURATION 0.3

@implementation FlightPathDetailController

//--------------------------------------------------------------------------------------------------------------------//
//-- Initializing FlightPathDetailController --//
//--------------------------------------------------------------------------------------------------------------------//

- (FlightPathDetailController*) initWithFlightPath:(FlightPath*)flightPath waypointFile:(WaypointFile*)waypointFile
{
    self = [super initWithNibName:nil bundle:nil];

    [[self navigationItem] setTitle:[flightPath displayName]];
    [[self navigationItem] setRightBarButtonItem:[self editButtonItem]];

    _flightPath = flightPath;
    _waypointFile = waypointFile;

    return self;
}

//--------------------------------------------------------------------------------------------------------------------//
//-- View Layout --//
//--------------------------------------------------------------------------------------------------------------------//

- (void) loadView
{
    UIView* view = [[UIView alloc] initWithFrame:CGRectMake(0, 0, 1, 1)];
    [view setAutoresizingMask:UIViewAutoresizingFlexibleWidth|UIViewAutoresizingFlexibleHeight];
    [self setView:view];

    flightPathTable = [[UITableView alloc] initWithFrame:CGRectMake(0, 0, 1, 1) style:UITableViewStylePlain];
    [flightPathTable setDataSource:self];
    [flightPathTable setDelegate:self];
    [flightPathTable setAllowsSelection:NO];
    [view addSubview:flightPathTable];

    waypointChooser = [[WaypointChooserControl alloc] initWithFrame:CGRectMake(0, 0, 1, 1) target:self action:@selector(didChooseWaypoint:)];
    [waypointChooser setDataSource:_waypointFile];
    [view addSubview:waypointChooser];

    [self layout];
}

- (void) layout
{
    UIView* view = [self view];
    NSDictionary* viewsDictionary = NSDictionaryOfVariableBindings(view, flightPathTable, waypointChooser);

    // Disable automatic translation of autoresizing mask into constraints. We're using explicit layout constraints
    // below.
    [flightPathTable setTranslatesAutoresizingMaskIntoConstraints:NO];
    [waypointChooser setTranslatesAutoresizingMaskIntoConstraints:NO];

    [view addConstraints:[NSLayoutConstraint constraintsWithVisualFormat:@"H:|[flightPathTable]|"
                                                                 options:0 metrics:nil views:viewsDictionary]];
    [view addConstraints:[NSLayoutConstraint constraintsWithVisualFormat:@"H:|[waypointChooser]|"
                                                                 options:0 metrics:nil views:viewsDictionary]];
    normalConstraints = [NSLayoutConstraint constraintsWithVisualFormat:@"V:|[flightPathTable(==view)]-[waypointChooser(>=176)]"
                                                                options:0 metrics:nil views:viewsDictionary];
    editingConstraints = [NSLayoutConstraint constraintsWithVisualFormat:@"V:|[flightPathTable(<=264)]-[waypointChooser(>=176)]|"
                                                                 options:0 metrics:nil views:viewsDictionary];
    [view addConstraints:normalConstraints];
}

- (void) layoutForEditing:(BOOL)editing
{
    UIView* view = [self view];
    [view removeConstraints:editing ? normalConstraints : editingConstraints];
    [view addConstraints:editing ? editingConstraints : normalConstraints];
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
                             [self layoutForEditing:editing];
                             [[self view] layoutIfNeeded]; // Force layout to capture constraint frame changes in the animation block.
                         }
                         completion:NULL];
    }
    else
    {
        [self layoutForEditing:editing];
        [[self view] layoutIfNeeded]; // Force layout to capture constraint frame changes now.

    }

    [flightPathTable setEditing:editing animated:animated];
}

//--------------------------------------------------------------------------------------------------------------------//
//-- UITableViewDataSource and UITableViewDelegate --//
//--------------------------------------------------------------------------------------------------------------------//

- (NSInteger) numberOfSectionsInTableView:(UITableView*)tableView
{
    return 1; // Both the flight path table and the waypoints table contain a single section.
}

- (NSInteger) tableView:(UITableView*)tableView numberOfRowsInSection:(NSInteger)section
{
    return [_flightPath waypointCount];
}

- (UITableViewCell*) tableView:(UITableView*)tableView cellForRowAtIndexPath:(NSIndexPath*)indexPath
{
    static NSString* cellIdentifier = @"cell";
    UITableViewCell* cell = [tableView dequeueReusableCellWithIdentifier:cellIdentifier];
    if (cell == nil)
    {
        cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle reuseIdentifier:cellIdentifier];
    }

    Waypoint* waypoint = [_flightPath waypointAtIndex:(NSUInteger) [indexPath row]];
    [[cell textLabel] setText:[waypoint displayName]];
    [[cell detailTextLabel] setText:[waypoint displayNameLong]];

    return cell;
}

- (UITableViewCellEditingStyle) tableView:(UITableView *)tableView editingStyleForRowAtIndexPath:(NSIndexPath *)indexPath
{
    return UITableViewCellEditingStyleDelete;
}

- (BOOL) tableView:(UITableView*)tableView canEditRowAtIndexPath:(NSIndexPath*)indexPath
{
    return YES;
}

- (BOOL) tableView:(UITableView*)tableView canMoveRowAtIndexPath:(NSIndexPath*)indexPath
{
    return YES;
}

- (void) tableView:(UITableView*)tableView
commitEditingStyle:(UITableViewCellEditingStyle)editingStyle
 forRowAtIndexPath:(NSIndexPath*)indexPath
{
    // Modify the model before the modifying the view.
    [_flightPath removeWaypointAtIndex:(NSUInteger) [indexPath row]];

    // Make the flight path table view match the change in the model, using UIKit animations to display the change.
    [tableView deleteRowsAtIndexPaths:[NSArray arrayWithObject:indexPath]
                     withRowAnimation:UITableViewRowAnimationAutomatic];
}

- (void) tableView:(UITableView*)tableView
moveRowAtIndexPath:(NSIndexPath*)sourceIndexPath
       toIndexPath:(NSIndexPath*)destinationIndexPath
{
    [_flightPath moveWaypointAtIndex:(NSUInteger) [sourceIndexPath row]
                             toIndex:(NSUInteger) [destinationIndexPath row]];
}

- (void) didChooseWaypoint:(Waypoint*)waypoint
{
    // Modify the model before the modifying the view. Get the waypoint to insert from the waypoint table, then
    // append it to the flight path model.
    NSUInteger index = [_flightPath waypointCount];
    [_flightPath insertWaypoint:waypoint atIndex:index];

    // Make the flight path table view match the change in the model, using UIKit animations to display the change.
    // The index path's row indicates the row index that has been inserted.
    NSIndexPath* insertIndexPath = [NSIndexPath indexPathForRow:index inSection:0];
    [flightPathTable insertRowsAtIndexPaths:[NSArray arrayWithObject:insertIndexPath]
                           withRowAnimation:UITableViewRowAnimationFade];
    [flightPathTable scrollToRowAtIndexPath:insertIndexPath atScrollPosition:UITableViewScrollPositionNone
                                   animated:YES];
}

@end