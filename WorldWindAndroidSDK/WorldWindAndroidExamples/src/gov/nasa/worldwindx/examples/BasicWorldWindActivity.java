/*
 * Copyright (C) 2012 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration.
 * All Rights Reserved.
 */
package gov.nasa.worldwindx.examples;

import android.app.Activity;
import android.os.Bundle;
import android.view.*;
import android.view.View;
import android.widget.TextView;
import gov.nasa.worldwind.*;
import gov.nasa.worldwind.avlist.AVKey;
import gov.nasa.worldwind.geom.*;
import gov.nasa.worldwind.globes.Globe;
import gov.nasa.worldwind.util.dashboard.DashboardView;

import java.io.File;

/**
 * @author dcollins
 * @version $Id$
 */
public class BasicWorldWindActivity extends Activity
{
    protected WorldWindowGLSurfaceView wwd;
    protected DashboardView dashboard;

    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        // TODO: temporary method of setting the location of the file store on Android. Need to replace this with
        // TODO: something more flexible.
        File fileDir = getFilesDir();
        System.setProperty("gov.nasa.worldwind.platform.user.store", fileDir.getAbsolutePath());

        this.setContentView(R.layout.basic_worldwind_activity);

        this.wwd = (WorldWindowGLSurfaceView) this.findViewById(R.id.wwd);
        this.wwd.setModel((Model) WorldWind.createConfigurationComponent(AVKey.MODEL_CLASS_NAME));
        this.setupView();
        this.setupTextViews();

        // Link the Android Dashboard view to this activity's WorldWindow.
        this.dashboard = (DashboardView) this.findViewById(R.id.dashboard);
        this.dashboard.setWwd(this.wwd);
//
//        Thread t = new Thread(new Runnable()
//        {
//            public void run()
//            {
//                try
//                {
//                    URL url = new URL("http://wwdev.tomgaskins.net/KMLTestFiles/LongLineString.kml");
//                    KMLRoot kmlRoot = KMLRoot.createAndParse(url);
//                    KMLController kmlController = new KMLController(kmlRoot);
//                    RenderableLayer layer = new RenderableLayer();
//                    layer.addRenderable(kmlController);
//                }
//                catch (MalformedURLException e)
//                {
//                    e.printStackTrace();
//                }
//                catch (XMLParserException e)
//                {
//                    e.printStackTrace();
//                }
//                catch (IOException e)
//                {
//                    e.printStackTrace();
//                }
//            }
//        });
//        t.start();
    }

    @Override
    protected void onPause()
    {
        super.onPause();

        // Pause the OpenGL ES rendering thread.
        this.wwd.onPause();
    }

    @Override
    protected void onResume()
    {
        super.onResume();

        // Resume the OpenGL ES rendering thread.
        this.wwd.onResume();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu)
    {
        // Configure the application's options menu using the XML file res/menu/options.xml.
        this.getMenuInflater().inflate(R.menu.options, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item)
    {
        // Display the World Wind dashboard when the dashboard options menu item is selected.
        switch (item.getItemId())
        {
            case R.id.dashboard:
                this.dashboard.setVisibility(View.VISIBLE);
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    protected void setupView()
    {
        // TODO: this should be done during View initialization, not here in the application.
        BasicView view = (BasicView) this.wwd.getView();
        Globe globe = this.wwd.getModel().getGlobe();

        Position lookFromPosition = Position.fromDegrees(Configuration.getDoubleValue(AVKey.INITIAL_LATITUDE),
            Configuration.getDoubleValue(AVKey.INITIAL_LONGITUDE),
            Configuration.getDoubleValue(AVKey.INITIAL_ALTITUDE));
        view.setEyePosition(lookFromPosition, Angle.fromDegrees(0), Angle.fromDegrees(0), globe);
        view.setEyeTilt(Angle.fromDegrees(0), globe);
    }

    protected void setupTextViews()
    {
        TextView latTextView = (TextView) findViewById(R.id.latvalue);
        this.wwd.setLatitudeText(latTextView);
        TextView lonTextView = (TextView) findViewById(R.id.lonvalue);
        this.wwd.setLongitudeText(lonTextView);
    }
}
