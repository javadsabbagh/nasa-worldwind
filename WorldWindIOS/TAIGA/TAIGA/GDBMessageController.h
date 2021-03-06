/*
 Copyright (C) 2014 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import <Foundation/Foundation.h>


@interface GDBMessageController : NSObject

+ (void) setDefaultGDBDeviceAddress;

- (GDBMessageController*) init;

- (void) dispose;

- (void) setUpdateFrequency:(int)updateFrequency;

- (int) getUpdateFrequency;

@end