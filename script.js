(function () {
    'use strict';

    fabric.Canvas.prototype.orderObjects = function (compare) {
        this._objects.sort(compare);
        this.renderAll();
    }
    fabric.Canvas.prototype.orderByZindex = function () {
        this.orderObjects((a, b) => (a.zIndex > b.zIndex) ? 1 : -1);
    }

    const internal = {
        init: function () {
            const spGrid = $("#sp-grid");
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    spGrid.append(`<div class='sp-toggle sp-toggle-${x}${y} unavailable' data-x='${x}' data-y='${y}'></div>`)
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

                const x = toggle.data("x");
                const y = toggle.data("y");

                elements.strongpoints[x][y].visible = $("#sp-visible").is(":checked") && toggle.hasClass("selected");

                renderAll();
            });

            $("#enableAll").click(function () {
                $(".sp-toggle.available").addClass("selected");

                for (let x = 0; x < 5; x++) {
                    for (let y = 0; y < 5; y++) {
                        elements.strongpoints[x][y].visible = $("#sp-visible").is(":checked") && true
                    }
                }

                renderAll();
            })

            $("#disableAll").click(function () {
                $(".sp-toggle.available").removeClass("selected");

                for (let x = 0; x < 5; x++) {
                    for (let y = 0; y < 5; y++) {
                        elements.strongpoints[x][y].visible = $("#sp-visible").is(":checked") && false
                    }
                }

                renderAll();
            })

            const canvasElement = $('#canvas');
            const canvasParent = $("#canvas-container")[0];
            const canvas = new fabric.Canvas(canvasElement.get(0), {
                selection: false,
                scale: 1,
                moveCursor: 'default',
                hoverCursor: 'default',
                viewportTransform: [0.40, 0, 0, 0.40, 0, 0]
            });
            canvas.setHeight(800);
            canvas.setBackgroundColor({
                source: '',
                repeat: 'repeat'
            }, canvas.renderAll.bind(canvas))

            var panning = false;
            canvas.on('mouse:up', function (e) {
                panning = false;
            });
            canvas.on('mouse:down', function (e) {
                if (e.target && e.target.zIndex >= 10) {
                    // Don't pan if clicked on top of draggable elements
                    return;
                }
                panning = true;
            });
            canvas.on('mouse:move', function (e) {
                if (panning && e && e.e) {
                    var delta = new fabric.Point(e.e.movementX, e.e.movementY);
                    canvas.relativePan(delta);
                }
            });

            canvas.on('mouse:wheel', function (opt) {
                var delta = opt.e.deltaY;
                var zoom = canvas.getZoom();
                zoom *= 0.999 ** delta;
                if (zoom > 10) zoom = 10;
                if (zoom < 0.01) zoom = 0.01;
                canvas.zoomToPoint({x: opt.e.offsetX, y: opt.e.offsetY}, zoom);
                opt.e.preventDefault();
                opt.e.stopPropagation();
            });

            const elements = {};
            fabric.Image.fromURL('', function (img) {
                elements.map = img;
                img.selectable = false;
                img.zIndex = 0;
                canvas.add(img);
                canvas.orderByZindex();
            });
            fabric.Image.fromURL('./maps/plain-grid.png', function (img) {
                elements.grid = img;
                img.selectable = false;
                img.zIndex = 1;
                canvas.add(img);
                canvas.orderByZindex();
            });
            elements.strongpoints = [[], [], [], [], []]
            const rowCol = 5;
            for (let i = 0; i < rowCol; i++) {
                for (let j = 0; j < rowCol; j++) {
                    fabric.Image.fromURL('', function (img) {
                        img.selectable = false;
                        img.zIndex = 2;
                        canvas.add(img);
                        canvas.orderByZindex();

                        elements.strongpoints[i].push(img);
                    });
                }
            }
            fabric.Image.fromURL('', function (img) {
                elements.defaultgarries = img;
                img.selectable = false;
                img.zIndex = 3;
                img.visible = $("#dg-visible").is("checked");
                canvas.add(img);
                canvas.orderByZindex();
            });

            const spImage = new Image();
            spImage.onload = cutImageUp;
            spImage.onerror = function () {
                for (let i = 0; i < elements.strongpoints.length; i++) {
                    for (let j = 0; j < elements.strongpoints[i].length; j++) {
                        elements.strongpoints[i][j].setSrc('')
                    }
                }
            }

            const mapSelect = $("#map-select")
            // Each point supports multiple coordinates to draw to tempCanvas
            // Each map has 25 sectors but 15 points
            // Sectors without point are represented by null
            // Coordinates are dependent on a 1920x1920 map image
            // [x, y, w, h]
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
                    [[[220, 895, 242, 136]], [[524, 949, 271, 125]], [[837, 902, 220, 155]], [[1147, 833, 192,125]], [[1639, 765, 169, 152]]],
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
                    [[[259, 836, 187, 120]], [[461, 739, 270, 131]], [[907, 795, 222, 139]], [[1143, 933, 188, 124]], [[1572, 829, 173, 122]]],
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
            const pointCutouts = {}

            // const exampleGarrison = new fabric.Circle({
            //     radius: 190,
            //     fill: '#2dff00',
            //     opacity: 0.25,
            //     hasBorders: false,
            //     hasControls: false,
            //     hasRotatingPoint: false,
            //     zIndex: 10
            // });
            // canvas.add(exampleGarrison);

            function cutImageUp() {
                console.log('cutImageUp()')

                const filePrefix = mapSelect.val();

                const grid = [];
                for (let x = 0; x < rowCol; x++) {
                    const row = [];
                    for (let y = 0; y < rowCol; y++) {
                        // precise point cutout using (multiple) coordinates
                        const tempCanvas = document.createElement('canvas');
                        const context = tempCanvas.getContext('2d');
                        if (pointCoords.hasOwnProperty(filePrefix)) {
                            if (!pointCutouts.hasOwnProperty(filePrefix)) {
                                pointCutouts[filePrefix] = {}
                            }

                            const point = pointCoords[filePrefix][x][y];
                            if (point == null) {
                                tempCanvas.width = 0;
                                tempCanvas.height = 0;

                                $(".sp-toggle-" + x + y)
                                    .removeClass('selected')
                                    .removeClass('available')
                                    .addClass('unavailable');
                                elements.strongpoints[x][y].visible = false
                            } else {
                                $(".sp-toggle-" + x + y)
                                    .addClass('selected')
                                    .addClass('available')
                                    .removeClass('unavailable')
                                elements.strongpoints[x][y].visible = true

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
                                    // console.log(dx + ", " + dy + ", " + dw + ", " + dh)

                                    context.drawImage(spImage, rect[0], rect[1], rect[2], rect[3], dx, dy, dw, dh);
                                }

                                pointCutouts[filePrefix]['' + x + y] = {top: top, left: left, width: width, height: height}
                            }
                        }

                        row.push(tempCanvas.toDataURL());
                    }
                    grid.push(row);
                }

                console.log(grid);
                console.log(pointCutouts)
                console.log(elements.strongpoints)
                for (let i = 0; i < rowCol; i++) {
                    for (let j = 0; j < rowCol; j++) {
                        const spObject = elements.strongpoints[i][j];
                        spObject.setSrc(grid[i][j]);
                        if (pointCutouts.hasOwnProperty(filePrefix)) {
                            const cutouts = pointCutouts[filePrefix];
                            const spCutout = cutouts['' + i + j];
                            if (spCutout) {
                                spObject.set({
                                    top: spCutout.top,
                                    left: spCutout.left,
                                    width: spCutout.width,
                                    height: spCutout.height
                                })
                            }
                        }
                    }
                }

                renderAll();
            }

            function renderAll() {
                console.log("renderAll")
                canvas.renderAll();
            }


            mapSelect.change(function () {
                const filePrefix = mapSelect.val();
                elements.map.setSrc('./maps/no-grid/' + filePrefix + '_NoGrid.png', renderAll);
                elements.defaultgarries.setSrc('./maps/defaultgarries/' + filePrefix + '_defaultgarries.png', renderAll)
                spImage.src = './maps/points/' + filePrefix + '_SP_NoMap2.png';
            });
            mapSelect.trigger('change');

            const gridVisible = $("#grid-visible");
            gridVisible.change(function () {
                elements.grid.visible = gridVisible.is(":checked");
                renderAll();
            })

            const spVisible = $("#sp-visible");
            spVisible.change(function () {
                for (let x = 0; x < rowCol; x++) {
                    for (let y = 0; y < rowCol; y++) {
                        elements.strongpoints[x][y].visible = spVisible.is(":checked") && $(".sp-toggle-" + x + y).hasClass("selected");
                    }
                }
                renderAll();
            })

            const dgVisible = $("#dg-visible");
            dgVisible.change(function () {
                elements.defaultgarries.visible = dgVisible.is(":checked");
                renderAll();
            })

            new ResizeObserver(() => {
                canvas.setWidth(canvasParent.clientWidth)
                canvas.setHeight(canvasParent.clientHeight)
            }).observe(document.getElementById("canvas-container"));

            $.contextMenu("html5");
            $.contextMenu({
                selector: "canvas",
                items: {
                    foo: {
                        name: "Test", callback: function (key, opt) {
                            console.log(key);
                            console.log(opt);
                        }
                    }
                }
            })
            // canvasElement.contextmenu({
            //     menu: [
            //         {title: "Test", cmd: "test"}
            //     ],
            //     select: function (event, ui) {
            //         console.log(event);
            //         console.log(ui);
            //         if (ui.cmd == "test") {
            //         }
            //     }
            // });
        }
    }

    $(document).ready(internal.init);
}());


