/*
 * Copyright (C) 2012 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration.
 * All Rights Reserved.
 */

package gov.nasa.worldwind.symbology.milstd2525;

import gov.nasa.worldwind.*;
import gov.nasa.worldwind.avlist.*;
import gov.nasa.worldwind.geom.Position;
import gov.nasa.worldwind.render.*;
import gov.nasa.worldwind.symbology.*;
import gov.nasa.worldwind.symbology.milstd2525.graphics.*;
import gov.nasa.worldwind.util.*;

import java.awt.*;
import java.util.*;
import java.util.List;

/**
 * Implementation of MIL-STD-2525 point graphics. Point graphics are rendered in the same way as tactical symbols: by
 * drawing an icon at constant screen size.
 *
 * @author pabercrombie
 * @version $Id$
 */
// TODO: apply attributes to symbol
// TODO: apply delegate owner to symbol.
public class MilStd2525PointGraphic extends MilStd2525TacticalGraphic implements TacticalPoint
{
    /**
     * Object that provides the default offset for each point graphic. Most graphics are centered on their position, but
     * some require a different offset.
     */
    protected static DefaultOffsets defaultOffsets = new DefaultOffsets();

    /** Object that provides the default label layouts for each point graphic. */
    protected static DefaultLabelLayouts defaultLayouts = new DefaultLabelLayouts();

    /** Default icon retrieval URL. */
    protected static final String DEFAULT_RETRIEVER_BASE_URL = "http://worldwindserver.net/milstd2525/";
    /** Note that we use a static default retriever instance in order to cache the results it returns. */
    protected static final IconRetriever DEFAULT_ICON_RETRIEVER = new MilStd2525PointGraphicRetriever(
        DEFAULT_RETRIEVER_BASE_URL);

    public static class LabelLayout
    {
        public Offset offset;
        public Offset hotSpot;

        public LabelLayout(Offset offset, Offset hotSpot)
        {
            this.offset = offset;
            this.hotSpot = hotSpot;
        }
    }

    /** Implementation of TacticalSymbol that is configured to create and layout tactical point graphics. */
    // TODO methods in this inner class should call to the outer class for easier extensibility.
    protected class PointGraphicSymbol extends AbstractTacticalSymbol
    {
        protected SymbolCode symbolCode;

        /**
         * Constructs a new symbol with the specified position. The position specifies the latitude, longitude, and
         * altitude where this symbol is drawn on the globe. The position's altitude component is interpreted according
         * to the altitudeMode.
         *
         * @param symbolId 2525 SIDC for this symbol.
         * @param position The latitude, longitude, and altitude where the symbol is drawn.
         *
         * @throws IllegalArgumentException if the position is <code>null</code>.
         */
        protected PointGraphicSymbol(String symbolId, Position position)
        {
            super(position);

            // Initialize the symbol code from the symbol identifier specified at construction.
            this.symbolCode = new SymbolCode(symbolId);
            this.setAltitudeMode(WorldWind.CLAMP_TO_GROUND);

            // Configure this tactical point graphic's icon retriever and modifier retriever with either the
            // configuration value or the default value (in that order of precedence).
            String iconRetrieverPath = Configuration.getStringValue(AVKey.MIL_STD_2525_ICON_RETRIEVER_PATH,
                MilStd2525Constants.DEFAULT_ICON_RETRIEVER_PATH);
            this.setIconRetriever(new MilStd2525PointGraphicRetriever(iconRetrieverPath));

            Offset offset = defaultOffsets.get(this.symbolCode.toMaskedString());
            this.setOffset(offset);
        }

        /** {@inheritDoc} */
        public String getIdentifier()
        {
            return MilStd2525PointGraphic.this.getIdentifier();
        }

        @Override
        protected void layoutModifiers(DrawContext dc)
        {
            if (this.iconRect == null)
                return;

            this.currentLabels.clear();

            // We compute a default font rather than using a static default in order to choose a font size that is
            // appropriate for the symbol's frame height. According to the MIL-STD-2525C specification, the text modifier
            // height must be 0.3x the symbol's frame height.
            Font font = this.getActiveAttributes().getTextModifierFont();
            if (font == null)
                font = MilStd2525Util.computeTextModifierFont(this.iconRect.getHeight());

            Map<String, List<LabelLayout>> allLayouts = defaultLayouts.get(this.symbolCode.toMaskedString());

            for (Map.Entry<String, List<LabelLayout>> entry : allLayouts.entrySet())
            {
                String key = entry.getKey();
                List<LabelLayout> layouts = entry.getValue();

                if (WWUtil.isEmpty(layouts))
                    continue;

                Object value = this.getLabelValue(key);

                // If we're retrieving the date modifier, maybe add a hyphen to the first value to indicate a date range.
                if (SymbologyConstants.DATE_TIME_GROUP.equals(key) && (value instanceof Iterable))
                {
                    value = this.addHyphenToDateRange((Iterable) value, layouts);
                }

                // Some graphics support multiple instances of the same modifier. Handle this case differently than the
                // single instance case.
                if (value instanceof Iterable)
                {
                    this.layoutMultiLabel(dc, font, layouts, (Iterable) value);
                }
                else if (value != null)
                {
                    this.layoutLabel(dc, font, layouts.get(0), value.toString());
                }
            }
        }

        /**
         * Add a hyphen to the first element in a list of dates to indicate a date range. This method only modifiers the
         * date list if exactly two dates are displayed in the graphic.
         *
         * @param value   Iterable of date modifiers.
         * @param layouts Layouts for the date modifiers.
         *
         * @return Iterable of modified dates. This may be a new, modified list, or the same list as {@code value} if no
         *         modification was required.
         */
        protected Iterable addHyphenToDateRange(Iterable value, List<LabelLayout> layouts)
        {
            // Only add a hyphen if exactly two dates are displayed in the graphic.
            if (layouts.size() != 2)
                return value;

            // Make sure that two date values are provided.
            Iterator iterator = value.iterator();
            Object date1 = iterator.hasNext() ? iterator.next() : null;
            Object date2 = iterator.hasNext() ? iterator.next() : null;

            // If only two dates were provided, add a hyphen to indicate a date range. If more or less
            // date were provided it's not a date range, so don't change anything.
            if (date1 != null && date2 != null)
            {
                return Arrays.asList(date1 + "-", date2);
            }
            return value;
        }

        protected void layoutLabel(DrawContext dc, Font font, LabelLayout layout, String value)
        {
            if (!WWUtil.isEmpty(value))
            {
                this.addLabel(dc, layout.offset, layout.hotSpot, value, font, null, null);
            }
        }

        protected void layoutMultiLabel(DrawContext dc, Font font, List<LabelLayout> layouts, Iterable values)
        {
            Iterator valueIterator = values.iterator();
            Iterator<LabelLayout> layoutIterator = layouts.iterator();

            while (layoutIterator.hasNext() && valueIterator.hasNext())
            {
                LabelLayout layout = layoutIterator.next();
                Object value = valueIterator.next();
                if (value != null)
                {
                    this.layoutLabel(dc, font, layout, value.toString());
                }
            }
        }

        protected Object getLabelValue(String key)
        {
            Object value = null;
            if (SymbologyConstants.HOSTILE_ENEMY.equals(key))
            {
                if (SymbologyConstants.STANDARD_IDENTITY_HOSTILE.equals(this.symbolCode.getStandardIdentity()))
                {
                    value = SymbologyConstants.HOSTILE_ENEMY;
                }
            }
            else if (SymbologyConstants.TYPE.equals(key))
            {
                value = this.getType();
            }
            else
            {
                value = this.getModifier(key);
            }
            return value;
        }

        /**
         * Indicates the Type modifier. This modifier is only used by Nuclear/Chemical/Biological graphics. In the case
         * of Nuclear graphics the modifier is specfied by the application. In the case of chemical or biological this
         * method returns the string "CML" or "BIO".
         *
         * @return The value of the type modifier. Returns null if no type modifier has been set, and the graphics is
         *         not Chemical or Biological.
         */
        protected String getType()
        {
            if (TacGrpSidc.MOBSU_CBRN_REEVNT_BIO.equals(MilStd2525PointGraphic.this.maskedSymbolCode))
            {
                return "BIO";
            }
            else if (TacGrpSidc.MOBSU_CBRN_REEVNT_CML.equals(MilStd2525PointGraphic.this.maskedSymbolCode))
            {
                return "CML";
            }
            else
            {
                return (String) this.getModifier(SymbologyConstants.TYPE);
            }
        }

        @Override
        public Object getModifier(String key)
        {
            return MilStd2525PointGraphic.this.getModifier(key);
        }

        @Override
        public void setModifier(String key, Object value)
        {
            MilStd2525PointGraphic.this.setModifier(key, value);
        }
    }

    protected Object delegateOwner;

    /** Position of this graphic. */
    protected Position position;

    /** Symbol used to render this graphic. */
    protected TacticalSymbol symbol;

    /**
     * Create a new point graphic.
     *
     * @param sidc MIL-STD-2525 SIDC code that identifies the graphic.
     */
    public MilStd2525PointGraphic(String sidc)
    {
        super(sidc);
        this.init(sidc, modifiers);
    }

    protected void init(String symbolId, AVList modifiers)
    {
        // Initialize the symbol code from the symbol identifier specified at construction.
        this.symbolCode = new SymbolCode(symbolId);

        // Apply any caller-specified key-value pairs to the modifiers list. We apply these pairs last to give them
        // precedence.
        if (modifiers != null)
            this.modifiers.setValues(modifiers);
    }

    /**
     * Create a tactical symbol to render this graphic.
     *
     * @param symbolId SIDC of the symbol.
     * @param position Position of the symbol.
     *
     * @return A new tactical symbol.
     */
    protected TacticalSymbol createSymbol(String symbolId, Position position)
    {
        return new PointGraphicSymbol(symbolId, position);
    }

    /**
     * {@inheritDoc}
     *
     * @return Always returns an Iterable with only one position.
     */
    public Iterable<? extends Position> getPositions()
    {
        return Arrays.asList(this.getPosition());
    }

    /**
     * {@inheritDoc}
     *
     * @param positions Control points. This graphic uses only one control point.
     */
    public void setPositions(Iterable<? extends Position> positions)
    {
        if (positions == null)
        {
            String message = Logging.getMessage("nullValue.PositionsListIsNull");
            Logging.logger().severe(message);
            throw new IllegalArgumentException(message);
        }

        Iterator<? extends Position> iterator = positions.iterator();
        if (!iterator.hasNext())
        {
            String message = Logging.getMessage("generic.InsufficientPositions");
            Logging.logger().severe(message);
            throw new IllegalArgumentException(message);
        }

        this.setPosition(iterator.next());
    }

    /** {@inheritDoc} */
    public Position getPosition()
    {
        return this.position;
    }

    /** {@inheritDoc} */
    public void setPosition(Position position)
    {
        if (position == null)
        {
            String message = Logging.getMessage("nullValue.PositionIsNull");
            Logging.logger().severe(message);
            throw new IllegalArgumentException(message);
        }

        this.position = position;
    }

    /////////////////////////////
    // Movable interface
    /////////////////////////////

    /** {@inheritDoc} */
    public Position getReferencePosition()
    {
        return this.getPosition();
    }

    /////////////////////////////
    // Rendering
    /////////////////////////////

    @Override
    protected void doRenderGraphic(DrawContext dc)
    {
        Position position = this.getPosition();
        if (position == null)
            return;

        // Create the symbol used to render the graphic, if it has not been created already.
        if (this.symbol == null)
        {
            this.symbol = this.createSymbol(this.getIdentifier(), position);
        }

        this.symbol.render(dc);
    }

    /** {@inheritDoc} */
    protected void applyDelegateOwner(Object owner)
    {
        // TODO
    }

    /**
     * Indicates the graphics supported by this class.
     *
     * @return List of masked SIDC strings that identify graphics that this class supports.
     */
    public static List<String> getSupportedGraphics()
    {
        return Arrays.asList(
            TacGrpSidc.TSK_DSTY,
            TacGrpSidc.TSK_ITDT,
            TacGrpSidc.TSK_NEUT,
            TacGrpSidc.C2GM_GNL_PNT_USW_UH2_DTM,
            TacGrpSidc.C2GM_GNL_PNT_USW_UH2_BCON,
            TacGrpSidc.C2GM_GNL_PNT_USW_UH2_LCON,
            TacGrpSidc.C2GM_GNL_PNT_USW_UH2_SNK,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_PTNCTR,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_DIFAR,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_LOFAR,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_CASS,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_DICASS,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_BT,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_ANM,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_VLAD,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_ATAC,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_RO,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_KGP,
            TacGrpSidc.C2GM_GNL_PNT_USW_SNBY_EXP,
            TacGrpSidc.C2GM_GNL_PNT_USW_SRH,
            TacGrpSidc.C2GM_GNL_PNT_USW_SRH_ARA,
            TacGrpSidc.C2GM_GNL_PNT_USW_SRH_DIPPSN,
            TacGrpSidc.C2GM_GNL_PNT_USW_SRH_CTR,
            TacGrpSidc.C2GM_GNL_PNT_REFPNT,
            TacGrpSidc.C2GM_GNL_PNT_REFPNT_NAVREF,
            TacGrpSidc.C2GM_GNL_PNT_REFPNT_SPLPNT,
            TacGrpSidc.C2GM_GNL_PNT_REFPNT_DLRP,
            TacGrpSidc.C2GM_GNL_PNT_REFPNT_PIM,
            TacGrpSidc.C2GM_GNL_PNT_REFPNT_MRSH,
            TacGrpSidc.C2GM_GNL_PNT_REFPNT_WAP,
            TacGrpSidc.C2GM_GNL_PNT_REFPNT_CRDRTB,
            TacGrpSidc.C2GM_GNL_PNT_REFPNT_PNTINR,
            TacGrpSidc.C2GM_GNL_PNT_WPN_AIMPNT,
            TacGrpSidc.C2GM_GNL_PNT_WPN_DRPPNT,
            TacGrpSidc.C2GM_GNL_PNT_WPN_ENTPNT,
            TacGrpSidc.C2GM_GNL_PNT_WPN_GRDZRO,
            TacGrpSidc.C2GM_GNL_PNT_WPN_MSLPNT,
            TacGrpSidc.C2GM_GNL_PNT_WPN_IMTPNT,
            TacGrpSidc.C2GM_GNL_PNT_WPN_PIPNT,
            TacGrpSidc.C2GM_GNL_PNT_FRMN,
            TacGrpSidc.C2GM_GNL_PNT_HBR,
            TacGrpSidc.C2GM_GNL_PNT_HBR_PNTQ,
            TacGrpSidc.C2GM_GNL_PNT_HBR_PNTA,
            TacGrpSidc.C2GM_GNL_PNT_HBR_PNTY,
            TacGrpSidc.C2GM_GNL_PNT_HBR_PNTX,
            TacGrpSidc.C2GM_GNL_PNT_RTE,
            TacGrpSidc.C2GM_GNL_PNT_RTE_RDV,
            TacGrpSidc.C2GM_GNL_PNT_RTE_DVSN,
            TacGrpSidc.C2GM_GNL_PNT_RTE_WAP,
            TacGrpSidc.C2GM_GNL_PNT_RTE_PIM,
            TacGrpSidc.C2GM_GNL_PNT_RTE_PNTR,
            TacGrpSidc.C2GM_GNL_PNT_ACTL,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_CAP,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_ABNEW,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_TAK,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_ASBWF,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_ASBWR,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_SUWF,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_SUWR,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_MIWF,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_MIWR,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_SKEIP,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_TCN,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_TMC,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_RSC,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_RPH,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_UA,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_VTUA,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_ORB,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_ORBF8,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_ORBRT,
            TacGrpSidc.C2GM_GNL_PNT_ACTL_ORBRD,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_CHKPNT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_CONPNT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_CRDPNT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_DCNPNT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_LNKUPT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_PSSPNT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_RAYPNT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_RELPNT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_STRPNT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_AMNPNT,
            TacGrpSidc.C2GM_GNL_PNT_ACTPNT_WAP,
            TacGrpSidc.C2GM_GNL_PNT_SCTL,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_USV,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_USV_RMV,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_USV_ASW,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_USV_SUW,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_USV_MIW,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_ASW,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_SUW,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_MIW,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_PKT,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_RDV,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_RSC,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_REP,
            TacGrpSidc.C2GM_GNL_PNT_SCTL_NCBTT,
            TacGrpSidc.C2GM_GNL_PNT_UCTL,
            TacGrpSidc.C2GM_GNL_PNT_UCTL_UUV,
            TacGrpSidc.C2GM_GNL_PNT_UCTL_UUV_ASW,
            TacGrpSidc.C2GM_GNL_PNT_UCTL_UUV_SUW,
            TacGrpSidc.C2GM_GNL_PNT_UCTL_UUV_MIW,
            TacGrpSidc.C2GM_GNL_PNT_UCTL_SBSTN,
            TacGrpSidc.C2GM_GNL_PNT_UCTL_SBSTN_ASW,
            TacGrpSidc.C2GM_AVN_PNT_DAPP,
            TacGrpSidc.MOBSU_OBST_ATO_TDTSM_FIXPFD,
            TacGrpSidc.MOBSU_OBST_ATO_TDTSM_MVB,
            TacGrpSidc.MOBSU_OBST_ATO_TDTSM_MVBPFD,
            TacGrpSidc.MOBSU_OBST_BBY,
            TacGrpSidc.MOBSU_OBST_MNE_USPMNE,
            TacGrpSidc.MOBSU_OBST_MNE_ATMNE,
            TacGrpSidc.MOBSU_OBST_MNE_ATMAHD,
            TacGrpSidc.MOBSU_OBST_MNE_ATMDIR,
            TacGrpSidc.MOBSU_OBST_MNE_APMNE,
            TacGrpSidc.MOBSU_OBST_MNE_WAMNE,
            TacGrpSidc.MOBSU_OBST_AVN_TWR_LOW,
            TacGrpSidc.MOBSU_OBST_AVN_TWR_HIGH,
            TacGrpSidc.MOBSU_OBSTBP_CSGSTE_ERP,
            TacGrpSidc.MOBSU_SU_ESTOF,
            TacGrpSidc.MOBSU_SU_FRT,
            TacGrpSidc.MOBSU_SU_SUFSHL,
            TacGrpSidc.MOBSU_SU_UGDSHL,
            TacGrpSidc.MOBSU_CBRN_NDGZ,
            TacGrpSidc.MOBSU_CBRN_FAOTP,
            TacGrpSidc.MOBSU_CBRN_REEVNT_BIO,
            TacGrpSidc.MOBSU_CBRN_REEVNT_CML,
            TacGrpSidc.MOBSU_CBRN_DECONP_USP,
            TacGrpSidc.MOBSU_CBRN_DECONP_ALTUSP,
            TacGrpSidc.MOBSU_CBRN_DECONP_TRP,
            TacGrpSidc.MOBSU_CBRN_DECONP_EQT,
            TacGrpSidc.MOBSU_CBRN_DECONP_EQTTRP,
            TacGrpSidc.MOBSU_CBRN_DECONP_OPDECN,
            TacGrpSidc.MOBSU_CBRN_DECONP_TRGH,
            TacGrpSidc.FSUPP_PNT_TGT_PTGT,
            TacGrpSidc.FSUPP_PNT_TGT_NUCTGT,
            TacGrpSidc.FSUPP_PNT_C2PNT_FSS,
            TacGrpSidc.FSUPP_PNT_C2PNT_SCP,
            TacGrpSidc.FSUPP_PNT_C2PNT_FP,
            TacGrpSidc.FSUPP_PNT_C2PNT_RP,
            TacGrpSidc.FSUPP_PNT_C2PNT_HP,
            TacGrpSidc.FSUPP_PNT_C2PNT_LP,
            TacGrpSidc.CSS_PNT_AEP,
            TacGrpSidc.CSS_PNT_CBNP,
            TacGrpSidc.CSS_PNT_CCP,
            TacGrpSidc.CSS_PNT_CVP,
            TacGrpSidc.CSS_PNT_DCP,
            TacGrpSidc.CSS_PNT_EPWCP,
            TacGrpSidc.CSS_PNT_LRP,
            TacGrpSidc.CSS_PNT_MCP,
            TacGrpSidc.CSS_PNT_RRRP,
            TacGrpSidc.CSS_PNT_ROM,
            TacGrpSidc.CSS_PNT_TCP,
            TacGrpSidc.CSS_PNT_TTP,
            TacGrpSidc.CSS_PNT_UMC,
            TacGrpSidc.CSS_PNT_SPT_GNL,
            TacGrpSidc.CSS_PNT_SPT_CLS1,
            TacGrpSidc.CSS_PNT_SPT_CLS2,
            TacGrpSidc.CSS_PNT_SPT_CLS3,
            TacGrpSidc.CSS_PNT_SPT_CLS4,
            TacGrpSidc.CSS_PNT_SPT_CLS5,
            TacGrpSidc.CSS_PNT_SPT_CLS6,
            TacGrpSidc.CSS_PNT_SPT_CLS7,
            TacGrpSidc.CSS_PNT_SPT_CLS8,
            TacGrpSidc.CSS_PNT_SPT_CLS9,
            TacGrpSidc.CSS_PNT_SPT_CLS10,
            TacGrpSidc.CSS_PNT_AP_ASP,
            TacGrpSidc.CSS_PNT_AP_ATP,
            TacGrpSidc.OTH_ER_DTHAC,
            TacGrpSidc.OTH_ER_PIW,
            TacGrpSidc.OTH_ER_DSTVES,
            TacGrpSidc.OTH_HAZ_SML,
            TacGrpSidc.OTH_HAZ_IB,
            TacGrpSidc.OTH_HAZ_OLRG,
            TacGrpSidc.OTH_SSUBSR_BTMRTN,
            TacGrpSidc.OTH_SSUBSR_BTMRTN_INS,
            TacGrpSidc.OTH_SSUBSR_BTMRTN_SBRSOO,
            TacGrpSidc.OTH_SSUBSR_BTMRTN_WRKND,
            TacGrpSidc.OTH_SSUBSR_BTMRTN_WRKD,
            TacGrpSidc.OTH_SSUBSR_MARLFE,
            TacGrpSidc.OTH_SSUBSR_SA,
            TacGrpSidc.OTH_FIX_ACU,
            TacGrpSidc.OTH_FIX_EM,
            TacGrpSidc.OTH_FIX_EOP);
    }
}
