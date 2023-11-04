// Each point supports multiple coordinates to draw to tempCanvas
// Each map has 25 sectors but 15 points
// Sectors without point are represented by null
// Coordinates are dependent on a 1920x1920 map image
// [x, y, w, h]
// How-to: Points were extracted using https://www.textcompare.org/image/
// comparing the map with a grid and points to the map with a grid and no points.
// Diff Type = 'Diff only'. Then noise/unnecessary bits removed around remaining points to reduce file size.
const POINT_COORDS = {
    Carentan: [
        [null, null, null, null, null],
        [[[241, 442, 155, 213]], [[487, 542, 225, 203]], [[892, 448, 227, 200]], [[1265, 500, 164, 210]], [[1507, 571, 177, 197]]],
        [[[227, 880, 163, 187]], [[620, 863, 149, 175]], [[862, 812, 215, 211]], [[1265, 762, 230, 212]], [[1575, 876, 217, 211]]],
        [[[176, 1180, 218, 210]], [[465, 1105, 215, 201]], [[828, 1088, 250, 215]], [[1163, 1312, 233, 209]], [[1500, 1186, 290, 216]]],
        [null, null, null, null, null]
    ],
    Driel: [
        [null, [[462, 46, 294, 245]], [[856, 63, 263, 215]], [[1212, 74, 276, 246]], null],
        [null, [[453, 476, 240, 257]], [[852, 429, 271, 241]], [[1192, 403, 251, 230]], null],
        [null, [[444, 874, 244, 232]], [[834, 741, 309, 307]], [[1257, 804, 243, 212]], null],
        [null, [[443, 1215, 241, 233]], [[842, 1207, 311, 269]], [[1242, 1191, 239, 223]], null],
        [null, [[442, 1556, 276, 265]], [[801, 1554, 270, 241]], [[1240, 1542, 239, 256]], null],
    ],
    ElAlamein: [
        [null, null, null, null, null],
        [[[195, 443, 232, 234]], [[498, 453, 214, 226]], [[874, 430, 254, 222]], [[1246, 455, 226, 251]], [[1511, 430, 229, 235]]],
        [[[167, 732, 243, 226]], [[511, 788, 179, 218]], [[792, 799, 270, 244]], [[1212, 776, 243, 221]], [[1525, 778, 261, 234]]],
        [[[84, 1147, 242, 245]], [[461, 1168, 228, 247]], [[836, 1124, 286, 276]], [[1186, 1062, 326, 308]], [[1592, 1191, 230, 261]]],
        [null, null, null, null, null]
    ],
    Foy: [
        [null, [[347, 123, 260, 136]], [[932, 114, 254, 151]], [[1213, 67, 235, 195]], null],
        [null, [[557, 390, 220, 27], [610, 421, 115, 159]], [[742, 508, 252, 152]], [[1271, 449, 265, 160]], null],
        [null, [[313, 696, 264, 192]], [[838, 857, 236, 156]], [[1264, 789, 270, 161]], null],
        [null, [[474, 1127, 213, 192]], [[938, 1219, 235, 161]], [[1280, 1103, 240, 163]], null],
        [null, [[304, 1446, 279, 168]], [[794, 1485, 218, 177]], [[1278, 1472, 255, 179]], null],
    ],
    Hill400: [
        [null, null, null, null, null],
        [[[230, 514, 190, 118]], [[468, 449, 239, 121]], [[889, 545, 150, 121]], [[1091, 468, 260, 123]], [[1458, 549, 257, 117]]],
        [[[220, 895, 242, 136]], [[524, 949, 271, 125]], [[837, 902, 220, 155]], [[1147, 833, 192, 125]], [[1639, 765, 169, 152]]],
        [[[253, 1285, 185, 116]], [[423, 1164, 275, 31], [526, 1195, 65, 97]], [[854, 1113, 222, 121]], [[1146, 1291, 248, 122]], [[1503, 1247, 263, 121]]],
        [null, null, null, null, null],
    ],
    HurtgenV2: [
        [null, null, null, null, null],
        [[[105, 386, 305, 168]], [[458, 497, 256, 176]], [[903, 369, 233, 157]], [[1282, 510, 222, 160]], [[1539, 469, 249, 156]]],
        [[[86, 859, 248, 162]], [[536, 839, 168, 195]], [[806, 885, 169, 130]], [[1214, 926, 203, 153]], [[1491, 903, 207, 154]]],
        [[[131, 1178, 187, 161]], [[448, 1082, 189, 167]], [[822, 1237, 197, 164]], [[1259, 1325, 172, 134]], [[1498, 1325, 152, 162]]],
        [null, null, null, null, null],
    ],
    Kharkov: [
        [null, [[523, 143, 160, 189]], [[910, 142, 252, 198]], [[1246, 148, 224, 189]], null],
        [null, [[492, 410, 210, 270]], [[957, 447, 177, 186]], [[1306, 430, 211, 185]], null],
        [null, [[522, 792, 170, 197]], [[930, 800, 175, 230]], [[1320, 783, 137, 191]], null],
        [null, [[608, 1220, 185, 174]], [[909, 1153, 257, 284]], [[1337, 1193, 154, 182]], null],
        [null, [[472, 1534, 260, 184]], [[921, 1518, 166, 196]], [[1285, 1511, 144, 185]], null],
    ],
    Kursk: [
        [null, [[469, 173, 308, 190]], [[949, 192, 145, 167]], [[1317, 198, 174, 169]], null],
        [null, [[534, 523, 177, 190]], [[863, 483, 218, 211]], [[1242, 468, 197, 222]], null],
        [null, [[608, 777, 184, 195]], [[980, 851, 139, 215]], [[1236, 906, 203, 177]], null],
        [null, [[639, 1204, 122, 194]], [[854, 1221, 194, 162]], [[1220, 1238, 248, 175]], null],
        [null, [[562, 1483, 189, 169]], [[865, 1461, 145, 182]], [[1189, 1450, 214, 193]], null],
    ],
    Omaha: [
        [null, null, null, null, null],
        [[[160, 485, 305, 183]], [[432, 362, 253, 25], [510, 393, 105, 150]], [[887, 422, 236, 183]], [[1387, 390, 222, 26], [1444, 422, 105, 150]], [[1549, 512, 149, 203]]],
        [[[202, 866, 264, 154]], [[464, 735, 268, 183]], [[807, 799, 247, 181]], [[1445, 780, 107, 157], [1552, 790, 8, 15], [1552, 781, 5, 9]], [[1560, 765, 194, 158], [1556, 765, 4, 25]]],
        [[[215, 1162, 178, 179]], [[408, 1107, 223, 155]], [[850, 1135, 270, 185]], [[1332, 1128, 172, 187]], [[1560, 1121, 198, 188]]],
        [null, null, null, null, null],
    ],
    PHL: [
        [null, [[345, 211, 181, 110]], [[835, 240, 247, 132]], [[1160, 232, 233, 128]], null],
        [null, [[445, 513, 204, 108]], [[836, 619, 197, 133]], [[1147, 522, 260, 129]], null],
        [null, [[482, 809, 205, 144]], [[823, 893, 270, 124]], [[1301, 837, 191, 126]], null],
        [null, [[522, 1159, 220, 134]], [[855, 1259, 249, 113]], [[1361, 1228, 165, 113]], null],
        [null, [[464, 1508, 254, 136]], [[849, 1486, 254, 119]], [[1302, 1571, 189, 103]], null],
    ],
    Remagen: [
        [null, [[449, 183, 252, 156]], [[818, 184, 254, 157]], [[1245, 186, 234, 163]], null],
        [null, [[477, 454, 219, 157]], [[928, 440, 250, 155]], [[1201, 454, 260, 160]], null],
        [null, [[457, 722, 268, 154]], [[884, 801, 203, 237]], [[1200, 990, 268, 164]], null],
        [null, [[510, 1218, 213, 156]], [[842, 1223, 227, 178]], [[1213, 1208, 237, 161]], null],
        [null, [[429, 1603, 270, 158]], [[881, 1527, 213, 158]], [[1192, 1501, 252, 155]], null],
    ],
    SMDMV2: [
        [null, [[432, 46, 260, 244]], [[824, 62, 260, 236]], [[1261, 74, 262, 265]], null],
        [null, [[449, 429, 267, 233]], [[859, 396, 252, 246]], [[1174, 407, 252, 252]], null],
        [null, [[481, 796, 252, 256]], [[858, 825, 244, 261]], [[1221, 828, 210, 215]], null],
        [null, [[493, 1191, 216, 240]], [[846, 1242, 215, 206]], [[1287, 1296, 257, 244]], null],
        [null, [[516, 1491, 213, 234]], [[843, 1572, 217, 216]], [[1235, 1593, 236, 199]], null],
    ],
    SME: [
        [null, null, null, null, null],
        [[[187, 473, 188, 131]], [[450, 502, 238, 130]], [[876, 423, 147, 129]], [[1211, 535, 256, 132]], [[1507, 590, 257, 130]]],
        [[[259, 836, 187, 120]], [[529, 724, 236, 137]], [[907, 795, 222, 139]], [[1143, 933, 188, 124]], [[1571, 891, 175, 123]]],
        [[[226, 1203, 172, 139]], [[489, 1280, 269, 128]], [[882, 1192, 171, 126]], [[1086, 1159, 250, 141]], [[1527, 1242, 262, 136]]],
        [null, null, null, null, null],
    ],
    Stalingrad: [
        [null, null, null, null, null],
        [[[175, 360, 308, 194]], [[517, 317, 251, 168]], [[822, 433, 244, 173]], [[1110, 415, 305, 171]], [[1507, 498, 219, 174]]],
        [[[182, 919, 263, 215]], [[469, 852, 188, 193]], [[908, 816, 221, 213]], [[1349, 830, 187, 164]], [[1547, 831, 179, 158]]],
        [[[227, 1296, 177, 215]], [[432, 1216, 250, 214]], [[847, 1148, 191, 210]], [[1290, 1258, 165, 161]], [[1522, 1253, 219, 176]]],
        [null, null, null, null, null],
    ],
    Utah: [
        [null, null, null, null, null],
        [[[234, 368, 187, 124]], [[547, 399, 234, 124]], [[934, 446, 150, 148]], [[1179, 433, 258, 152]], [[1517, 425, 127, 117]]],
        [[[221, 833, 188, 128]], [[547, 870, 269, 127]], [[957, 794, 219, 119]], [[1211, 851, 189, 122]], [[1499, 903, 176, 119]]],
        [[[186, 1378, 290, 123]], [[487, 1253, 270, 155]], [[877, 1335, 170, 155]], [[1362, 1295, 140, 120]], [[1512, 1300, 189, 124]]],
        [null, null, null, null, null],
    ],
}

const secTop = 383
const secLeft = 0
const width = 1920
const height = 1151
const sectWidth = width / 5
const SECTOR_COORDS = [
    { // 0-5
        a: {top: secTop, left: secLeft, width: 0, height: 0, visible: false},
        b: {top: secTop, left: secLeft, width: width, height: height, visible: true}
    },
    { // 1-4
        a: {top: secTop, left: secLeft, width: sectWidth, height: height, visible: true},
        b: {top: secTop, left: secLeft + width - sectWidth*4, width: sectWidth*4, height: height, visible: true}
    },
    { // 2-3
        a: {top: secTop, left: secLeft, width: sectWidth*2, height: height, visible: true},
        b: {top: secTop, left: secLeft + width - sectWidth*3, width: sectWidth*3, height: height, visible: true}
    },
    { // 2-2
        a: {top: secTop, left: secLeft, width: sectWidth*2, height: height, visible: true},
        b: {top: secTop, left: secLeft + width - sectWidth*2, width: sectWidth*2, height: height, visible: true}
    },
    { // 3-2
        a: {top: secTop, left: secLeft, width: sectWidth*3, height: height, visible: true},
        b: {top: secTop, left: secLeft + width - sectWidth*2, width: sectWidth*2, height: height, visible: true}
    },
    { // 4-1
        a: {top: secTop, left: secLeft, width: sectWidth*4, height: height, visible: true},
        b: {top: secTop, left: secLeft + width - sectWidth, width: sectWidth, height: height, visible: true}
    },
    { // 5-0
        a: {top: secTop, left: secLeft, width: width, height: height, visible: true},
        b: {top: secTop, left: secLeft, width: 0, height: 0, visible: false}
    }
];

const skTop = 288
const skLeft = 288
const skWidth = 1344
const skSectWidth = skWidth / 5
const SKIRMISH_SECTOR_COORDS = [
    { // 0-5
        a: {top: skTop, left: skLeft, width: 0, height: 0, visible: false},
        b: {top: skTop, left: skLeft, width: skWidth, height: skWidth, visible: true}
    },
    { // 1-4
        a: {top: skTop, left: skLeft, width: skSectWidth, height: skWidth, visible: true},
        b: {top: skTop, left: skLeft + skWidth - skSectWidth*4, width: skSectWidth*4, height: skWidth, visible: true}
    },
    { // 2-3
        a: {top: skTop, left: skLeft, width: skSectWidth*2, height: skWidth, visible: true},
        b: {top: skTop, left: skLeft + skWidth - skSectWidth*3, width: skSectWidth*3, height: skWidth, visible: true}
    },
    { // 2-2
        a: {top: skTop, left: skLeft, width: skSectWidth*2, height: skWidth, visible: true},
        b: {top: skTop, left: skLeft + skWidth - skSectWidth*2, width: skSectWidth*2, height: skWidth, visible: true}
    },
    { // 3-2
        a: {top: skTop, left: skLeft, width: skSectWidth*3, height: skWidth, visible: true},
        b: {top: skTop, left: skLeft + skWidth - skSectWidth*2, width: skSectWidth*2, height: skWidth, visible: true}
    },
    { // 4-1
        a: {top: skTop, left: skLeft, width: skSectWidth*4, height: skWidth, visible: true},
        b: {top: skTop, left: skLeft + skWidth - skSectWidth, width: skSectWidth, height: skWidth, visible: true}
    },
    { // 5-0
        a: {top: skTop, left: skLeft, width: skWidth, height: skWidth, visible: true},
        b: {top: skTop, left: skLeft, width: 0, height: 0, visible: false}
    }
];

const ARTY_CLIP = {
    vertical: {
        y: 0, x: 383, w: 1151, h: 1920
    },
    horizontal: {
        y: 383, x: 0, w: 1920, h: 1151
    }
}
const ARTY_CENTER = {
    Carentan: {
        a: {
            top: 915.6430400911386,
            left: 43.19027413642311,
        },
        b: {
            top: 0,
            left: 0,
        }
    }
}

const DEFAULT_ELEMENTS = {
    Carentan: {
        offensive_garrisons: {
            b: [
                {
                    left: 610.3061929930886,
                    top: 665.7134931467936,
                },
                {
                    left: 692.5135915350602,
                    top: 992.164506097723,
                },
                {
                    left: 558.4028528683068,
                    top: 1265.865950190976,
                }
            ],
            a: [
                {
                    left: 1320.4463312758144,
                    top: 633.5462495747582,
                },
                {
                    left: 1340.9452448448803,
                    top: 947.6760371518862,
                },
                {
                    left: 1217.6959815780795,
                    top: 1462.1068407110774,
                }
            ]
        },
        artillery: {
            a: [
                {
                    angle: -180,
                    left: 32.77779320316495,
                    top: 902.1373528738991,
                },
                {
                    angle: -180,
                    left: 32.677793203164924,
                    top: 909.7373528738991,
                },
                {
                    angle: -180,
                    left: 32.677793203164924,
                    top: 917.3373528738991,
                }
            ],
            b: [
                {
                    angle: 0,
                    left: 1882.6325050443393,
                    top: 948.4975222641257,
                },
                {
                    angle: 0,
                    left: 1882.6325050443393,
                    top: 956.6975222641257,
                },
                {
                    angle: 0,
                    left: 1882.6325050443393,
                    top: 964.9975222641257,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 91.3477316868997,
                    left: 44.73706795380156,
                    top: 574.882417942008,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 93.95301729520999,
                    left: 39.56208899455976,
                    top: 975.578192951018,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 82.11525790874393,
                    left: 46.265271168604045,
                    top: 1430.8115103159337,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -137.41884541559253,
                    left: 1886.7778757167507,
                    top: 594.5710745420979,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: -101.05542044594691,
                    left: 1868.8583714026208,
                    top: 1006.3664324127533,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -91.65632360977936,
                    left: 1895.5981258998463,
                    top: 1305.7205046944416,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 91.44701089616983,
                    left: 46.694428070914796,
                    top: 613.3445418454547,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 64.03978734160204,
                    left: 42.14780334194154,
                    top: 952.7879407893656,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 95.02184363085983,
                    left: 41.64148127478654,
                    top: 964.1954376879874,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 69.9629207794586,
                    left: 43.0973536881711,
                    top: 1423.3611211426048,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -139.09235923781662,
                    left: 1859.1484201131673,
                    top: 586.3971969948261,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -96.94062652867657,
                    left: 1864.1992215589307,
                    top: 968.1549625982924,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -131.12988907440774,
                    left: 1864.7992215589309,
                    top: 951.0549625982924,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 357.67314576051814,
                    left: 1871.9006320933645,
                    top: 1318.5200476658688,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 91.93141805296064,
                    left: 46.37097160331405,
                    top: 587.7408833176943,
                },
                {
                    type: 'command_spawn',
                    angle: 94.50136219301972,
                    left: 33.57272685375801,
                    top: 927.8010134584243,
                },
                {
                    type: 'command_spawn',
                    angle: 86.26265728314539,
                    left: 61.88166785042722,
                    top: 1457.6658932162118,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: -109.28019460710622,
                    left: 1878.8129257190553,
                    top: 624.8755190936007,
                },
                {
                    type: 'command_spawn',
                    angle: -102.56860993734159,
                    left: 1853.5902488316024,
                    top: 1008.868565122795,
                },
                {
                    type: 'command_spawn',
                    angle: 306.29544105538616,
                    left: 1890.0037096548697,
                    top: 1316.4482787391541,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 44.24138602847654,
                    top: 569.5933000102397,
                },
                {
                    type: "repair-station",
                    left: 37.44631087957271,
                    top: 957.0669379930998,
                },
                {
                    type: "repair-station",
                    left: 51.495721686238426,
                    top: 1436.5468496520273,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 1877.5806165272297,
                    top: 617.2992599567114,
                },
                {
                    type: "repair-station",
                    left: 1828.7536127349888,
                    top: 1042.8367539645344,
                },
                {
                    type: "repair-station",
                    left: 1887.3847400188226,
                    top: 1327.5586975239821,
                }
            ]
        }
    },
    Driel: {
        offensive_garrisons: {
            b: [
                {
                    left: 581.5819684537664,
                    top: 642.0700418548921,
                },
                {
                    left: 1010.8363201132386,
                    top: 572.1102916511416,
                },
                {
                    left: 1313.9624549645357,
                    top: 569.6007212957317,
                }
            ],
            a: [
                {
                    left: 549.6911854747588,
                    top: 1322.9256323713266,
                },
                {
                    left: 997.572192497684,
                    top: 1353.9913001811083,
                },
                {
                    left: 1395.6199651609152,
                    top: 1302.5669415582654,
                }
            ]
        },
        artillery: {
            a: [
                {
                    angle: -90,
                    left: 835.8565463923373,
                    top: 142.1133882527016,
                },
                {
                    angle: -90,
                    left: 818.2835011174226,
                    top: 143.7355155088477,
                },
                {
                    angle: -90,
                    left: 804.3602421688362,
                    top: 143.05962915212012,
                }
            ],
            b: [
                {
                    angle: 90,
                    left: 877.1758296251685,
                    top: 1809.2806303232433,
                },
                {
                    angle: 90,
                    left: 899.3758296251685,
                    top: 1805.6806303232431,
                },
                {
                    angle: 90,
                    left: 915.0758296251685,
                    top: 1800.8806303232434,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -174.41275603579547,
                    left: 565.8826544101267,
                    top: 107.59599914495823,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 50.319577653756134,
                    left: 918.9131852139652,
                    top: 51.70506166963071,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -136.15376038350328,
                    left: 1333.990652280673,
                    top: 83.01810692051049,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 17.217688989643076,
                    left: 556.4311960281003,
                    top: 1864.8663400904038,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 89.24583331076306,
                    left: 947.8355909616391,
                    top: 1877.6096414341025,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 0,
                    height: 0,
                    left: 1364.869446203436,
                    top: 1843.085519743683,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -176.24807560689274,
                    left: 572.2618241023364,
                    top: 113.92970596105351,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -158.2401091871876,
                    left: 837.0160165532981,
                    top: 63.70427020806392,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -116.0436479062157,
                    left: 850.9160165532979,
                    top: 54.20427020806392,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -93.45331625053102,
                    left: 1332.6687750179412,
                    top: 117.26297998817495,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -39.82161892167265,
                    left: 567.4778960581777,
                    top: 1861.1139328963122,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 0,
                    left: 970.9667776324741,
                    top: 1862.0227901361225,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -5.821107368673751,
                    left: 981.4667776324741,
                    top: 1879.5227901361225,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 7.553998821349439,
                    left: 1347.979858314077,
                    top: 1852.5427151914992,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 146.03946424176485,
                    left: 545.8286145496834,
                    top: 106.29801560009378,
                },
                {
                    type: 'command_spawn',
                    angle: -178.46565850029916,
                    left: 925.4422809646765,
                    top: 29.748789365621974,
                },
                {
                    type: 'command_spawn',
                    angle: 153.01976928177757,
                    left: 1289.1963358253267,
                    top: 106.84057833688621,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: -99.91908621898324,
                    left: 568.1409935590614,
                    top: 1845.54393122572,
                },
                {
                    type: 'command_spawn',
                    angle: 35.58145652382451,
                    left: 970.2818773495205,
                    top: 1875.946447089837,
                },
                {
                    type: 'command_spawn',
                    angle: 298.66395711028156,
                    left: 1358.1118591304592,
                    top: 1831.4074599198643,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 559.1088632511224,
                    top: 104.95243143528523,
                },
                {
                    type: "repair-station",
                    left: 920.3100383641196,
                    top: 36.77820403813837,
                },
                {
                    type: "repair-station",
                    left: 1321.315945756827,
                    top: 75.81024474913863,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 575.0785253319639,
                    top: 1869.6193142527807,
                },
                {
                    type: "repair-station",
                    left: 909.0629929714294,
                    top: 1874.8234987784688,
                },
                {
                    type: "repair-station",
                    left: 1351.7911366557878,
                    top: 1846.112509791298,
                }
            ]
        }
    },
    ElAlamein: {
        offensive_garrisons: {
            b: [
                {
                    left: 578.0782727856734,
                    top: 638.2485654813744,
                },
                {
                    left: 560.4093730813706,
                    top: 910.8450675360835,
                },
                {
                    left: 569.4889896175974,
                    top: 1328.4233675114085,
                }
            ],
            a: [
                {
                    left: 1414.6811544552459,
                    top: 627.7658147993465,
                },
                {
                    left: 1464.9420308380434,
                    top: 871.8530356658617,
                },
                {
                    left: 1355.9675102028018,
                    top: 1322.03608994633,
                }
            ]
        },
        artillery: {
            a: [
                {
                    angle: -180,
                    left: 49.06550940406407,
                    top: 865.6637678941502,
                },
                {
                    angle: -180,
                    left: 79.25783473326624,
                    top: 899.9782926225423,
                },
                {
                    angle: -180,
                    left: 69.67650640001386,
                    top: 928.1652236494359,
                }
            ],
            b: [
                {
                    angle: 0,
                    left: 1826.1472066065853,
                    top: 829.6937326625432,
                },
                {
                    angle: 0,
                    left: 1837.7633269007372,
                    top: 865.3718164231527,
                },
                {
                    angle: 0,
                    left: 1845.9222685359155,
                    top: 892.3378099631484,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 85.96786320932605,
                    left: 56.746152105664805,
                    top: 541.1279084381547,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 44.74464301917378,
                    left: 46.77587088171754,
                    top: 1043.5201837546917,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 144.22009759137887,
                    left: 42.64338002412569,
                    top: 1368.5518500715173,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -156.50081290899703,
                    left: 1856.7791519590585,
                    top: 574.2905073944572,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 1.0088629557469915,
                    left: 1896.0535978800392,
                    top: 987.33712856858,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 246.49042682341832,
                    left: 1893.3709513331917,
                    top: 1284.6589824102375,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 88.01567706664827,
                    left: 58.446823890133146,
                    top: 545.0823537603475,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 43.7057652848961,
                    left: 34.561842541850865,
                    top: 1040.6517232460549,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 43.46565850029902,
                    left: 39.57532829762238,
                    top: 1045.442387412681,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 118.23191825866354,
                    left: 33.65176786878908,
                    top: 1377.588244110708,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -139.6835440698802,
                    left: 1849.6552595690896,
                    top: 559.7161879871082,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 4.081157724220531,
                    left: 1892.8478090479832,
                    top: 983.450105146075,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 10.691580000820627,
                    left: 1889.0929833342248,
                    top: 979.0569415905981,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 243.34512539396798,
                    left: 1894.7434544608598,
                    top: 1267.711399294356,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 132.468405754327,
                    left: 61.11647104199801,
                    top: 553.457814334635,
                },
                {
                    type: 'command_spawn',
                    angle: 40.81158767159614,
                    left: 28.680484901416662,
                    top: 1043.0471195260775,
                },
                {
                    type: 'command_spawn',
                    angle: 138.76184952178565,
                    left: 49.01960126723645,
                    top: 1361.1213032497637,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: -139.230612603144,
                    left: 1854.1394539098812,
                    top: 564.4237070153113,
                },
                {
                    type: 'command_spawn',
                    angle: -48.82242341882762,
                    left: 1886.4321361410057,
                    top: 938.0753377861755,
                },
                {
                    type: 'command_spawn',
                    angle: 235.22983678711088,
                    left: 1894.8442612100068,
                    top: 1274.2216469042773,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 85.37699659503107,
                    top: 547.1260922713749,
                },
                {
                    type: "repair-station",
                    left: 40.69707908901762,
                    top: 1053.6223503725594,
                },
                {
                    type: "repair-station",
                    left: 49.139013559874684,
                    top: 1399.3095356587776,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 1860.265002539316,
                    top: 565.6890898666771,
                },
                {
                    type: "repair-station",
                    left: 1879.3914251800998,
                    top: 947.6627856806729,
                },
                {
                    type: "repair-station",
                    left: 1879.410876822781,
                    top: 1262.4962304053156,
                }
            ]
        }
    },
    Foy: {
        offensive_garrisons: {
            b: [{
                left: 593.7066373682393,
                top: 506.11522150589315,
            }, {
                left: 831.7872099386085,
                top: 651.693862304615,
            }, {
                left: 1406.807628829673,
                top: 595.4509783949038,
            }],
            a: [{
                left: 600.7386043744374,
                top: 1209.727596089861,
            }, {
                left: 1062.6632956105327,
                top: 1279.6780173261188,
            }, {
                left: 1387.5373717104715,
                top: 1217.7419783171554,
            }],
        },
        artillery: {
            a: [
                {
                    angle: -90,
                    left: 1019.7800102324829,
                    top: 50.78836817531169,
                },
                {
                    angle: -90,
                    left: 1031.9800102324828,
                    top: 50.8883681753116,
                },
                {
                    angle: -90,
                    left: 1044.480010232483,
                    top: 50.68836817531155,
                }
            ],
            b: [
                {
                    angle: 90 + 24,
                    left: 1095.9507770119187,
                    top: 1885.094081171562,
                },
                {
                    angle: 90 + 16,
                    left: 1104.9507770119187,
                    top: 1890.094081171562,
                },
                {
                    angle: 90,
                    left: 1112.3507770119188,
                    top: 1891.194081171562,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 164.76111633765893,
                    left: 572.0871429754776,
                    top: 67.36730146881746,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: -158.64480182863895,
                    left: 1092.586074117587,
                    top: 35.57702971428421,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -138.0493407440871,
                    left: 1400.5235284052924,
                    top: 49.66307421366173,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 90.66758327836433,
                    left: 507.6504637137908,
                    top: 1805.2398212296632,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 62.48803584371121,
                    left: 1133.4043055605637,
                    top: 1863.7425399771073,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 24.588953280206088,
                    left: 1396.660925389123,
                    top: 1856.027985072562,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -177.83588702709582,
                    left: 601.1511518058454,
                    top: 77.09752990402569,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 123.16958691447014,
                    left: 1108.2182319867504,
                    top: 70.86309133921054,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 135.00000000000014,
                    left: 1072.0097237506225,
                    top: 45.35001938206176,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 90.40348473505858,
                    left: 1380.795701499438,
                    top: 54.32624207999527,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 0,
                    left: 517.7038215287103,
                    top: 1810.6017960319568,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -102.45815943482926,
                    left: 1153.5744492789827,
                    top: 1851.013103690628,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -10.077673241270597,
                    left: 1148.237132265635,
                    top: 1868.5145385483502,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 89.55516320997027,
                    left: 1408.5249005045537,
                    top: 1847.2233591573174,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 118.94384105822962,
                    left: 618.3078641352985,
                    top: 82.8552047426524,
                },
                {
                    type: 'command_spawn',
                    angle: -150.135677041782,
                    left: 1096.5194206898939,
                    top: 57.49470020943636,
                },
                {
                    type: 'command_spawn',
                    angle: -154.53822617064995,
                    left: 1418.7974749892653,
                    top: 58.71571585214372,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: 0,
                    left: 512.3668829497765,
                    top: 1810.4324706263026,
                },
                {
                    type: 'command_spawn',
                    angle: 59.92681298449279,
                    left: 1138.2685713401886,
                    top: 1872.3371244044138,
                },
                {
                    type: 'command_spawn',
                    angle: 35.11047916464417,
                    left: 1416.709235961701,
                    top: 1854.3778772986482,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 576.9154581992817,
                    top: 64.59745302689521,
                },
                {
                    type: "repair-station",
                    left: 1094.161530190594,
                    top: 50.18629606536638,
                },
                {
                    type: "repair-station",
                    left: 1425.3439683631452,
                    top: 64.48052705706732,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 522.7637477130559,
                    top: 1806.4538249152065,
                },
                {
                    type: "repair-station",
                    left: 1123.5018217110635,
                    top: 1872.5184986347663,
                },
                {
                    type: "repair-station",
                    left: 1403.6897433749668,
                    top: 1842.2147332632571,
                }
            ]
        }
    },
    Hill400: {
        offensive_garrisons: {
            b: [{
                left: 548.8835873928836,
                top: 513.9377869431116,
            }, {
                left: 623.718492722973,
                top: 1061.292106914717,
            }, {
                left: 553.9336631092619,
                top: 1258.60265747598,
            }],
            a: [{
                left: 1214.546750751503,
                top: 603.8340328595239,
            }, {
                left: 1225.6176371700399,
                top: 943.6911797611253,
            }, {
                left: 1278.6198960320878,
                top: 1406.4154148647604,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + 72.14670156360836,
                    left: 57.78706327581767,
                    top: 1052.347198144725,
                },
                {
                    angle: 90 + 81.19185562759407,
                    left: 62.08706327581763,
                    top: 1070.0471981447251,
                },
                {
                    angle: 90 + 83.94519284824884,
                    left: 62.48706327581772,
                    top: 1084.647198144725,
                }
            ],
            b: [
                {
                    angle: 90 + -63.81783894778318,
                    left: 1820.4079343791036,
                    top: 1011.821472426736,
                },
                {
                    angle: 90 + -88.10741539536805,
                    left: 1816.2593199883354,
                    top: 1022.8844441354522,
                },
                {
                    angle: 90 + -96.05957943216032,
                    left: 1813.2170027684383,
                    top: 1036.4365844786296,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 165.696287552047,
                    left: 45.9121101478147,
                    top: 694.2098485889335,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 172.62374597891514,
                    left: 35.12025284571246,
                    top: 1107.7091908892376,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 23.32538736155645,
                    left: 37.610756899454145,
                    top: 1450.1815344149206,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -79.95466963050328,
                    left: 1857.1079325873943,
                    top: 478.43396446502913,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 166.0716580608467,
                    left: 1848.5106481439275,
                    top: 807.1251719402377,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -169.25203639398623,
                    left: 1878.0285708296585,
                    top: 1252.687657597611,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 9.452140558371,
                    left: 52.97798865387119,
                    top: 712.176503393695,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 80.47622242014887,
                    left: 40.13937688893418,
                    top: 1154.7910364742652,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 164.26718240972173,
                    left: 48.51130508369522,
                    top: 1141.5658165723962,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 25.252956311000652,
                    left: 50.91093494404231,
                    top: 1417.3981809100912,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -84.26004212059094,
                    left: 1838.9956905764463,
                    top: 488.85013237045956,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -136.0470148521518,
                    left: 1872.0814035722178,
                    top: 809.3024867506261,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -63.9480913165392,
                    left: 1842.7055818623664,
                    top: 794.4198987887903,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 182.61872716732324,
                    left: 1872.626826628628,
                    top: 1252.178716364413,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 162.5720715023124,
                    left: 39.90793046681779,
                    top: 696.8786673680761,
                },
                {
                    type: 'command_spawn',
                    angle: 146.30993247402003,
                    left: 33.42125144537874,
                    top: 1132.0675689879508,
                },
                {
                    type: 'command_spawn',
                    angle: 24.30875597877441,
                    left: 57.350898126505854,
                    top: 1403.2951352427147,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: -107.24358063287231,
                    left: 1858.9963821588703,
                    top: 470.32281056259717,
                },
                {
                    type: 'command_spawn',
                    angle: -55.17551084304337,
                    left: 1832.013095574024,
                    top: 770.0105091859,
                },
                {
                    type: 'command_spawn',
                    angle: 222.2540498634971,
                    left: 1887.705226770251,
                    top: 1256.4897059444743,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 55.141745480870895,
                    top: 747.2166371920578,
                },
                {
                    type: "repair-station",
                    left: 43.82914818569384,
                    top: 1146.8388189485827,
                },
                {
                    type: "repair-station",
                    left: 68.19598768053538,
                    top: 1400.57595041105,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 1863.5572455017577,
                    top: 484.2215674550764,
                },
                {
                    type: "repair-station",
                    left: 1855.601498274452,
                    top: 811.9566128207101,
                },
                {
                    type: "repair-station",
                    left: 1879.2807635510585,
                    top: 1270.2275925886358,
                }
            ]
        }
    },
    HurtgenV2: {
        offensive_garrisons: {
            b: [{
                left: 558.9263293971011,
                top: 518.7233837443395,
            }, {
                left: 616.7195718760454,
                top: 1056.5559239226573,
            }, {
                left: 561.7491077157383,
                top: 1236.5790320414535,
            }],
            a: [{
                left: 1163.797539990732,
                top: 714.4910135159308,
            }, {
                left: 1290.5444430304422,
                top: 1060.5267958982383,
            }, {
                left: 1241.4926341975402,
                top: 1482.5901194146095,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + 86.1810669150313,
                    left: 68.41624818441596,
                    top: 911.7875454327146,
                },
                {
                    angle: 90 + 85.52072226405954,
                    left: 53.716248184416145,
                    top: 921.3875454327147,
                },
                {
                    angle: 90 + 80.45759988532613,
                    left: 67.61624818441601,
                    top: 932.1875454327146,
                }
            ],
            b: [
                {
                    angle: 90 + -90.34936017950248,
                    left: 1842.4658177558804,
                    top: 1061.015443859615,
                },
                {
                    angle: 90 + -91.70397278770182,
                    left: 1842.76581775588,
                    top: 1068.415443859615,
                },
                {
                    angle: 90 + -91.71149329665816,
                    left: 1842.36581775588,
                    top: 1076.115443859615,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 37.75135912205744,
                    left: 39.112783546979244,
                    top: 662.4899369308209,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 79.27061285894038,
                    left: 79.47915466066843,
                    top: 895.2891235064232,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 23.392518159017527,
                    left: 170.38572514129794,
                    top: 1359.1864341236223,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -57.24427136605548,
                    left: 1851.0456544399544,
                    top: 541.4266261356162,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: -110.3828618697037,
                    left: 1862.803897904312,
                    top: 1011.2408546169488,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -77.34263373803849,
                    left: 1817.3533315337543,
                    top: 1529.6071058185626,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 40.965010170966224,
                    left: 33.94569811397662,
                    top: 655.8970842501411,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 166.05752032763516,
                    left: 80.97178883773256,
                    top: 912.0908038401728,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 78.09203465555414,
                    left: 76.84958943854258,
                    top: 940.1663240724938,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 89.25270612317406,
                    left: 159.87919996091875,
                    top: 1347.7802330877757,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -130.06078445787386,
                    left: 1855.310653140165,
                    top: 560.394967032916,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 179.64632684075306,
                    left: 1825.6944581121745,
                    top: 1008.727180666802,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -7.520225563382284,
                    left: 1807.9944581121745,
                    top: 1026.627180666802,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 2.6187015253694734,
                    left: 1771.5795421593903,
                    top: 1522.0941817635705,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 41.12385115925832,
                    left: 53.152774839265135,
                    top: 641.2841949920736,
                },
                {
                    type: 'command_spawn',
                    angle: 72.24222249115391,
                    left: 65.4008066419425,
                    top: 900.1099740403483,
                },
                {
                    type: 'command_spawn',
                    angle: 120.63311679218175,
                    left: 73.29614826174134,
                    top: 1154.1925435283963,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: -126.70556278980024,
                    left: 1862.752338078943,
                    top: 548.0135456149632,
                },
                {
                    type: 'command_spawn',
                    angle: -104.73075712745099,
                    left: 1862.8720729850645,
                    top: 1001.3605926180447,
                },
                {
                    type: 'command_spawn',
                    angle: 246.83071678789457,
                    left: 1844.7047762657771,
                    top: 1527.2402477101682,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 21.28336115515731,
                    top: 653.3703312828172,
                },
                {
                    type: "repair-station",
                    left: 78.16116334654748,
                    top: 921.6020107722309,
                },
                {
                    type: "repair-station",
                    left: 60.34505588703314,
                    top: 1156.5732479633716,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 1869.9666229420945,
                    top: 558.0367220043719,
                },
                {
                    type: "repair-station",
                    left: 1851.3218834122738,
                    top: 999.8213406142585,
                },
                {
                    type: "repair-station",
                    left: 1846.2528607309498,
                    top: 1530.309682354749,
                }
            ]
        }
    },
    Kharkov: {
        offensive_garrisons: {
            b: [{
                "left": 669.6185756397789,
                "top": 394.39684064934636,
            }, {
                left: 1078.6282435106996,
                top: 387.64621235281936,
            }, {
                "left": 1475.8283435970607,
                "top": 447.41145047586826,
            }],
            a: [{
                left: 550.8090069088673,
                top: 1514.834904848913,
            }, {
                "left": 1033.9933843528615,
                "top": 1518.2647727546514,
            }, {
                "left": 1327.938915007912,
                "top": 1500.155003454819,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + -163.2453206348014,
                    left: 1013.7594569439375,
                    top: 43.88471566372019,
                },
                {
                    angle: 90 + -179.8673753815414,
                    left: 1021.8887205533432,
                    top: 49.34466883421656,
                },
                {
                    angle: 90 + 179.4201565760737,
                    left: 1031.8379685529144,
                    top: 52.13531156580359,
                }
            ],
            b: [
                {
                    angle: 90,
                    left: 925.9629394248217,
                    top: 1836.483856555195,
                },
                {
                    angle: 90 + 8.549076820418563,
                    left: 944.150129413807,
                    top: 1839.4243004456298,
                },
                {
                    angle: 90 + 24.75154263791195,
                    left: 962.0106034149661,
                    top: 1846.176430860702,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 30.963756532073432,
                    left: 581.4863039652736,
                    top: 72.07492940344501,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: -116.40441406836119,
                    left: 1050.6393415438383,
                    top: 37.35784558974126,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -173.7686261664744,
                    left: 1348.816732157774,
                    top: 53.60409738553429,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 115.91501537460107,
                    left: 490.9975182841538,
                    top: 1838.4126619644885,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 40.23412481691448,
                    left: 996.3888914882565,
                    top: 1881.0056490582729,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 0,
                    left: 1406.6374160979742,
                    top: 1909.722251299826,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 46.73570458892852,
                    left: 575.8333325906431,
                    top: 67.1725998267533,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -132.8731728298483,
                    left: 1047.5677599643313,
                    top: 33.21259430808186,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -157.89025673220073,
                    left: 1036.0237950611431,
                    top: 31.03448772257468,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -173.6887894248669,
                    left: 1354.7404629214861,
                    top: 55.36800908795567,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 144.824948881988,
                    left: 508.01511377069704,
                    top: 1841.894230559296,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 38.24290245549405,
                    left: 1001.6042409026277,
                    top: 1885.0348033545108,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 56.40655258397235,
                    left: 992.1163103611016,
                    top: 1876.6010873175987,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 0,
                    left: 1400.2033661245166,
                    top: 1909.6781313067786,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 16.2905470240868,
                    left: 589.010518525377,
                    top: 75.02039406958863,
                },
                {
                    type: 'command_spawn',
                    angle: -144.83257736109027,
                    left: 1043.2492500462624,
                    top: 29.51561803222694,
                },
                {
                    type: 'command_spawn',
                    angle: 179.07225460615842,
                    left: 1363.2200062570348,
                    top: 56.4734670484379,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: 108.40907289399884,
                    left: 485.9698121374584,
                    top: 1846.8537164088639,
                },
                {
                    type: 'command_spawn',
                    angle: 63.76197774583298,
                    left: 990.1313826489572,
                    top: 1871.6437757539334,
                },
                {
                    type: 'command_spawn',
                    angle: 0,
                    left: 1393.4674200417332,
                    top: 1908.243853005852,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 599.2630067292481,
                    top: 58.83632205726167,
                },
                {
                    type: "repair-station",
                    left: 1023.2161782120354,
                    top: 38.777319206877564,
                },
                {
                    type: "repair-station",
                    left: 1358.675680016905,
                    top: 74.55490301569648,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 532.858692614044,
                    top: 1876.8300182125024,
                },
                {
                    type: "repair-station",
                    left: 1010.7869134349389,
                    top: 1871.3470576030804,
                },
                {
                    type: "repair-station",
                    left: 1382.9698536995277,
                    top: 1892.33533679535,
                }
            ]
        }
    },
    Kursk: {
        offensive_garrisons: {
            b: [{
                left: 646.3034393199134,
                top: 468.1061472987303,
            }, {
                "left": 1004.1959163886096,
                "top": 418.95623076525203,
            }, {
                "left": 1433.2459847161422,
                "top": 397.39002585022837,
            }],
            a: [{
                left: 699.6472965227365,
                top: 1441.816560077191,
            }, {
                left: 961.4131136361863,
                top: 1428.5808169814256,
            }, {
                left: 1278.6877198117184,
                top: 1463.2618947088772,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + 177.75182324255198,
                    left: 998.1474143731344,
                    top: 70.69413255577729,
                },
                {
                    angle: 90 + 178.2882138274526,
                    left: 1007.4474143731344,
                    top: 71.7941325557772,
                },
                {
                    angle: 90 + 179.11634046036502,
                    left: 1014.2474143731345,
                    top: 74.3941325557771,
                }
            ],
            b: [
                {
                    angle: 90 + -12.538450284167514,
                    left: 944.456746582096,
                    top: 1841.2105160421079,
                },
                {
                    angle: 90,
                    left: 954.456746582096,
                    top: 1843.7105160421079,
                },
                {
                    angle: 90 + -2.857479743932422,
                    left: 963.6567465820959,
                    top: 1849.110516042108,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 41.26749461518763,
                    left: 601.3413171131266,
                    top: 122.13326650238582,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 160.1546947859669,
                    left: 1046.241746981094,
                    top: 120.50313665255749,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -23.441299704095528,
                    left: 1336.1337973952652,
                    top: 83.72553565961562,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 25.032951141366386,
                    left: 502.68568857036144,
                    top: 1751.275611659462,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: -101.18869067523248,
                    left: 985.3444879048131,
                    top: 1807.580158292316,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 145.3561996007353,
                    left: 1482.4929043471802,
                    top: 1838.4269524986366,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 40.75982975293591,
                    left: 605.3679602418566,
                    top: 126.40119409344084,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 135.325540698659,
                    left: 1031.2139982270678,
                    top: 117.59688807290638,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 129.2254196275558,
                    left: 1031.6596414053586,
                    top: 124.39294654184107,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -20.664329710080548,
                    left: 1340.9650520359555,
                    top: 83.28697350758614,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 23.733779149385803,
                    left: 491.76299337809525,
                    top: 1760.388997312142,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -97.74913757193217,
                    left: 986.7839261294536,
                    top: 1817.763802288201,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -101.07020257793951,
                    left: 986.3382829511628,
                    top: 1814.1986568618747,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 144.84777404647033,
                    left: 1472.2118077124499,
                    top: 1849.3526920067952,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: -28.96295311112556,
                    left: 588.2572588404653,
                    top: 116.55356131336544,
                },
                {
                    type: 'command_spawn',
                    angle: 162.61549078054836,
                    left: 1039.6332069499406,
                    top: 116.56184679310286,
                },
                {
                    type: 'command_spawn',
                    angle: -25.401354886264134,
                    left: 1346.7660957914836,
                    top: 80.95726035883058,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: 23.20332266358351,
                    left: 496.8390495183032,
                    top: 1767.7913592993684,
                },
                {
                    type: 'command_spawn',
                    angle: -101.1989659642548,
                    left: 982.2143172129796,
                    top: 1803.623894163156,
                },
                {
                    type: 'command_spawn',
                    angle: 141.36474214855144,
                    left: 1477.1354401161036,
                    top: 1844.0088368083584,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 591.8325670068309,
                    top: 120.13157285657553,
                },
                {
                    type: "repair-station",
                    left: 1039.7820264635998,
                    top: 132.80001058866264,
                },
                {
                    type: "repair-station",
                    left: 1322.70296476033,
                    top: 83.50600646723524,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 476.8830647543664,
                    top: 1764.702501061702,
                },
                {
                    type: "repair-station",
                    left: 960.635104356473,
                    top: 1814.0170886256703,
                },
                {
                    type: "repair-station",
                    left: 1517.232975751724,
                    top: 1794.1458330053697,
                }
            ]
        }
    },
    Omaha: {
        offensive_garrisons: {
            b: [{
                left: 400.6747439049691,
                top: 658.6820864368391,
            }, {
                left: 395.5878627964098,
                top: 938.2882875244136,
            }, {
                left: 400.3760963227386,
                top: 1276.3912640853614,
            }],
            a: [{
                left: 1496.786482033171,
                top: 522.8595175426852,
            }, {
                left: 1487.4327717501412,
                top: 884.783252049595,
            }, {
                left: 1369.177405663355,
                top: 1306.2537723874445,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + 90.7199629238523,
                    left: 51.36212362493325,
                    top: 953.5015259603488,
                },
                {
                    angle: 90 + 90.58000957298064,
                    left: 52.56212362493329,
                    top: 976.7015259603488,
                },
                {
                    angle: 90 + 87.79943183824689,
                    left: 55.462123624933156,
                    top: 1000.6015259603488,
                }
            ],
            b: [
                {
                    angle: 90 + -90.60031556198521,
                    left: 1720.1259738636688,
                    top: 1051.7788792954689,
                },
                {
                    angle: 90 + -90.46771026003864,
                    left: 1713.4259738636688,
                    top: 1025.478879295469,
                },
                {
                    angle: 90 + -89.55778840995039,
                    left: 1727.1259738636688,
                    top: 994.4788792954689,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 81.35737998540208,
                    left: 100.70012071282417,
                    top: 501.4628293912033,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 106.78366242802201,
                    left: 93.12945981852681,
                    top: 923.4843721145218,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 141.18488352423105,
                    left: 34.2604000298511,
                    top: 1270.517699881395,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -112.00600971828736,
                    left: 1754.673270411141,
                    top: 525.0244538063303,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: -104.0607889185667,
                    left: 1800.4613049772595,
                    top: 968.6255973777438,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -97.21725524884643,
                    left: 1834.4183793456118,
                    top: 1370.1059378454688,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 84.71373009830002,
                    left: 83.58079032198077,
                    top: 504.8812584996116,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 44.198712669893055,
                    left: 83.8564761929606,
                    top: 874.8863842574635,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 85.64373636725517,
                    left: 112.14445066952487,
                    top: 936.4008107053837,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 104.6499041058129,
                    left: 43.46538363125967,
                    top: 1264.40783284043,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -102.16891432990909,
                    left: 1750.7272912377348,
                    top: 532.4659845338875,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -94.20286030853282,
                    left: 1817.8950766641588,
                    top: 971.9244854206742,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -102.15355166217458,
                    left: 1824.5950766641588,
                    top: 964.0244854206742,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 269.98688783770365,
                    left: 1842.6464035250026,
                    top: 1376.1045300106766,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 44.82768701273851,
                    left: 100.61724814128922,
                    top: 527.6509416287323,
                },
                {
                    type: 'command_spawn',
                    angle: 59.939469971429766,
                    left: 92.22725176895176,
                    top: 941.923953160949,
                },
                {
                    type: 'command_spawn',
                    angle: 84.83669318562634,
                    left: 44.51851684608505,
                    top: 1255.9753774754267,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: -75.67816939438532,
                    left: 1757.9124780721882,
                    top: 577.1937187237584,
                },
                {
                    type: 'command_spawn',
                    angle: -84.93851381719301,
                    left: 1820.0356587817173,
                    top: 1013.8535622096022,
                },
                {
                    type: 'command_spawn',
                    angle: 273.6913859864512,
                    left: 1836.2125287597655,
                    top: 1407.6546999767977,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 85.76307373372356,
                    top: 525.4342279478655,
                },
                {
                    type: "repair-station",
                    left: 106.97403156102655,
                    top: 910.243974263869,
                },
                {
                    type: "repair-station",
                    left: 59.72243595792179,
                    top: 1291.145165724478,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 1723.9733132498413,
                    top: 602.2256720224249,
                },
                {
                    type: "repair-station",
                    left: 1727.6121358448293,
                    top: 1022.1367151221132,
                },
                {
                    type: "repair-station",
                    left: 1736.0530981786396,
                    top: 1409.8388496135924,
                }
            ]
        }
    },
    PHL: {
        offensive_garrisons: {
            b: [{
                left: 564.2804116720569,
                top: 617.2107680948488,
            }, {
                left: 924.232690836028,
                top: 672.6644064196074,
            }, {
                left: 1308.3295889312337,
                top: 640.3991679328561,
            }],
            a: [{
                left: 651.52201651546,
                top: 1213.6926526534166,
            }, {
                left: 931.2418621942348,
                top: 1236.2473083537523,
            }, {
                left: 1490.180228327335,
                top: 1184.3740867363424,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + 178.79122311484397,
                    left: 946.767018646629,
                    top: 72.22313518342457,
                },
                {
                    angle: 90 + -177.5409560098952,
                    left: 972.4670186466291,
                    top: 61.42313518342462,
                },
                {
                    angle: 90 + -175.8038879689478,
                    left: 974.4670186466291,
                    top: 84.62313518342467,
                }
            ],
            b: [
                {
                    angle: 90 + -2.981931003845377,
                    left: 974.3210596660612,
                    top: 1854.1884117489303,
                },
                {
                    angle: 90 + -11.39919292907754,
                    left: 966.530395499435,
                    top: 1833.6070828885154,
                },
                {
                    angle: 90 + 3.5541782355320586,
                    left: 976.530395499435,
                    top: 1832.2070828885157,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 161.95607943995216,
                    left: 400.266572275728,
                    top: 110.38145405776322,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 173.5159887607056,
                    left: 994.605382682642,
                    top: 70.607140172752,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 106.77180449425015,
                    left: 1411.9567534101884,
                    top: 115.63911924332501,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -115.3848130324084,
                    left: 602.5307970599742,
                    top: 1862.4192338500388,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 0,
                    left: 972.1485152162373,
                    top: 1879.7018857558933,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 71.48074222670766,
                    left: 1449.4402024312749,
                    top: 1860.7889802207505,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 166.81703484145913,
                    left: 428.67576850399195,
                    top: 118.27488818387928,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 10.619655276155152,
                    left: 995.1314854659136,
                    top: 91.98180139866508,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 66.66115082034663,
                    left: 988.1615443922905,
                    top: 84.24952302011457,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -167.9853261826255,
                    left: 1430.044388916395,
                    top: 135.37282388030894,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -21.588167736379678,
                    left: 580.8116757931315,
                    top: 1871.9412813444555,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 0,
                    left: 980.0079258790529,
                    top: 1881.465576881987,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -3.6044205391755617,
                    left: 996.2729496645263,
                    top: 1875.592096070566,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 340.66969928092215,
                    left: 1455.7112137689146,
                    top: 1820.7338224338278,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 145.16999953413955,
                    left: 438.94092509514326,
                    top: 114.54362838413783,
                },
                {
                    type: 'command_spawn',
                    angle: -178.3192969560009,
                    left: 1002.0923758121804,
                    top: 69.10821809072809,
                },
                {
                    type: 'command_spawn',
                    angle: -164.35216745742565,
                    left: 1406.7939904785537,
                    top: 100.12824113572117,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: -24.087452308632066,
                    left: 605.2738078006969,
                    top: 1840.8506429953445,
                },
                {
                    type: 'command_spawn',
                    angle: 0,
                    left: 965.2788156967935,
                    top: 1879.3378053858657,
                },
                {
                    type: 'command_spawn',
                    angle: 347.0432262527247,
                    left: 1460.4679568255308,
                    top: 1869.2433990144405,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 417.58612760087215,
                    top: 117.96314093991577,
                },
                {
                    type: "repair-station",
                    left: 989.3804424013139,
                    top: 70.1227851869453,
                },
                {
                    type: "repair-station",
                    left: 1411.2807091774046,
                    top: 109.94350625328343,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 585.5815583264207,
                    top: 1853.0973560842917,
                },
                {
                    type: "repair-station",
                    left: 992.2553214399043,
                    top: 1847.179921853253,
                },
                {
                    type: "repair-station",
                    left: 1458.066327515252,
                    top: 1841.7022072461473,
                }
            ]
        }
    },
    Remagen: {
        offensive_garrisons: {
            b: [{
                left: 541.970705965027,
                top: 548.4011110051025,
            }, {
                left: 1005.6183945642236,
                top: 510.54125339546067,
            }, {
                left: 1306.5320135443317,
                top: 558.7441747890902,
            }],
            a: [{
                left: 639.3372874073724,
                top: 1331.84245337665,
            }, {
                left: 976.5623716238357,
                top: 1370.9982062628374,
            }, {
                left: 1326.2198367535632,
                top: 1308.1574046714572,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + 178.6104980686066,
                    left: 1097.7948583338662,
                    top: 47.941434588064794,
                },
                {
                    angle: 90 + 178.2642954110715,
                    left: 1117.694858333866,
                    top: 47.5414345880647,
                },
                {
                    angle: 90 + 178.49256424122527,
                    left: 1133.0762078285895,
                    top: 50.24085569649583,
                }
            ],
            b: [
                {
                    angle: 90,
                    left: 914.2160401556964,
                    top: 1821.8317230665452,
                },
                {
                    angle: 90,
                    left: 924.8581576015839,
                    top: 1822.0033701221241,
                },
                {
                    angle: 90,
                    left: 933.4405103805254,
                    top: 1821.4884289553875,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 156.94869908352717,
                    left: 513.0327835422004,
                    top: 119.31820346492509,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 139.5085832482216,
                    left: 987.7711228574699,
                    top: 87.55335604623065,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -150.1675150864663,
                    left: 1368.1163032118263,
                    top: 103.16719848503658,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 22.845944134724334,
                    left: 545.8229258626245,
                    top: 1887.7901124118337,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 36.822298504575905,
                    left: 894.4901350471333,
                    top: 1888.3996539492898,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -89.08228822248292,
                    left: 1317.278892738219,
                    top: 1859.3507395379872,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -138.5035316447844,
                    left: 531.2635505676541,
                    top: 123.48895253349201,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 135.69187711676378,
                    left: 982.2272227423663,
                    top: 91.65355730204578,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 136.65913067959008,
                    left: 978.7272227423663,
                    top: 94.05355730204587,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 90.83820464799358,
                    left: 1351.4870024345807,
                    top: 108.48470756006168,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -10.247609988951924,
                    left: 554.2846839557619,
                    top: 1890.5834529849508,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 38.76896258016885,
                    left: 884.4029776279933,
                    top: 1880.7538253043203,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 42.94538206701722,
                    left: 889.2438000354484,
                    top: 1884.9740294544094,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 271.88559977077955,
                    left: 1321.0224387420685,
                    top: 1867.0892166202755,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: -174.16568387460822,
                    left: 523.4421325237706,
                    top: 117.41791731207184,
                },
                {
                    type: 'command_spawn',
                    angle: 152.16968191448566,
                    left: 993.0832266983324,
                    top: 83.18842629779681,
                },
                {
                    type: 'command_spawn',
                    angle: 112.75422385055045,
                    left: 1346.38644951585,
                    top: 100.40319064442883,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: 33.742679617513474,
                    left: 543.1686688952786,
                    top: 1880.3044902922063,
                },
                {
                    type: 'command_spawn',
                    angle: 39.44117159611407,
                    left: 902.2629418889654,
                    top: 1894.5077056422074,
                },
                {
                    type: 'command_spawn',
                    angle: 321.49352531253913,
                    left: 1322.3778171733295,
                    top: 1880.5686622830526,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 525.6193792197618,
                    top: 140.73556517902375,
                },
                {
                    type: "repair-station",
                    left: 983.9137300523998,
                    top: 70.00599658818987,
                },
                {
                    type: "repair-station",
                    left: 1338.008564970854,
                    top: 97.04129163694233,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 557.4916472152013,
                    top: 1874.8436791403203,
                },
                {
                    type: "repair-station",
                    left: 920.3451486515112,
                    top: 1902.1947220006466,
                },
                {
                    type: "repair-station",
                    left: 1337.9693135825028,
                    top: 1890.819621764862,
                }
            ]
        }
    },
    SMDMV2: {
        offensive_garrisons: {
            b: [{
                left: 604.1772014360806,
                top: 632.0584877094112,
            }, {
                left: 988.7076346467054,
                top: 622.1476316153112,
            }, {
                left: 1241.7237267332455,
                top: 586.8160845442972,
            }],
            a: [{
                left: 574.6863283602031,
                top: 1282.7132519909553,
            }, {
                left: 971.9164583571204,
                top: 1342.056190715454,
            }, {
                left: 1373.1855387005423,
                top: 1226.3915539631598,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + 172.38925541363972,
                    left: 968.6749408617358,
                    top: 36.23460147754872,
                },
                {
                    angle: 90 + 178.1766670638066,
                    left: 977.5749408617357,
                    top: 34.23460147754872,
                },
                {
                    angle: 90 + 167.88655994481553,
                    left: 997.3749408617357,
                    top: 37.03460147754879,
                }
            ],
            b: [
                {
                    angle: 90 + -13.507838875272816,
                    left: 889.8104977403696,
                    top: 1887.1993507556415,
                },
                {
                    angle: 90,
                    left: 903.1104977403695,
                    top: 1883.4993507556414,
                },
                {
                    angle: 90,
                    left: 919.2104977403695,
                    top: 1878.9993507556414,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -162.98146068719203,
                    left: 573.2803687745223,
                    top: 81.88329112895053,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 147.62936885889988,
                    left: 1004.307958813305,
                    top: 16.54310343900795,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 169.97918608105937,
                    left: 1379.608496681928,
                    top: 13.887409570131695,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 64.6758185980528,
                    left: 509.3996449686727,
                    top: 1854.487851067406,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: -36.383000489658,
                    left: 947.5044223228354,
                    top: 1884.0033509372156,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 7.125016348901892,
                    left: 1427.6255964380491,
                    top: 1863.7109033857857,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 173.92687104335985,
                    left: 562.8475252311456,
                    top: 81.88719716338494,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -169.3652390612597,
                    left: 1020.172909333919,
                    top: 21.380426350000334,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -123.91094299904732,
                    left: 962.343112192139,
                    top: 22.422195233939306,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 145.33699897914707,
                    left: 1371.0392170584125,
                    top: 20.099602518043184,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 64.28533500825634,
                    left: 498.4045637112871,
                    top: 1852.4398213781594,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -54.815424522640285,
                    left: 939.8160084546072,
                    top: 1860.5300129556604,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 113.59925376944052,
                    left: 915.011252277989,
                    top: 1858.3730776359546,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 356.73339519781604,
                    left: 1421.6461204545915,
                    top: 1861.9666174392357,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 167.72991253227022,
                    left: 542.9189376193481,
                    top: 82.97232459617089,
                },
                {
                    type: 'command_spawn',
                    angle: -137.39033824862804,
                    left: 951.2672511963724,
                    top: 20.374181174310024,
                },
                {
                    type: 'command_spawn',
                    angle: 177.68155037765615,
                    left: 1351.2957541886803,
                    top: 34.93718587484523,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: 88.81170521829435,
                    left: 497.7128005966073,
                    top: 1843.6125903445093,
                },
                {
                    type: 'command_spawn',
                    angle: 62.27891687238773,
                    left: 938.4208021392747,
                    top: 1904.3392358434987,
                },
                {
                    type: 'command_spawn',
                    angle: 2.0169717752165375,
                    left: 1416.8253804565772,
                    top: 1863.3251263465172,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 533.0120089006402,
                    top: 99.51941052732093,
                },
                {
                    type: "repair-station",
                    left: 976.195676956489,
                    top: 21.619601525853568,
                },
                {
                    type: "repair-station",
                    left: 1364.1306023297466,
                    top: 32.99369138087843,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 510.0877153532758,
                    top: 1862.4345701810098,
                },
                {
                    type: "repair-station",
                    left: 943.52404805048,
                    top: 1871.3741818712151,
                },
                {
                    type: "repair-station",
                    left: 1470.1012980311566,
                    top: 1848.9524054196447,
                }
            ]
        }
    },
    SME: {
        offensive_garrisons: {
            b: [{
                left: 621.4942210412511,
                top: 539.2105415382305,
            }, {
                left: 676.2893286832336,
                top: 775.1753359132257,
            }, {
                left: 655.0646865790467,
                top: 1335.0402738872099,
            }],
            a: [{
                left: 1339.0558547939365,
                top: 677.321882262922,
            }, {
                left: 1313.787753060037,
                top: 1015.3868926903962,
            }, {
                left: 1383.5038579761538,
                top: 1368.3137214302246,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + 89.1384159131859,
                    left: 39.15335653209422,
                    top: 962.0352706837417,
                },
                {
                    angle: 90 + 88.90923720471895,
                    left: 39.25335653209413,
                    top: 969.6352706837419,
                },
                {
                    angle: 90 + 89.45451479982808,
                    left: 39.65335653209422,
                    top: 977.5352706837418,
                }
            ],
            b: [
                {
                    angle: 90 + -89.1003049588986,
                    left: 1849.6011982778396,
                    top: 934.7233832166992,
                },
                {
                    angle: 90 + -88.28196455718513,
                    left: 1849.7394854241984,
                    top: 949.796682169825,
                },
                {
                    angle: 90 + -91.00676166341471,
                    left: 1850.5692083023523,
                    top: 966.5294268792582,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 103.50159206727457,
                    left: 32.178338185159646,
                    top: 635.5315096865586,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 93.2795961817013,
                    left: 35.45872412643189,
                    top: 990.1330900172934,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 72.572313631006,
                    left: 78.07272253573296,
                    top: 1436.1439362698645,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -104.3745006422254,
                    left: 1878.1874770928393,
                    top: 600.3771438037373,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: -76.45113798571886,
                    left: 1810.804622169655,
                    top: 939.56287807887,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -61.1093841971327,
                    left: 1859.5624166066232,
                    top: 1332.5931850210357,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -178.71251082243936,
                    left: 72.9781249651104,
                    top: 609.4469620805633,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 3.4572120873669245,
                    left: 77.50921086617518,
                    top: 971.3708373603006,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 68.12265796805916,
                    left: 71.70115071909925,
                    top: 957.1272612853286,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 129.2034728252286,
                    left: 79.42535182040251,
                    top: 1420.957390664401,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -90.41114459858446,
                    left: 1875.7387043808833,
                    top: 594.1066021698138,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -88.34570809359272,
                    left: 1827.9829578345268,
                    top: 947.7842514543831,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -115.27466446290305,
                    left: 1831.4584200757768,
                    top: 963.7962024944268,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 300.2852464337742,
                    left: 1831.5282175961222,
                    top: 1355.6816527211704,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 101.82517329518315,
                    left: 56.156172359237644,
                    top: 628.2128196813013,
                },
                {
                    type: 'command_spawn',
                    angle: 60.54134548942644,
                    left: 64.95810967496038,
                    top: 968.7825078443719,
                },
                {
                    type: 'command_spawn',
                    angle: 65.65749871462852,
                    left: 59.00720685155852,
                    top: 1394.608273590909,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: -105.62423458118707,
                    left: 1869.746640614754,
                    top: 584.66377307699,
                },
                {
                    type: 'command_spawn',
                    angle: -88.37117505947428,
                    left: 1833.2945473953177,
                    top: 973.5597616661748,
                },
                {
                    type: 'command_spawn',
                    angle: 300.25643716352926,
                    left: 1820.8828700160327,
                    top: 1340.8300554193281,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 43.93274562567058,
                    top: 626.1279837341498,
                },
                {
                    type: "repair-station",
                    left: 31.21261562627842,
                    top: 998.4375690972233,
                },
                {
                    type: "repair-station",
                    left: 77.58402681555913,
                    top: 1426.178722765503,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 1842.8104672254685,
                    top: 602.2827258900272,
                },
                {
                    type: "repair-station",
                    left: 1810.0328713549059,
                    top: 950.7352175756732,
                },
                {
                    type: "repair-station",
                    left: 1834.4693211205924,
                    top: 1337.4353022510463,
                }
            ]
        }
    },
    Stalingrad: {
        offensive_garrisons: {
            b: [{
                left: 515.4129287946967,
                top: 470.0844847094793,
            }, {
                left: 452.31598830584096,
                top: 1063.2276936655737,
            }, {
                left: 466.36353632964347,
                top: 1465.0055855156406,
            }],
            a: [{
                left: 1514.3628889881509,
                top: 1307.2944674419896,
            }, {
                left: 1497.2601103974425,
                top: 964.0680594070415,
            }, {
                left: 1490.5228591111681,
                top: 557.0878077602131,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + 81.1250210372633,
                    left: 50.31175986768335,
                    top: 985.5141102945313,
                },
                {
                    angle: 90 + 90.19322050372888,
                    left: 55.24189774129695,
                    top: 997.3772545529138,
                },
                {
                    angle: 90 + 91.19973623812113,
                    left: 56.012231784048936,
                    top: 1016.3274720046159,
                }
            ],
            b: [
                {
                    angle: 90 + -88.21008939175395,
                    left: 1714.8296821440172,
                    top: 990.2589644095341,
                },
                {
                    angle: 90 + -89.55585556688844,
                    left: 1718.148573656632,
                    top: 1001.875084703686,
                },
                {
                    angle: 90 + -90.81795913748074,
                    left: 1716.3508407539657,
                    top: 1014.1826407296326,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 165.06858282186263,
                    left: 88.62453418678729,
                    top: 482.59735278152584,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 105.23111544534522,
                    left: 78.26402113268296,
                    top: 1025.4756255431628,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 19.769482271369704,
                    left: 67.91468485945757,
                    top: 1457.490832235965,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -41.76315320117487,
                    left: 1820.5320098744924,
                    top: 652.8853444026578,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 179.17565717915582,
                    left: 1840.56490695214,
                    top: 1136.4235530735662,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 0,
                    left: 1838.6025728307745,
                    top: 1390.724326620603,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 11.309932474020261,
                    left: 71.32289204084839,
                    top: 520.1072472847231,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 105.02704004728626,
                    left: 64.07915399081264,
                    top: 1059.6469655859512,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 103.15034120202117,
                    left: 75.66587662637346,
                    top: 1065.217505314586,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 108.44900568709359,
                    left: 58.83531328030665,
                    top: 1430.1814419490447,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -137.70345895423105,
                    left: 1828.6305551029413,
                    top: 598.2226061905956,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 179.5613100679413,
                    left: 1842.495945004234,
                    top: 1121.1434391445046,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 178.66265948764087,
                    left: 1834.1401354112816,
                    top: 1120.8092067607865,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 4.8372629537916,
                    left: 1832.6560300809133,
                    top: 1390.8898158854622,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 82.40917456833323,
                    left: 54.314527656494306,
                    top: 499.1431754298411,
                },
                {
                    type: 'command_spawn',
                    angle: 112.77101800681466,
                    left: 57.778447103988924,
                    top: 1034.7339011913423,
                },
                {
                    type: 'command_spawn',
                    angle: 19.02706737210041,
                    left: 60.06320444188452,
                    top: 1486.0694735213028,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: -86.23596513509428,
                    left: 1825.9568487329577,
                    top: 631.926724427765,
                },
                {
                    type: 'command_spawn',
                    angle: -91.11782458238612,
                    left: 1731.3045712663422,
                    top: 1042.3707935430702,
                },
                {
                    type: 'command_spawn',
                    angle: 3.2877994258192618,
                    left: 1832.2404261724564,
                    top: 1402.9189023771294,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 79.57239910189469,
                    top: 509.95700522326547,
                },
                {
                    type: "repair-station",
                    left: 74.09855205322287,
                    top: 1080.028839454355,
                },
                {
                    type: "repair-station",
                    left: 68.21907544768283,
                    top: 1439.4959912418158,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 1827.2588567942316,
                    top: 624.5128974914171,
                },
                {
                    type: "repair-station",
                    left: 1832.504117635046,
                    top: 1154.3254962328483,
                },
                {
                    type: "repair-station",
                    left: 1835.6034489055694,
                    top: 1427.5617802044285,
                }
            ]
        }
    },
    Utah: {
        offensive_garrisons: {
            b: [{
                left: 541.05816992896,
                top: 491.44992996282576,
            }, {
                left: 517.3999618282696,
                top: 962.6874560566607,
            }, {
                left: 455.5978606778001,
                top: 1449.3461697443067,
            }],
            a: [{
                left: 1474.3118288468704,
                top: 532.9574511511574,
            }, {
                left: 1501.067984302025,
                top: 962.8674204777628,
            }, {
                left: 1367.1676580614362,
                top: 1335.7218509804313,
            }],
        },
        artillery: {
            a: [
                {
                    angle: 90 + 91.50034704676037,
                    left: 72.61270592630422,
                    top: 942.3552738417815,
                },
                {
                    angle: 90 + 90.76076942486122,
                    left: 72.26585451173992,
                    top: 952.5318481344993,
                },
                {
                    angle: 90 + 92.25617018214749,
                    left: 72.2190030971758,
                    top: 962.5552738417815,
                }
            ],
            b: [
                {
                    angle: 90 + -91.35876410933122,
                    left: 1713.7738243593149,
                    top: 986.0792587091989,
                },
                {
                    angle: 90 + -91.32843008249813,
                    left: 1717.3692901646477,
                    top: 1005.5777463458112,
                },
                {
                    angle: 90 + -91.24752810560759,
                    left: 1712.9441014811614,
                    top: 1023.693362518834,
                }
            ]
        },
        tank: {
            a: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: 90.59770659870023,
                    left: 179.4783881155729,
                    top: 488.66449521051743,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: 91.93084862803414,
                    left: 104.00980415659706,
                    top: 956.2872085644741,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: 68.83150564712679,
                    left: 213.23606679515126,
                    top: 1490.493209946578,
                }
            ],
            b: [
                {
                    type: 'tank',
                    modifier: 'light',
                    angle: -90,
                    left: 1768.381221968707,
                    top: 579.7076801167702,
                },
                {
                    type: 'tank',
                    modifier: 'med',
                    angle: -93.30117339403652,
                    left: 1745.786705283329,
                    top: 1019.9951683154272,
                },
                {
                    type: 'tank',
                    modifier: 'recon',
                    angle: -92.06513204160525,
                    left: 1754.6934959544183,
                    top: 1420.967986130489,
                }
            ]
        },
        truck: {
            a: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 89.27170304692352,
                    left: 192.37470854117532,
                    top: 504.3941746212634,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 94.85366812161178,
                    left: 92.70106677139665,
                    top: 913.108478583896,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: 93.41742630623362,
                    left: 108.98124903588518,
                    top: 983.4612459207194,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 80.36424585753622,
                    left: 206.09837248133056,
                    top: 1455.2098337433051,
                },
            ],
            b: [
                {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -107.25002595142922,
                    left: 1733.683728249832,
                    top: 570.5297550268971,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: -93.632107246396,
                    left: 1749.0746233933714,
                    top: 1035.247638310906,
                }, {
                    type: 'truck',
                    modifier: 'supply',
                    angle: -92.88883308500563,
                    left: 1766.4519345996205,
                    top: 1041.9503154904592,
                }, {
                    type: 'truck',
                    modifier: 'transport',
                    angle: 300.6997225508145,
                    left: 1707.7920742042515,
                    top: 1424.8392418234912,
                },
            ]
        },
        command_spawn: {
            a: [
                {
                    type: 'command_spawn',
                    angle: 91.7979318569006,
                    left: 170.0536063685156,
                    top: 479.49508330011287,
                },
                {
                    type: 'command_spawn',
                    angle: 91.07082445478694,
                    left: 108.81904717869145,
                    top: 926.2763138362645,
                },
                {
                    type: 'command_spawn',
                    angle: 89.31884052636003,
                    left: 207.5595030262217,
                    top: 1445.808177594751,
                }
            ],
            b: [
                {
                    type: 'command_spawn',
                    angle: -89.6775879207441,
                    left: 1756.9272216084883,
                    top: 573.2607180708392,
                },
                {
                    type: 'command_spawn',
                    angle: -89.55412744806753,
                    left: 1732.9412876680688,
                    top: 1042.972084519783,
                },
                {
                    type: 'command_spawn',
                    angle: 272.21610009958374,
                    left: 1725.6506208695641,
                    top: 1417.1841081982514,
                }
            ]
        },
        repair_stations: {
            a: [
                {
                    type: "repair-station",
                    left: 145.87291846542382,
                    top: 487.3795321162653,
                },
                {
                    type: "repair-station",
                    left: 95.14506628090248,
                    top: 960.6801245520786,
                },
                {
                    type: "repair-station",
                    left: 205.55057248175785,
                    top: 1477.0953855052553,
                }
            ],
            b: [
                {
                    type: "repair-station",
                    left: 1725.4558025777446,
                    top: 590.2579635581868,
                },
                {
                    type: "repair-station",
                    left: 1728.3028564960307,
                    top: 1009.542622034208,
                },
                {
                    type: "repair-station",
                    left: 1714.4584446363,
                    top: 1425.798948935551,
                }
            ]
        }
    }
}
