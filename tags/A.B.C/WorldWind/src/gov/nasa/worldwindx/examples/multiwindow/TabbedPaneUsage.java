/*
Copyright (C) 2001, 2009 United States Government
as represented by the Administrator of the
National Aeronautics and Space Administration.
All Rights Reserved.
*/

package gov.nasa.worldwindx.examples.multiwindow;

import gov.nasa.worldwind.*;
import gov.nasa.worldwind.layers.*;
import gov.nasa.worldwind.layers.Earth.*;
import gov.nasa.worldwind.globes.*;
import gov.nasa.worldwind.avlist.AVKey;
import gov.nasa.worldwind.awt.WorldWindowGLCanvas;
import gov.nasa.worldwind.util.*;

import javax.swing.*;
import java.awt.*;

/**
 * This class illustrates how to use multiple World Wind windows with a {@link JTabbedPane}.
 * <p/>
 * Applications using multiple World Wind windows simultaneously should instruct World Wind to share OpenGL and other
 * resources among those windows. Most World Wind classes are designed to be shared across {@link WorldWindow} objects
 * and will be shared automatically. But OpenGL resources are not automatically shared. To share them, a reference to a
 * previously created WorldWindow must be specified as a constructor argument for subsequently created WorldWindows.
 * <p/>
 * Most World Wind {@link gov.nasa.worldwind.globes.Globe} and {@link gov.nasa.worldwind.layers.Layer} objects can be shared among WorldWindows. Those that cannot be shared
 * have an operational dependency on the WorldWindow they're associated with. An example is the {@link
 * gov.nasa.worldwind.layers.ViewControlsLayer} layer for on-screen navigation. Because this layer responds to input events within a specific
 * WorldWindow, it is not sharable. Refer to the World Wind Overview page for a list of layers that cannot be shared.
 * // TODO: include the reference to overview.html.
 *
 * @version $Id$
 */
public class TabbedPaneUsage extends JFrame
{
    private static class WWPanel extends JPanel
    {
        WorldWindowGLCanvas wwd;

        public WWPanel(WorldWindowGLCanvas shareWith, int width, int height)
        {
            // To share resources among World Windows, pass the first World Window to the constructor of the other
            // World Windows.
            this.wwd = shareWith != null ? new WorldWindowGLCanvas(shareWith) : new WorldWindowGLCanvas();
            this.wwd.setSize(new java.awt.Dimension(width, height));

            this.setLayout(new BorderLayout(5, 5));
            this.add(this.wwd, BorderLayout.CENTER);
            this.setOpaque(false);

            StatusBar statusBar = new StatusBar();
            statusBar.setEventSource(wwd);
            this.add(statusBar, BorderLayout.SOUTH);
        }
    }

    public TabbedPaneUsage()
    {
        try
        {
            // Create the application frame and the tabbed pane and add the pane to the frame.
            JTabbedPane tabbedPanel = new JTabbedPane();
            this.add(tabbedPanel, BorderLayout.CENTER);

            // Create two World Windows that share resources.
            WWPanel wwpA = new WWPanel(null, 600, 600);
            WWPanel wwpB = new WWPanel(wwpA.wwd, wwpA.getWidth(), wwpA.getHeight());

            tabbedPanel.add(wwpA, "World Window A");
            tabbedPanel.add(wwpB, "World Window B");

            // Create the Model, starting with the Globe.
            Globe earth = new Earth();

            // Create layers that both World Windows can share.
            Layer[] layers = new Layer[]
                {
                    new StarsLayer(),
                    new CompassLayer(),
                    new BMNGWMSLayer(),
                    new LandsatI3WMSLayer(),
                };

            // Create two models and pass them the shared layers.
            Model modelForWindowA = new BasicModel();
            modelForWindowA.setGlobe(earth);
            modelForWindowA.setLayers(new LayerList(layers));
            wwpA.wwd.setModel(modelForWindowA);

            Model modelForWindowB = new BasicModel();
            modelForWindowB.setGlobe(earth);
            modelForWindowB.setLayers(new LayerList(layers));
            wwpB.wwd.setModel(modelForWindowB);

            // Add view control layers, which the World Windows cannnot share.
            ViewControlsLayer viewControlsA = new ViewControlsLayer();
            wwpA.wwd.getModel().getLayers().add(viewControlsA);
            wwpA.wwd.addSelectListener(new ViewControlsSelectListener(wwpA.wwd, viewControlsA));

            ViewControlsLayer viewControlsB = new ViewControlsLayer();
            wwpB.wwd.getModel().getLayers().add(viewControlsB);
            wwpB.wwd.addSelectListener(new ViewControlsSelectListener(wwpB.wwd, viewControlsB));

            // Add the card panel to the frame.
            this.add(tabbedPanel, BorderLayout.CENTER);

            // Position and display the frame.
            this.setTitle("World Wind Multi-Window Tabbed Pane");
            this.setDefaultCloseOperation(javax.swing.JFrame.EXIT_ON_CLOSE);
            this.pack();
            WWUtil.alignComponent(null, this, AVKey.CENTER); // Center the application on the screen.
            this.setResizable(true);
            this.setVisible(true);
        }
        catch (Exception e)
        {
            e.printStackTrace();
        }
    }

    public static void main(String[] args)
    {
        SwingUtilities.invokeLater(new Runnable()
        {
            public void run()
            {
                new TabbedPaneUsage();
            }
        });
    }
}
