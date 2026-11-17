#!/usr/bin/env python3
"""
The design basis for the UCIC first cluster, in one place.

Every dimension, area and room name used by the drawing set
(tools/build_design.py) and asserted by its check (tools/check_design.py)
is defined here, so the drawings, the schedules and the accompanying note
cannot drift apart. The figures also reconcile with the proposal: four 40ft
high-cube containers yielding roughly 120 m2 of enclosed floor.

Geometry
--------
A 40ft high-cube container is 12,192 mm long and 2,438 mm wide externally.
That fixes the plan arithmetic, and it is worth stating because it is what
makes the courtyard scheme work without cutting any container down:

    envelope width  = L + 2W = 17,068 mm   (north and south wings are full 40ft)
    envelope depth  = L      = 12,192 mm   (east and west wings are full 40ft)
    courtyard       = 12,192 x 7,316 mm    = 89.2 m2 covered deck

So all four containers are standard, uncut 40ft units. Nothing is fabricated
to a special length, which is the whole commercial argument for the scheme.
"""

# ---------------------------------------------------------------- containers
# ISO 668 / ISO 1496-1, 40ft high cube (1AAA)
CONT_L = 12192.0        # external length, mm
CONT_W = 2438.0         # external width, mm
CONT_H = 2896.0         # external height, mm
CONT_IL = 12032.0       # internal length, mm
CONT_IW = 2352.0        # internal width, mm
CONT_IH = 2698.0        # internal height, mm

CONT_FLOOR_M2 = 28.30   # gross internal floor, one container (12.032 x 2.352)
CONT_FOOTPRINT_M2 = 29.72

# ---------------------------------------------------------------- envelope
ENVELOPE_W = 17068.0    # = CONT_L + 2 * CONT_W
ENVELOPE_D = 12192.0    # = CONT_L
CONT_CUT = CONT_W       # where the north and south wings begin (mm)
# The courtyard is not square: it spans the full internal length between the
# east and west wings (CONT_L) and the bed depth between the south and north
# wings (CONT_L - 2W). Getting these two the wrong way round leaves the
# drawing with an unpainted strip and the area figure coincidentally right,
# which is exactly how it went unnoticed for a build.
COURT_W = CONT_L                 # 12192 mm between the east and west wings
COURT_D = CONT_L - 2 * CONT_W    # 7316 mm between the south and north wings
COURT_M2 = round(COURT_W * COURT_D / 1e6, 2)

# No service pod in the first cluster: plant goes in the plant bay at the
# north end of the studio container, and the WC is in the entry container.
# Keeping it inside the modules avoids a seventh structure and keeps the
# courtyard figure clean.
ENCLOSED_M2 = 4 * CONT_FLOOR_M2                # 113.2 m2

# Site: the plot the cluster sits on, with access, parking and drainage.
SITE_W = 30000.0
SITE_D = 24000.0
SITE_M2 = (SITE_W / 1000.0) * (SITE_D / 1000.0)

# ---------------------------------------------------------------- the four rooms
# Positions are the south-west corner of each container, in millimetres, in
# composition coordinates with the envelope at (0,0). The courtyard scheme
# closes exactly because envelope width = L + 2W and envelope depth = L, so
# all four modules are full, uncut 40ft units:
#
#     +-------------------------+   C04 north wing, full 40ft
#     |  C                       |
#     |  04      courtyard      |
#     |  C01                 C02|
#     |  west                east
#     +-------- C03 south ------+
#
# Rooms are listed south wing first, then the wings, then the north return.
ROOMS = [
    dict(ref="C03", name="Vocal and voice booth", short="Vocal booth",
         x=CONT_CUT, y=0.0, rot=0, zone="South wing",
         parts=[("Entry & airlock", 1800, 4.2), ("Booth A", 4000, 9.4),
                ("Booth B", 5100, 12.0), ("Plant", 1132, 2.7)],
         spec="Fully isolated \u00b7 podcast-ready",
         acoustics="Two independent booths either side of an airlock",
         services="Silent ventilation; no through-wall plant in either booth"),
    dict(ref="C01", name="Studio and control room", short="Studio & control",
         x=0.0, y=0.0, rot=90, zone="West wing",
         parts=[("Lobby & rack", 1800, 4.2), ("Control room", 4000, 9.4),
                ("Live room", 5100, 12.0), ("Store", 1132, 2.7)],
         spec="Console \u00b7 outboard \u00b7 mixing and mastering",
         acoustics="Room-in-room: isolated slab, floating floor, independent ceiling",
         services="Dedicated 32 A clean supply; separate technical earth"),
    dict(ref="C02", name="Live band module", short="Live band",
         x=CONT_CUT + CONT_L, y=0.0, rot=90, zone="East wing",
         parts=[("Lobby", 1500, 3.5), ("Tracking room", 8000, 18.8),
                ("Amp store", 2532, 6.0)],
         spec="Drums \u00b7 piano \u00b7 direct sightline",
         acoustics="Variable acoustics: hinged absorptive panels on two walls",
         services="Floor boxes to tracking positions; tie-line to C01"),
    dict(ref="C04", name="Beat lab", short="Beat lab",
         x=CONT_CUT, y=CONT_L - CONT_W, rot=0, zone="North wing",
         parts=[("Entry", 1200, 2.8), ("Production floor", 9600, 22.6),
                ("Mix corner", 1232, 2.9)],
         spec="DAW \u00b7 plugins \u00b7 mentored sessions",
         services="Nine workstations at full fit-out; six powered initially",
         acoustics="Absorptive ceiling clouds; no isolation required"),
]

# ---------------------------------------------------------------- structure
# One structural bay module repeats across the scheme.
BAY = 3000.0

# Every level is derived from the 2,896 mm high-cube or from the canopy above
# it. An earlier draft put the internal ceiling at +3.600, which cannot exist
# inside a container 2.896 m tall — the kind of error a schedule is supposed to
# prevent rather than contain.
LEVELS = [
    ("+6.500", "Photovoltaic array", "Tilted 10° on ballast frames above the roof"),
    ("+5.400", "Canopy top", "Slatted steel canopy, 300 mm deep, above the deck only"),
    ("+2.896", "Container roof", "High-cube top rail, the structural ceiling"),
    ("+2.698", "Internal clear height", "High-cube internal height, before lining"),
    ("+2.550", "Isolated ceiling", "Independent ceiling on hangers inside studios"),
    ("±0.000", "Finished floor", "Floating studio floor; deck sits 350 mm below"),
    ("−0.450", "Foundation underside", "Pad footings, 600 × 600, on compacted formation"),
]

# ---------------------------------------------------------------- areas
AREA_SCHEDULE = [
    ("C01", "Studio and control room", "28.3", "Isolated"),
    ("C02", "Live band module", "28.3", "Variable"),
    ("C03", "Vocal and voice booth", "28.3", "Isolated"),
    ("C04", "Beat lab", "28.3", "Treated"),
    ("", "Enclosed total", "113.2", ""),
    ("D", "Covered courtyard deck", "89.2", "Exterior"),
    ("", "Covered total", "202.4", ""),
]

# ---------------------------------------------------------------- accommodation
COURT_PROGRAMME = [
    ("Entry and step-free threshold", "South-west corner, 1:20 ramp"),
    ("Covered deck", "89.2 m², timber boards on adjustable pedestals"),
    ("Seating and rehearsal", "Informal; clears for performance"),
    ("Tree and planting bed", "One specimen tree, gravel bed"),
    ("Circulation", "1,500 mm clear route around the deck"),
]

# ---------------------------------------------------------------- materials
MATERIALS = [
    ("Container envelope", "Charcoal-black corrugated steel, factory finish",
     "Structural, weather-tight, ships complete"),
    ("Window reveals and sun blades", "Western red cedar, vertical grain",
     "Warmth against the steel; repairable"),
    ("Courtyard deck", "Thermally modified ash on pedestals",
     "External, drained, replaceable board by board"),
    ("Shade canopy", "Black powder-coated steel, cedar slats",
     "Reduces solar gain above glazing"),
    ("Glazing", "Double-glazed, laminated acoustic, cedar-framed",
     "Isolation where it matters, daylight where it does not"),
    ("Roof array", "Photovoltaic panels on ballast frames",
     "Daytime load; no roof penetrations"),
    ("Site surface", "Red murram, stabilised; gravel margins",
     "Local material, low cost, drains freely"),
]

# ---------------------------------------------------------------- build-up
# The acoustically critical assembly, stated as a number for the QS.
STUDIO_BUILDUP = [
    ("Structural floor", "Container steel deck", "—"),
    ("Isolation", "Mineral wool, 100 mm", "Resilient"),
    ("Floating slab", "Reinforced screed, 75 mm", "Mass"),
    ("Finish", "Engineered timber", "—"),
    ("Wall isolation", "Independent stud, 100 mm cavity", "Mass–spring–mass"),
    ("Acoustic lining", "50 mm absorber + fabric", "Absorption"),
    ("Ceiling", "Independent ceiling on hangers", "Decoupled"),
    ("Target", "Rw 60 dB between rooms; NR 25 background", "Performance"),
]

# ---------------------------------------------------------------- programme
STAGES = [
    ("Stage 1", "Site and foundations", "Weeks 1–6",
     "Site clearance, pad footings, service trench, deck sub-frame"),
    ("Stage 2", "Container delivery and setting", "Weeks 5–9",
     "Modules craned into position, welded and sealed at junctions"),
    ("Stage 3", "Envelope and canopy", "Weeks 8–14",
     "Glazing, cedar reveals, shade canopy, roof array"),
    ("Stage 4", "Acoustic fit-out", "Weeks 12–20",
     "Isolation, floating floors, linings, doors, ventilation silencers"),
    ("Stage 5", "Services and commissioning", "Weeks 18–24",
     "Power, data, HVAC balancing, acoustic testing, snagging"),
]

# ---------------------------------------------------------------- checks
# Values the drawing set must be able to prove. tools/check_design.py
# recomputes these rather than trusting the literals above.
TOLERANCE_M2 = 0.15
