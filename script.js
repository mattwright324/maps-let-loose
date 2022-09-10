const mll = (function () {
    'use strict';

    const elements = {};
    const controls = {};

    let currentLoadedPoints = '';
    let contextMenuEvent;
    let placed = [];
    let drawings = [];

    const zIndex = {
        map: 0,
        grid: 1,
        points: 2,
        sectors: 3,
        arty_range: 5,
        default_garrisons: 6,
        drawings: 7,
        garry: 8,
        airhead: 9,
        halftrack: 9,
        tank: 9,
        truck: 9,
        'at-gun': 9,
        enemy: 9,
    }
    const placedMeta = {
        garry: {
            wh: 380,
            resolveImg: function (object) {
                const sectorBred = controls.checkSectorSwap.is(":checked");
                const sectorsVisible = controls.checkSectors.is(":checked");
                const radiusHidden = controls.checkGarryRadius.is(":checked");
                const objectX = object.left + object.width / 2;
                const objectY = object.top + object.height / 2;

                if (radiusHidden) {
                    return './maps/garry-plain.png';
                } else if (sectorsVisible &&
                    (!sectorBred && rectContainsPoint(elements.sectorA, objectX, objectY) ||
                        sectorBred && rectContainsPoint(elements.sectorB, objectX, objectY))) {
                    return './maps/garry-red-zone.png';
                } else if (sectorsVisible &&
                    (sectorBred && rectContainsPoint(elements.sectorA, objectX, objectY) ||
                        !sectorBred && rectContainsPoint(elements.sectorB, objectX, objectY))) {
                    return './maps/garry-blue-zone.png';
                } else if (sectorsVisible) {
                    return './maps/garry-invalid.png';
                }

                return './maps/garry-blue-zone.png';
            }
        },
        airhead: {
            wh: 122,
            resolveImg: function (object) {
                const radiusHidden = controls.checkGarryRadius.is(":checked");
                return './maps/airhead-' + (radiusHidden ? 'plain' : 'radius') + '.png'
            }
        },
        halftrack: {
            wh: 122,
            resolveImg: function (object) {
                const radiusHidden = controls.checkGarryRadius.is(":checked");
                return './maps/halftrack-' + (radiusHidden ? 'plain' : 'radius') + '.png'
            },
            controlsVisibility: {mtr: true}
        },
        outpost: {
            wh: 122,
            resolveImg: function (object) {
                const radiusHidden = controls.checkGarryRadius.is(":checked");
                return './maps/outpost-' + object.modifier + "-" + (radiusHidden ? 'plain' : 'radius') + '.png'
            },
        },
        tank: {
            wh: 51,
            resolveImg: function (object) {
                if (object.modifier) {
                    return './maps/tank-' + object.modifier + ".png";
                }

                return './maps/tank-med.png'
            },
            controlsVisibility: {mtr: true}
        },
        truck: {
            wh: 51,
            resolveImg: function (object) {
                if (object.modifier) {
                    return './maps/truck-' + object.modifier + ".png";
                }

                return './maps/truck-supply.png'
            },
            controlsVisibility: {mtr: true}
        },
        'at-gun': {
            wh: 51,
            resolveImg: function (object) {
                return './maps/at-gun-plain.png'
            },
            controlsVisibility: {mtr: true}
        },
        enemy: {
            wh: 51,
            resolveImg: function (object) {
                return './maps/enemy-' + object.modifier + '.png'
            }
        }
    }
    const elementSizes = {
        garry: 380,
        airhead: 122,
        halftrack: 122,
        tank: 51,
        'at-gun': 51,
        'enemy-garry': 51,
        'enemy-infantry': 51,
    }

    function fixSpawnSelectBoxes() {
        const sel = new fabric.ActiveSelection(placed, {canvas: controls.fabricCanvas});
        controls.fabricCanvas.setActiveObject(sel).requestRenderAll();
        controls.fabricCanvas.discardActiveObject(sel).requestRenderAll();
    }

    fabric.Canvas.prototype.orderObjects = function (compare) {
        this._objects.sort(compare);
        this.renderAll();
    }
    fabric.Canvas.prototype.orderByZindex = function () {
        this.orderObjects((a, b) => (a.zIndex > b.zIndex) ? 1 : -1);
    }

    const rotateIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' style='stroke:white;stroke-width:1px;' class='bi bi-arrow-clockwise' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z'/%3E%3Cpath d='M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z'/%3E%3C/svg%3E";
    const rotateImg = document.createElement('img');
    rotateImg.src = rotateIcon;

    fabric.Object.prototype.controls.mtr = new fabric.Control({
        x: 0,
        y: -0.5,
        offsetY: -40,
        cursorStyle: 'crosshair',
        actionHandler: fabric.controlsUtils.rotationWithSnapping,
        actionName: 'rotate',
        render: renderIcon,
        cornerSize: 24,
        withConnection: true
    });

    function renderIcon(ctx, left, top, styleOverride, fabricObject) {
        const size = this.cornerSize;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
        ctx.drawImage(rotateImg, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    // Each point supports multiple coordinates to draw to tempCanvas
    // Each map has 25 sectors but 15 points
    // Sectors without point are represented by null
    // Coordinates are dependent on a 1920x1920 map image
    // [x, y, w, h]
    // How-to: Points were extracted using https://www.textcompare.org/image/
    // comparing the map with a grid and points to the map with a grid and no points.
    // Diff Type = 'Diff only'. Then noise/unnecessary bits removed around remaining points to reduce file size.
    const pointCoords = {
        Carentan: [
            [null, null, null, null, null],
            [[[238, 467, 189, 167]], [[498, 561, 235, 168]], [[909, 467, 219, 170]], [[1227, 516, 255, 170]], [[1482, 593, 252, 170]]],
            [[[206, 889, 185, 171]], [[653, 890, 111, 128]], [[862, 837, 220, 170]], [[1296, 784, 188, 172]], [[1581, 901, 221, 171]]],
            [[[213, 1207, 172, 171]], [[449, 1124, 268, 170]], [[878, 1111, 169, 171]], [[1166, 1349, 251, 152]], [[1511, 1214, 263, 172]]],
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
            [null, [[433, 80, 307, 192]], [[815, 109, 256, 166]], [[1313, 119, 149, 196]], null],
            [null, [[469, 453, 234, 191]], [[880, 438, 220, 187]], [[1170, 452, 264, 194]], null],
            [null, [[514, 828, 185, 195]], [[888, 850, 174, 205]], [[1215, 851, 206, 179]], null],
            [null, [[504, 1198, 199, 194]], [[863, 1260, 171, 164]], [[1281, 1317, 251, 194]], null],
            [null, [[538, 1501, 190, 182]], [[888, 1580, 145, 173]], [[1229, 1594, 217, 170]], null],
        ],
        SME: [
            [null, null, null, null, null],
            [[[187, 473, 188, 131]], [[450, 502, 238, 130]], [[876, 423, 147, 129]], [[1211, 535, 256, 132]], [[1507, 590, 257, 130]]],
            [[[259, 836, 187, 120]], [[461, 739, 270, 131]], [[907, 795, 222, 139]], [[1143, 933, 188, 124]], [[1571, 891, 175, 123]]],
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
    const pointCutoutData = {}

    const sectorData = [
        {
            a: {top: 383, left: 0, width: 0, height: 0, visible: false},
            b: {top: 383, left: 0, width: 1920, height: 1151, visible: true}
        },
        {
            a: {top: 383, left: 0, width: 386, height: 1151, visible: true},
            b: {top: 383, left: 1920 - 1536, width: 1538, height: 1151, visible: true}
        },
        {
            a: {top: 383, left: 0, width: 769, height: 1151, visible: true},
            b: {top: 383, left: 1920 - 1151, width: 1151, height: 1151, visible: true}
        },
        {
            a: {top: 383, left: 0, width: 769, height: 1151, visible: true},
            b: {top: 383, left: 1920 - 769, width: 769, height: 1151, visible: true}
        },
        {
            a: {top: 383, left: 0, width: 1151, height: 1151, visible: true},
            b: {top: 383, left: 1920 - 769, width: 769, height: 1151, visible: true}
        },
        {
            a: {top: 383, left: 0, width: 1536, height: 1151, visible: true},
            b: {top: 383, left: 1920 - 386, width: 386, height: 1151, visible: true}
        },
        {
            a: {top: 383, left: 0, width: 1920, height: 1151, visible: true},
            b: {top: 383, left: 0, width: 0, height: 0, visible: false}
        }
    ];

    function rectContainsPoint(rect, x, y) {
        const rx = rect.left;
        const ry = rect.top;
        const rx2 = rect.left + rect.width;
        const ry2 = rect.top + rect.height;

        return rx <= x && rx2 >= x && ry <= y && ry2 >= y;
    }

    function addMapElement(e, type, modifier) {
        console.log('addSpawn(' + type + ')')
        console.log(e);

        fabric.Image.fromURL('', function (img) {
            console.log(img);

            img.modifier = modifier;
            const wh = placedMeta[type].wh;
            img.set({
                type: type,
                selectable: true,
                evented: true,
                hasBorders: false,
                lockMovementX: true,
                lockMovementY: true,
                zIndex: zIndex[type],
                top: e.absolutePointer.y - wh / 2,
                left: e.absolutePointer.x - wh / 2,
                width: wh,
                height: wh,
            });
            if (placedMeta[type].set) {
                img.setControlsVisibility(placedMeta[type].set);
            }
            // disable rotation and resizing
            img.setControlsVisibility({
                mt: false, mb: false, ml: false, mr: false, bl: false, br: false, tl: false, tr: false, mtr: false
            })
            if (placedMeta[type].controlsVisibility) {
                img.setControlsVisibility(placedMeta[type].controlsVisibility);
            }

            placed.push(img);

            addAndOrder(img);
            internal.updateStatesAndRender();
            fixSpawnSelectBoxes();
        });
    }

    function addAndOrder(object) {
        controls.fabricCanvas.add(object);
        controls.fabricCanvas.orderByZindex();
        controls.exportCanvas.add(object);
        controls.exportCanvas.orderByZindex();
    }

    const internal = {
        init: function () {
            controls.comboMapSelect = $("#map-select");
            controls.checkGrid = $("#grid-visible");
            controls.checkArty = $("#arty-visible");
            controls.checkArtyFlip = $("#flip-arty");
            controls.checkStrongpoints = $("#sp-visible");
            elements.strongpointGrid = $("#sp-grid");
            controls.checkDefaultGarries = $("#dg-visible");
            controls.checkPlacedGarries = $("#garry-visible");
            controls.checkGarryRadius = $("#garry-radius-visible");
            controls.btnRemoveGarries = $("#removePlacedGarrisons");
            controls.btnUndoLastGarry = $("#undoLastGarrison");
            controls.btnEnableAll = $("#enableAll");
            controls.btnDisableAll = $("#disableAll");
            controls.btnSave = $("#save");
            elements.canvas = $("#canvas");
            elements.canvasParent = $("#canvas-container")[0];
            controls.checkSectors = $("#sector-visible");
            controls.checkSectorSwap = $("#swap-sector-color");
            controls.sectorRange = $("#sector-range");
            elements.contextMenu = $("#menu");

            controls.fabricCanvas = new fabric.Canvas(elements.canvas.get(0), {
                selection: false,
                fireRightClick: true,
                stopContextMenu: true,
                preserveObjectStacking: true,
                scale: 1,
                moveCursor: 'default',
                hoverCursor: 'default',
                viewportTransform: [0.40, 0, 0, 0.40, 0, 0]
            });
            controls.fabricCanvas.setHeight(800);
            controls.fabricCanvas.setBackgroundColor({
                source: '',
                repeat: 'repeat'
            }, controls.fabricCanvas.renderAll.bind(controls.fabricCanvas))

            const eCanvas = document.createElement("canvas");
            controls.exportCanvas = new fabric.Canvas(eCanvas, {
                scale: 1,
                width: 1920,
                height: 1920
            })

            elements.sectorA = new fabric.Rect({
                zIndex: zIndex.sectors,
                selectable: false,
                evented: false,
                opacity: 0.20,
                hasBorders: false,
                hasControls: false,
                hasRotatingPoint: false,
                visible: false
            });
            controls.fabricCanvas.add(elements.sectorA);
            controls.exportCanvas.add(elements.sectorA);
            elements.sectorB = new fabric.Rect({
                zIndex: zIndex.sectors,
                selectable: false,
                evented: false,
                opacity: 0.20,
                hasBorders: false,
                hasControls: false,
                hasRotatingPoint: false,
                visible: false
            });
            controls.fabricCanvas.add(elements.sectorB);
            controls.exportCanvas.add(elements.sectorB);

            fabric.Image.fromURL('', function (img) {
                elements.map = img;

                img.set({
                    selectable: false,
                    evented: false,
                    zIndex: zIndex.map
                });

                addAndOrder(img);
            });
            fabric.Image.fromURL('./maps/plain-grid.png', function (img) {
                elements.grid = img;
                img.set({
                    selectable: false,
                    evented: false,
                    visible: false,
                    zIndex: zIndex.grid
                });
                addAndOrder(img);
            });
            fabric.Image.fromURL('', function (img) {
                elements.arty = img;

                img.set({
                    selectable: false,
                    evented: false,
                    visible: false,
                    zIndex: zIndex.arty_range
                });

                addAndOrder(img);
            });
            elements.strongpoints = [[], [], [], [], []]
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    fabric.Image.fromURL('', function (img) {
                        img.set({
                            selectable: false,
                            evented: false,
                            zIndex: zIndex.points
                        });

                        addAndOrder(img);

                        elements.strongpoints[x].push(img);
                    });
                }
            }
            fabric.Image.fromURL('', function (img) {
                elements.defaultgarries = img;

                img.set({
                    selectable: false,
                    evented: false,
                    visible: $("#dg-visible").is("checked"),
                    zIndex: zIndex.default_garrisons
                });

                addAndOrder(img);
            });

            const deleteIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='red' class='bi bi-trash3' viewBox='0 0 16 16'%3E%3Cpath d='M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z'/%3E%3C/svg%3E";
            const deleteImg = document.createElement('img');
            deleteImg.src = deleteIcon;
            fabric.Object.prototype.controls.deleteControl = new fabric.Control({
                x: 0.5,
                y: -0.5,
                cursorStyle: 'pointer',
                mouseUpHandler: deleteObject,
                render: renderIcon,
                cornerSize: 24
            });

            const dragSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' style='stroke:white;stroke-width:1px;' class='bi bi-arrows-move' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708l2-2zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10zM.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L1.707 7.5H5.5a.5.5 0 0 1 0 1H1.707l1.147 1.146a.5.5 0 0 1-.708.708l-2-2zM10 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L14.293 8.5H10.5A.5.5 0 0 1 10 8z'/%3E%3C/svg%3E"
            const dragImg = document.createElement("img");
            dragImg.src = dragSvg;
            fabric.Object.prototype.controls.moveObject = new fabric.Control({
                x: -0.5,
                y: -0.5,
                actionHandler: fabric.controlsUtils.dragHandler, // change to this
                mouseUpHandler: function (e, t, x, y) {
                    t.target.set({
                        lockMovementX: true,
                        lockMovementY: true
                    })
                },
                mouseDownHandler: function (e, t, x, y) {
                    t.target.set({
                        lockMovementX: false,
                        lockMovementY: false
                    })
                },
                actionName: 'drag',
                cursorStyle: 'pointer',
                render: renderIconDrag,
                cornerSize: 24
            });

            function deleteObject(eventData, transform) {
                var target = transform.target;

                controls.fabricCanvas.remove(target);
                controls.fabricCanvas.requestRenderAll();
                controls.exportCanvas.remove(target);
                controls.exportCanvas.requestRenderAll();
            }

            function renderIcon(ctx, left, top, styleOverride, fabricObject) {
                var size = this.cornerSize;
                ctx.save();
                ctx.translate(left, top);
                ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
                ctx.drawImage(deleteImg, -size / 2, -size / 2, size, size);
                ctx.restore();
            }

            function renderIconDrag(ctx, left, top, styleOverride, fabricObject) {
                var size = this.cornerSize;
                ctx.save();
                ctx.translate(left, top);
                ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
                ctx.drawImage(dragImg, -size / 2, -size / 2, size, size);
                ctx.restore();
            }

            controls.fabricCanvas.on('object:moving', function (e) {
            });
            controls.fabricCanvas.on('object:modified', function (e) {
                internal.updateStatesAndRender();
            });

            controls.fabricCanvas.on('mouse:dblclick', function (e) {
                addMapElement(e, 'garry');
            });

            controls.btnRemoveGarries.on('click', function () {
                console.log('Remove all garries')

                while (placed.length > 0) {
                    const garry = placed.pop();

                    controls.fabricCanvas.remove(garry);
                    controls.exportCanvas.remove(garry);
                }
            })

            controls.btnUndoLastGarry.on('click', function () {
                console.log('Undo last garry')

                const garry = placed.pop();

                if (garry) {
                    controls.fabricCanvas.remove(garry);
                    controls.exportCanvas.remove(garry);
                }
            });

            const drawingModeEl = $('#drawing-mode'),
                drawingOptionsEl = $('#drawing-mode-options'),
                drawingColorEl = $('#drawing-color'),
                drawingLineWidthEl = $('#drawing-line-width'),
                clearEl = $('#clear-paths'),
                undoEl = $("#undo-path"),
                checkDrawingsVisible = $("#drawing-visible");

            drawingModeEl.on('click', function () {
                controls.fabricCanvas.isDrawingMode = !controls.fabricCanvas.isDrawingMode;
                if (controls.fabricCanvas.isDrawingMode) {
                    drawingModeEl.text('Cancel drawing mode');
                    drawingOptionsEl.show();
                    elements.canvas.addClass("drawing-mode");
                } else {
                    drawingModeEl.text('Enter drawing mode');
                    drawingOptionsEl.hide();
                    elements.canvas.removeClass("drawing-mode");
                }
            });

            controls.fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(controls.fabricCanvas);

            drawingColorEl.on('change', function () {
                const value = drawingColorEl.val();
                const brush = controls.fabricCanvas.freeDrawingBrush;
                brush.color = value;
                if (brush.getPatternSrc) {
                    brush.source = brush.getPatternSrc.call(brush);
                }
            });
            drawingColorEl.trigger('change');
            drawingLineWidthEl.on('change', function () {
                const value = drawingLineWidthEl.val();
                controls.fabricCanvas.freeDrawingBrush.width = parseInt(value, 10) || 1;
                $("#line-width-value").text(value);
            });
            drawingLineWidthEl.trigger('change');

            controls.fabricCanvas.freeDrawingBrush.color = drawingColorEl.val();
            controls.fabricCanvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.val(), 10) || 1;

            controls.fabricCanvas.on('path:created', function (e) {
                console.log(e);

                e.path.set({
                    zIndex: zIndex.drawings,
                    evented: false,
                    selectable: false
                });

                drawings.push(e.path);

                controls.fabricCanvas.orderByZindex();
                controls.exportCanvas.add(e.path);
                controls.exportCanvas.orderByZindex();
            });

            undoEl.click(function (e) {
                const path = drawings.pop();
                controls.fabricCanvas.remove(path);
                controls.exportCanvas.remove(path);
            })

            clearEl.click(function (e) {
                for (let i = 0; i < drawings.length; i++) {
                    const path = drawings[i];
                    controls.fabricCanvas.remove(path);
                    controls.exportCanvas.remove(path);
                }
            });

            checkDrawingsVisible.click(function () {
                for (let i = 0; i < drawings.length; i++) {
                    const path = drawings[i];
                    path.visible = checkDrawingsVisible.is(":checked");
                }

                internal.render();
            });

            internal.setupPage();
        },

        setupPage: function () {
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    elements.strongpointGrid.append(`<div class='sp-toggle sp-toggle-${x}${y} unavailable' data-x='${x}' data-y='${y}'></div>`)
                }
            }

            $(document).on('click', '.sp-toggle', function (e) {
                const toggle = $(e.target);
                if (toggle.hasClass("unavailable")) {
                    return;
                }

                if (toggle.hasClass("selected")) {
                    toggle.removeClass("selected");
                } else {
                    toggle.addClass("selected");
                }

                internal.updateStatesAndRender();
            });

            controls.btnEnableAll.click(function () {
                $(".sp-toggle.available").addClass("selected");

                internal.updateStatesAndRender();
            })

            controls.btnDisableAll.click(function () {
                $(".sp-toggle.available").removeClass("selected");

                internal.updateStatesAndRender();
            })

            let panning = false;
            controls.fabricCanvas.on('mouse:up', function (e) {
                panning = false;
            });
            controls.fabricCanvas.on('mouse:down', function (e) {
                elements.contextMenu.css("visibility", "hidden");
                if (e.button === 3) {
                    const offset = controls.fabricCanvas._offset;
                    // Right click context menu
                    elements.contextMenu.css("visibility", "visible")
                        .css("left", offset.left + e.pointer.x + 'px')
                        .css("top", offset.top + e.pointer.y + "px")
                        .css("z-index", 100);
                    contextMenuEvent = e;
                } else if (e.target && e.target.selectable === true && e.target.lockMovementX === false || e.transform && e.transform.action === 'rotate' ||
                    controls.fabricCanvas.isDrawingMode === true) {
                    // Dragging element
                    panning = false;
                } else {
                    panning = true;
                }
            });
            controls.fabricCanvas.on('mouse:move', function (e) {
                if (panning && e && e.e) {
                    console.log(panning);
                    var delta = new fabric.Point(e.e.movementX, e.e.movementY);
                    controls.fabricCanvas.relativePan(delta);
                }
            });
            // Look into https://stackoverflow.com/a/45131912/2650847

            controls.fabricCanvas.on('mouse:wheel', function (opt) {
                elements.contextMenu.css("visibility", "hidden")

                var delta = opt.e.deltaY;
                var zoom = controls.fabricCanvas.getZoom();
                zoom *= 0.999 ** delta;
                if (zoom > 10) zoom = 10;
                if (zoom < 0.01) zoom = 0.01;
                controls.fabricCanvas.zoomToPoint({x: opt.e.offsetX, y: opt.e.offsetY}, zoom);
                opt.e.preventDefault();
                opt.e.stopPropagation();

                fixSpawnSelectBoxes();
            });

            const spImage = new Image();
            spImage.onload = loadStrongpoints;
            spImage.onerror = function () {
                for (let i = 0; i < elements.strongpoints.length; i++) {
                    for (let j = 0; j < elements.strongpoints[i].length; j++) {
                        elements.strongpoints[i][j].setSrc('')
                    }
                }
            }

            function loadStrongpoints() {
                const filePrefix = controls.comboMapSelect.val();

                initStrongpointData(filePrefix);

                for (let x = 0; x < 5; x++) {
                    for (let y = 0; y < 5; y++) {
                        if (pointCoords[filePrefix][x][y] == null) {
                            $(".sp-toggle-" + x + y).removeClass('selected').removeClass('available').addClass('unavailable');
                        } else {
                            $(".sp-toggle-" + x + y).addClass('selected').addClass('available').removeClass('unavailable')
                        }
                    }
                }

                internal.updateStatesAndRender();
            }

            function initStrongpointData(filePrefix) {
                if (pointCutoutData.hasOwnProperty(filePrefix)) {
                    return;
                }

                console.log("initStrongpoints('" + filePrefix + "')")

                const data = {}
                for (let x = 0; x < 5; x++) {
                    for (let y = 0; y < 5; y++) {
                        const pointData = {};

                        const tempCanvas = document.createElement('canvas');
                        const context = tempCanvas.getContext('2d');
                        const point = pointCoords[filePrefix][x][y];
                        if (point == null) {
                            pointData["dataUrl"] = "";
                            pointData["position"] = {top: 0, left: 0, width: 0, height: 0}
                            pointData["visible"] = false;
                        } else {
                            let top = 1920;
                            let left = 1920;
                            let width = 0;
                            let height = 0;
                            for (let i = 0; i < point.length; i++) {
                                const rect = point[i];
                                if (top > rect[1]) {
                                    top = rect[1];
                                }
                                if (left > rect[0]) {
                                    left = rect[0];
                                }
                                if (width < (rect[0] + rect[2])) {
                                    width = (rect[0] + rect[2]);
                                }
                                if (height < (rect[1] + rect[3])) {
                                    height = (rect[1] + rect[3]);
                                }
                            }
                            tempCanvas.width = width;
                            tempCanvas.height = height;

                            for (let i = 0; i < point.length; i++) {
                                const rect = point[i];

                                const dx = rect[0] - left;
                                const dy = rect[1] - top;
                                const dw = rect[2];
                                const dh = rect[3];

                                context.drawImage(spImage, rect[0], rect[1], rect[2], rect[3], dx, dy, dw, dh);
                            }

                            pointData["dataUrl"] = tempCanvas.toDataURL();
                            pointData["position"] = {top: top, left: left, width: width, height: height}
                            pointData["visible"] = true;
                        }

                        data['' + x + y] = pointData;
                    }
                }

                console.log(data);

                pointCutoutData[filePrefix] = data;
            }

            controls.comboMapSelect.change(function () {
                const filePrefix = controls.comboMapSelect.val();
                console.log("Loading " + filePrefix)

                elements.map.setSrc('./maps/no-grid/' + filePrefix + '_NoGrid.png', internal.render);
                elements.defaultgarries.setSrc('./maps/defaultgarries/' + filePrefix + '_defaultgarries.png', internal.render)
                let artySuffix = controls.checkArtyFlip.is(":checked") ? 2 : 1;
                elements.arty.setSrc('./maps/arty/' + filePrefix + '_Arty' + artySuffix + '.png', internal.render)
                spImage.src = './maps/points/' + filePrefix + '_SP_NoMap2.png';
            });
            controls.comboMapSelect.trigger('change');

            [controls.checkGrid, controls.checkArty, controls.checkStrongpoints, controls.checkDefaultGarries,
                controls.checkSectors, controls.checkSectorSwap, controls.checkPlacedGarries, controls.checkGarryRadius
            ].forEach(function (control) {
                control.change(function () {
                    internal.updateStatesAndRender()
                });
            })

            controls.checkArtyFlip.change(function () {
                const filePrefix = controls.comboMapSelect.val();
                let artySuffix = controls.checkArtyFlip.is(":checked") ? 2 : 1;
                elements.arty.setSrc('./maps/arty/' + filePrefix + '_Arty' + artySuffix + '.png', internal.render);

                internal.render();
            })

            controls.btnSave.click(function () {
                $('<a>').attr({
                    href: controls.exportCanvas.toDataURL(),
                    download: controls.comboMapSelect.val() + "_Custom_MLL.png"
                })[0].click();
            });

            let lastRangeVal = controls.sectorRange.val();
            controls.sectorRange.on('input', function () {
                if (controls.sectorRange.val() !== lastRangeVal) {
                    lastRangeVal = controls.sectorRange.val();

                    internal.updateStatesAndRender();
                }
            })

            new ResizeObserver(() => {
                controls.fabricCanvas.setWidth(elements.canvasParent.clientWidth)
                controls.fabricCanvas.setHeight(elements.canvasParent.clientHeight)
            }).observe(document.getElementById("canvas-container"));
        },

        // Update fabricjs element states and re-render
        updateStatesAndRender: function () {
            console.log("updateStatesAndRender()");
            const filePrefix = controls.comboMapSelect.val();
            const promises = [];

            if (elements.grid) {
                elements.grid.visible = controls.checkGrid.is(":checked");
            }
            if (elements.defaultgarries) {
                elements.defaultgarries.visible = controls.checkDefaultGarries.is(":checked");
            }
            if (elements.arty) {
                elements.arty.visible = controls.checkArty.is(":checked");
            }
            for (let i = 0; i < placed.length; i++) {
                placed[i].visible = controls.checkPlacedGarries.is(":checked");
            }

            const mapVertical = pointCoords[filePrefix][0][1] != null;
            const range = sectorData[controls.sectorRange.val()];
            elements.sectorA.set(mapVertical ?
                {
                    top: range.a.left,
                    left: range.a.top,
                    width: range.a.height,
                    height: range.a.width,
                    visible: range.a.visible
                } : range.a);
            elements.sectorB.set(mapVertical ?
                {
                    top: range.b.left,
                    left: range.b.top,
                    width: range.b.height,
                    height: range.b.width,
                    visible: range.b.visible
                } : range.b);

            if (!controls.checkSectors.is(":checked")) {
                elements.sectorA.visible = false;
                elements.sectorB.visible = false;
            }

            const sectorRed = '#FF6B43';
            const sectorBlue = '#08FFFF';

            const sectorBred = controls.checkSectorSwap.is(":checked");
            if (sectorBred) {
                elements.sectorA.set({fill: sectorBlue});
                elements.sectorB.set({fill: sectorRed});
            } else {
                elements.sectorA.set({fill: sectorRed});
                elements.sectorB.set({fill: sectorBlue});
            }

            // Update placed element images
            for (let i = 0; i < placed.length; i++) {
                const object = placed[i];
                promises.push(new Promise(function (resolve) {
                    object.setSrc(placedMeta[object.type].resolveImg(object), resolve);
                }));
            }

            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    const spObject = elements.strongpoints[x][y];

                    spObject.visible = controls.checkStrongpoints.is(":checked") && $(".sp-toggle-" + x + y).hasClass("selected");

                    if (!pointCutoutData.hasOwnProperty(filePrefix)) {
                        continue;
                    }

                    if (currentLoadedPoints !== filePrefix) {
                        const pointData = pointCutoutData[filePrefix]['' + x + y];
                        if (pointData.visible) {
                            promises.push(new Promise(function (resolve) {
                                spObject.setSrc(pointData.dataUrl, resolve);
                            }))
                            spObject.set(pointData.position);
                        } else {
                            elements.strongpoints[x][y].visible = false;
                        }
                    }
                }
            }

            if (currentLoadedPoints !== filePrefix) {
                currentLoadedPoints = filePrefix;
            }

            if (promises.length) {
                Promise.all(promises).then(internal.render);
            } else {
                controls.fabricCanvas.renderAll();
                controls.exportCanvas.renderAll();
            }
        },

        render: function () {
            console.log("render()");

            controls.fabricCanvas.renderAll();
            controls.exportCanvas.renderAll();
        }
    }

    $(document).ready(internal.init);

    return {
        menuAdd: function (type, modifier) {
            elements.contextMenu.css("visibility", "hidden");
            console.log('menuAdd(' + type + ')')

            if (!type) {
                return;
            }

            addMapElement(contextMenuEvent, type, modifier);
        }
    }
}());


