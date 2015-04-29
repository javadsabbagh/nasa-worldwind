/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @version $Id$
 */

requirejs.config({
    "paths": {
        "WmsExplorer": "WmsExplorer"
    }
});

requirejs(["WmsExplorer"], function (WmsExplorer) {
    new WmsExplorer()
});
