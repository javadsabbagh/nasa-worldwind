/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.

 @version $Id$
 */

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import "WorldWind/Navigate/WWNavigator.h"

@class WorldWindView;
@class WWLocation;

@interface WWBasicNavigator : NSObject <WWNavigator, UIGestureRecognizerDelegate>
{
@protected
    WorldWindView* __weak view; // Keep a weak reference to the parent view prevent a circular reference.
    UIPanGestureRecognizer* panGestureRecognizer;
    UIPinchGestureRecognizer* pinchGestureRecognizer;
    UIRotationGestureRecognizer* rotationGestureRecognizer;
    UIPanGestureRecognizer * verticalPanGestureRecognizer;
    CGPoint lastPanTranslation;
    double beginRange;
    double beginHeading;
    double beginTilt;
    CADisplayLink* displayLink;
    int animators;
}

@property (readonly, nonatomic) double nearDistance;
@property (readonly, nonatomic) double farDistance;
@property (nonatomic) WWLocation* lookAt;
@property (nonatomic) double range;
@property (nonatomic) double heading;
@property (nonatomic) double tilt;

- (WWBasicNavigator*) initWithView:(WorldWindView*)viewToNavigate;

- (id<WWNavigatorState>) currentState;

- (void) handlePanFrom:(UIPanGestureRecognizer*)recognizer;

- (void) handlePinchFrom:(UIPinchGestureRecognizer*)recognizer;

- (void) handleRotationFrom:(UIRotationGestureRecognizer*)recognizer;

- (void) handleVerticalPanFrom:(UIPanGestureRecognizer*)recognizer;

- (BOOL) gestureRecognizerShouldBegin:(UIGestureRecognizer*)gestureRecognizer;

- (BOOL) gestureRecognizer:(UIGestureRecognizer*)gestureRecognizer shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer*)otherGestureRecognizer;

@end