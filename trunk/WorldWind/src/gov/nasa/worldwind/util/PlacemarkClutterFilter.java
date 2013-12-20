/*
 * Copyright (C) 2012 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration.
 * All Rights Reserved.
 */

package gov.nasa.worldwind.util;

import com.jogamp.opengl.util.awt.TextRenderer;
import gov.nasa.worldwind.geom.*;
import gov.nasa.worldwind.render.*;

import javax.media.opengl.*;
import java.awt.*;
import java.awt.geom.*;
import java.util.*;
import java.util.List;

/**
 * Provides a clutter filter that rearranges {@link PointPlacemark} labels to avoid overlap. When placemarks overlap,
 * only their label and a line to their position are drawn. The placemark's icon is not drawn for overlapping
 * placemarks.
 *
 * @author tag
 * @version $Id$
 */
public class PlacemarkClutterFilter implements ClutterFilter
{
    /** Holds the rectangles of the regions already drawn. */
    protected List<Rectangle2D> rectList = new ArrayList<Rectangle2D>();
    /** Maintains a list of regions and the shapes associated with each region. */
    protected Map<Rectangle2D, List<Declutterable>> shapeMap = new HashMap<Rectangle2D, List<Declutterable>>();

    public void apply(DrawContext dc, List<Declutterable> shapes)
    {
        for (Declutterable shape : shapes)
        {
            Rectangle2D bounds = shape.getBounds(dc);

            Rectangle2D intersectingRegion = this.intersects(bounds);
            if (intersectingRegion != null)
                this.addShape(intersectingRegion, shape);
            else if (bounds != null)
            {
                // Double the size of the capturing rectangle in order to grab more than it otherwise would. This
                // reduces the clutter caused by the decluttered representations themselves.
                double w = 2 * bounds.getWidth();
                double h = 2 * bounds.getHeight();
                double x = bounds.getX() - 0.5 * bounds.getWidth();
                double y = bounds.getY() - 0.5 * bounds.getHeight();
                this.addShape(new Rectangle.Double(x, y, w, h), shape);
            }
        }

        this.render(dc);
        this.clear();
    }

    /** Release all the resources used in the most recent filter application. */
    protected void clear()
    {
        this.rectList.clear();
        this.shapeMap.clear();
    }

    /**
     * Indicates whether a specified region intersects a region in the filter.
     *
     * @param rectangle the region to test.
     *
     * @return the intersected region if the input region intersects one or more other regions in the filter, otherwise
     *         false.
     */
    protected Rectangle2D intersects(Rectangle2D rectangle)
    {
        if (rectangle == null)
            return null;

        for (Rectangle2D rect : this.rectList)
        {
            if (rectangle.intersects(rect))
                return rect;
        }

        return null;
    }

    /**
     * Adds a shape to the internal shape map.
     *
     * @param rectangle the rectangle to associate the shape with.
     * @param shape     the shape to associate with the specified rectangle.
     */
    protected void addShape(Rectangle2D rectangle, Declutterable shape)
    {
        List<Declutterable> shapeList = this.shapeMap.get(rectangle);

        if (shapeList == null)
        {
            shapeList = new ArrayList<Declutterable>(1);
            this.shapeMap.put(rectangle, shapeList);
            this.rectList.add(rectangle);
        }

        shapeList.add(shape);
    }

    /**
     * Draws the decluttered shape representation. For shapes that are not {@code PointPlacemark}s, the first non-
     * placemark shape is drawn in addition to the placemark representation. This causes this filter to produce the same
     * results for non-placemark shapes as does {@link BasicClutterFilter}.
     *
     * @param dc the current draw context.
     */
    protected void render(DrawContext dc)
    {
        for (Map.Entry<Rectangle2D, List<Declutterable>> entry : this.shapeMap.entrySet())
        {
            List<PointPlacemark> placemarks = null;
            Declutterable firstShape = null;

            for (Declutterable shape : entry.getValue())
            {
                if (shape instanceof PointPlacemark)
                {
                    if (placemarks == null)
                        placemarks = new ArrayList<PointPlacemark>();
                    placemarks.add((PointPlacemark) shape);
                }
                else
                {
                    // Keep track of the first non-placemark shape associated with the current rectangle.
                    if (firstShape == null)
                        firstShape = shape;
                }
            }

            // Add the first shape back to the ordered renderable list.
            if (firstShape != null)
                dc.addOrderedRenderable(firstShape);

            if (placemarks != null && placemarks.size() > 1)
            {
                double angle = -placemarks.size(); // increments Y position of placemark label

                for (PointPlacemark pp : placemarks)
                {
                    angle += 1;
                    dc.addOrderedRenderable(new DeclutteredLabel(angle, pp, entry.getKey()));
                }
            }
            else if (placemarks != null && placemarks.size() == 1)
            {
                // If there's only one placemark associated with the current rectangle, just add it back to the
                // ordered renderable list.
                dc.addOrderedRenderable(placemarks.get(0));
            }
        }
    }

    protected static class DeclutteredLabel implements OrderedRenderable
    {
        protected double angle;
        protected PointPlacemark placemark;
        protected Rectangle2D region;

        public DeclutteredLabel(double angle, PointPlacemark placemark, Rectangle2D region)
        {
            this.angle = angle;
            this.placemark = placemark;
            this.region = region;
        }

        @Override
        public double getDistanceFromEye()
        {
            return this.placemark.getDistanceFromEye();
        }

        @Override
        public void pick(DrawContext dc, Point pickPoint)
        {
        }

        public void render(DrawContext dc)
        {
            GL2 gl = dc.getGL().getGL2(); // GL initialization checks for GL2 compatibility.
            PointPlacemarkAttributes attrs = this.placemark.getAttributes();
            Font font = attrs != null ? attrs.getLabelFont() : null;
            if (font == null)
                font = PointPlacemarkAttributes.DEFAULT_LABEL_FONT;

            OGLStackHandler osh = new OGLStackHandler();

            int attrMask =
                GL2.GL_DEPTH_BUFFER_BIT // for depth test, depth mask and depth func
                    | GL2.GL_TRANSFORM_BIT // for modelview and perspective
                    | GL2.GL_VIEWPORT_BIT // for depth range
                    | GL2.GL_CURRENT_BIT // for current color
                    | GL2.GL_COLOR_BUFFER_BIT // for alpha test func and ref, and blend
                    | GL2.GL_DEPTH_BUFFER_BIT // for depth func
                    | GL2.GL_ENABLE_BIT // for enable/disable changes
                    | GL2.GL_HINT_BIT | GL2.GL_LINE_BIT; // for antialiasing and line attrs
            osh.pushAttrib(gl, attrMask);

            osh.pushProjectionIdentity(gl);
            try
            {

                // Do not depth buffer the label. (Placemarks beyond the horizon are culled above.)
                gl.glDisable(GL.GL_DEPTH_TEST);
                gl.glDepthMask(false);

                // The label is drawn using a parallel projection.
                gl.glOrtho(0d, dc.getView().getViewport().width, 0d, dc.getView().getViewport().height, -1d, 1d);

                // Compute the starting point of the line.
                Position position = this.placemark.getReferencePosition();
                Vec4 point = dc.computePointFromPosition(position, this.placemark.getAltitudeMode());
                Vec4 startPoint = dc.getView().project(point);

                Rectangle2D bounds = this.placemark.getBounds(dc);

                // Compute the text point.
                double dx = -1.0 * bounds.getWidth();
                double dy = this.angle * bounds.getHeight();
                double x = this.region.getX();
                double y = this.region.getCenterY();
                Vec4 textPoint = new Vec4(x + dx, y + dy, 0);

                this.drawDeclutterLabel(dc, font, textPoint, placemark.getLabelText());

                // Compute the end point of the line.
                Vec4 endPoint = new Vec4(textPoint.x + bounds.getWidth(), textPoint.y, textPoint.z);
                dx = endPoint.x - startPoint.x;
                dy = endPoint.y() - startPoint.y;
                double d1 = dx * dx + dy * dy;
                dx = textPoint.x - startPoint.x;
                dy = textPoint.y - startPoint.y;
                double d2 = dx * dx + dy * dy;
                if (d2 < d1)
                    endPoint = textPoint;
                this.drawDeclutterLine(dc, startPoint, endPoint);
            }
            finally
            {
                osh.pop(gl);
            }
        }

        protected void drawDeclutterLabel(DrawContext dc, Font font, Vec4 textPoint, String labelText)
        {
            GL2 gl = dc.getGL().getGL2(); // GL initialization checks for GL2 compatibility.

            gl.glMatrixMode(GL2.GL_MODELVIEW);
            gl.glLoadIdentity();

            TextRenderer textRenderer = OGLTextRenderer.getOrCreateTextRenderer(dc.getTextRendererCache(), font);
            try
            {
                textRenderer.begin3DRendering();
                textRenderer.setColor(Color.BLACK);
                textRenderer.draw3D(labelText, (float) textPoint.x + 1, (float) textPoint.y - 1, 0, 1);
                textRenderer.setColor(Color.WHITE);
                textRenderer.draw3D(labelText, (float) textPoint.x, (float) textPoint.y, 0, 1);
            }
            finally
            {
                textRenderer.end3DRendering();
            }
        }

        protected void drawDeclutterLine(DrawContext dc, Vec4 startPoint, Vec4 endPoint)
        {
            GL2 gl = dc.getGL().getGL2(); // GL initialization checks for GL2 compatibility.

            gl.glLineWidth(1);

            Color color = Color.WHITE;
            gl.glColor4ub((byte) color.getRed(), (byte) color.getGreen(), (byte) color.getBlue(),
                (byte) color.getAlpha());

            gl.glBegin(GL2.GL_LINE_STRIP);
            gl.glVertex3d(startPoint.x(), startPoint.y, startPoint.z);
            gl.glVertex3d(endPoint.x, endPoint.y(), endPoint.z);
            gl.glEnd();
        }
    }
}