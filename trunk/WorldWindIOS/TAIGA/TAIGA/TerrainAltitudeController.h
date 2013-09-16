/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import <Foundation/Foundation.h>

@class WWElevationShadingLayer;

@interface TerrainAltitudeController : UITableViewController

@property (readonly, nonatomic, weak) WWElevationShadingLayer* layer;

- (TerrainAltitudeController*) initWithLayer:(WWElevationShadingLayer*)layer;

- (void) opacityValueChanged:(UISlider*)opacitySlider;

@end