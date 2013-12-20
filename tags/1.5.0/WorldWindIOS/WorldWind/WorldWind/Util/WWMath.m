/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import "WorldWind/Util/WWMath.h"
#import "WorldWind/Geometry/WWAngle.h"
#import "WorldWind/Geometry/WWMatrix.h"
#import "WorldWind/WWLog.h"
#import "WorldWind/Geometry/WWVec4.h"

@implementation WWMath

+ (double) clamp:(double)value min:(double)min max:(double)max
{
    return value < min ? min : (value > max ? max : value);
}

+ (double) horizonDistance:(double)globeRadius elevation:(double)elevation
{
    if (elevation <= 0)
        return 0;

    return sqrt(elevation * (2 * globeRadius + elevation));
}

+ (NSArray*) principalAxesFromPoints:(NSArray*)points
{
    if (points == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Points is nil");
    }

    // Compute the covariance matrix.
    WWMatrix* covariance = [[WWMatrix alloc] initWithCovarianceOfPoints:points];
    if (covariance == nil)
        return nil;

    // Compute the eigenvectors and eigenvalues of the covariance matrix. Since the covariance matrix is symmetric by
    // definition, we can safely use the "symmetric" method below.
    NSMutableArray* eigenvalues = [[NSMutableArray alloc] initWithCapacity:3];
    NSMutableArray* eigenvectors = [[NSMutableArray alloc] initWithCapacity:3];
    [WWMatrix eigensystemFromSymmetricMatrix:covariance
                           resultEigenvalues:eigenvalues
                          resultEigenvectors:eigenvectors];

    // Return the normalized eigenvectors in order of decreasing eigenvalue. This has the effect of returning three
    // normalized orthogonal vectors defining a coordinate system, with the vectors sorted from the most prominent
    // axis to the lease prominent.
    NSArray* indexArray = [[NSArray alloc] initWithObjects:[NSNumber numberWithInt:0],
                                                           [NSNumber numberWithInt:1],
                                                           [NSNumber numberWithInt:2], nil];
    NSArray* sortedIndexArray = [indexArray sortedArrayUsingComparator:^NSComparisonResult(id a, id b)
    {
        NSUInteger indexA = (NSUInteger) [(NSNumber*) a intValue];
        NSUInteger indexB = (NSUInteger) [(NSNumber*) b intValue];

        return [[eigenvalues objectAtIndex:indexA] compare:[eigenvalues objectAtIndex:indexB]];
    }];

    NSUInteger index0 = (NSUInteger) [(NSNumber*) [sortedIndexArray objectAtIndex:0] intValue];
    NSUInteger index1 = (NSUInteger) [(NSNumber*) [sortedIndexArray objectAtIndex:1] intValue];
    NSUInteger index2 = (NSUInteger) [(NSNumber*) [sortedIndexArray objectAtIndex:2] intValue];

    NSMutableArray* resultArray = [[NSMutableArray alloc] initWithCapacity:3];
    [resultArray addObject:[[eigenvectors objectAtIndex:index2] normalize3]];
    [resultArray addObject:[[eigenvectors objectAtIndex:index1] normalize3]];
    [resultArray addObject:[[eigenvectors objectAtIndex:index0] normalize3]];

    return resultArray;
}

+ (CGRect) perspectiveFieldOfViewFrustumRect:(double)horizontalFOV
                               viewportWidth:(double)viewportWidth
                              viewportHeight:(double)viewportHeight
                                   zDistance:(double)zDistance
{
    // Based on http://www.opengl.org/resources/faq/technical/transformations.htm#tran0085.
    // This method uses horizontal field-of-view here to describe the perspective viewing angle. This results in a
    // different set of clip plane distances than documented in sources using vertical field-of-view.

    double tanHalfFOV = tan(RADIANS(horizontalFOV / 2));
    double width = 2 * zDistance * tanHalfFOV;
    double height = width * viewportHeight / viewportWidth;
    double x = -width / 2;
    double y = -height / 2;

    return CGRectMake((CGFloat) x, (CGFloat) y, (CGFloat) width, (CGFloat) height);
}

+ (double) perspectiveFieldOfViewMaxNearDistance:(double)horizontalFOV
                                   viewportWidth:(double)viewportWidth
                                  viewportHeight:(double)viewportHeight
                                distanceToObject:(double)distanceToObject
{
    // Note: based on calculations on 12/21/2012, the equation below is incorrect, and should instead be as follows:
    //
    // distanceToObject / sqrt(1 + tanHalfFOV * tanHalfFOV * (1 + aspect * aspect))
    //
    // We are currently leaving this equation as-is. It has been used in World Wind Java since 2006, and therefore
    // requires testing before it can be safely changed.

    double tanHalfFOV = tan(RADIANS(horizontalFOV / 2));

    return distanceToObject / (2 * sqrt(2 * tanHalfFOV * tanHalfFOV + 1));
}

+ (double) perspectiveFieldOfViewMaxPixelSize:(double)horizontalFOV
                                viewportWidth:(double)viewportWidth
                               viewportHeight:(double)viewportHeight
                             distanceToObject:(double)distanceToObject
{
    CGRect frustRect = [WWMath perspectiveFieldOfViewFrustumRect:horizontalFOV
                                                   viewportWidth :viewportWidth
                                                  viewportHeight:viewportHeight
                                                       zDistance:distanceToObject];
    double xPixelSize = CGRectGetWidth(frustRect) / viewportWidth;
    double yPixelSize = CGRectGetHeight(frustRect) / viewportHeight;

    return MAX(xPixelSize, yPixelSize);
}

+ (CGRect) perspectiveSizePreservingFrustumRect:(double)viewportWidth
                                 viewportHeight:(double)viewportHeight
                                      zDistance:(double)zDistance
{
    double x, y, width, height;

    if (viewportWidth < viewportHeight)
    {
        width = zDistance;
        height = zDistance * viewportHeight / viewportWidth;
        x = -width / 2;
        y = -height / 2;
    }
    else
    {
        width = zDistance * viewportWidth / viewportHeight;
        height = zDistance;
        x = -width / 2;
        y = -height / 2;
    }

    return CGRectMake((CGFloat) x, (CGFloat) y, (CGFloat) width, (CGFloat) height);
}

+ (double) perspectiveSizePreservingMaxNearDistance:(double)viewportWidth
                                     viewportHeight:(double)viewportHeight
                                   distanceToObject:(double)distanceToObject
{
    double aspect = (viewportWidth < viewportHeight) ? (viewportHeight / viewportWidth) : (viewportWidth / viewportHeight);

    return 2 * distanceToObject / sqrt(aspect * aspect + 5);
}

+ (double) perspectiveSizePreservingMaxPixelSize:(double)viewportWidth
                                  viewportHeight:(double)viewportHeight
                                distanceToObject:(double)distanceToObject
{
    CGRect frustRect = [WWMath perspectiveSizePreservingFrustumRect:viewportWidth
                                                     viewportHeight:viewportHeight
                                                          zDistance:distanceToObject];
    double xPixelSize = CGRectGetWidth(frustRect) / viewportWidth;
    double yPixelSize = CGRectGetHeight(frustRect) / viewportHeight;

    return MAX(xPixelSize, yPixelSize);
}

@end