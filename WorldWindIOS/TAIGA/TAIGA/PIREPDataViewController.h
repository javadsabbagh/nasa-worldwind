/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import <Foundation/Foundation.h>


@interface PIREPDataViewController : UITableViewController

@property(nonatomic) NSDictionary* entries;

- (PIREPDataViewController*) init;
- (void) flashScrollIndicator;

@end