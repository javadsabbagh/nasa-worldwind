/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import <Foundation/Foundation.h>
#import "WorldWind/Layer/WWLayer.h"

@protocol WWRenderable;

/**
* Provides a layer to hold renderables.
*/
@interface WWRenderableLayer : WWLayer

/// @name Renderable Layer Attributes

/// The list of renderables associated with this layer.
@property (nonatomic, readonly) NSMutableArray* renderables;

/// @name Initializing Renderable Layers

/**
* Initialize this renderable layer.
*
* @return This layer, initialized.
*/
- (WWRenderableLayer*) init;

/// @name Operations on Renderable Layers

/**
* Add a specified renderable to this layer.
*
* The renderable is added to the end of this layer's renderable list.
*
* @param The renderable to add.
*
* @exception NSInvalidArgumentException If the specified renderable is nil.
*/
- (void) addRenderable:(id <WWRenderable>)renderable;

@end