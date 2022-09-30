const mll = (function () {
    'use strict';

    const elements = {};
    const controls = {};

    function idx(p, o) {
        return p.reduce((xs, x) => (xs && xs[x]) ? xs[x] : null, o)
    }

    function distance(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1) * 2;
    }

    function midpoint(x1, y1, x2, y2) {
        return [(x1 + x2) / 2, (y1 + y2) / 2];
    }

    function uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    function parseQuery(queryString) {
        const query = {};
        const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i].split('=');
            query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }
        return query;
    }

    function sanitize(input) {
        return String(input).trim()
            .substring(0, 50)
            .replaceAll(/[^\w+ !@#$&%=,/\-\[\]]/gi, '');
    }

    let lastLoadedMap;
    let roomsMode = false;
    let roomsRole = 'viewer';
    let socket;
    let currentLoadedPoints = '';
    let contextMenuEvent;
    let placed = [];
    let drawings = [];
    let resetSelectedPoints = false;
    let selectedElement;

    function updateZoomScale() {
        const zoom = controls.fabricCanvas.getZoom();
        let scale = (3 / zoom) - 2.5;
        if (scale <= 1) {
            scale = 1;
        } else if (scale >= 2.25) {
            scale = 2.25;
        }

        const doScale = controls.checkZoomScale.is(":checked");
        for (let i = 0; i < placed.length; i++) {
            const object = placed[i];
            const meta = object.type;
            if (meta.type === "measure-radius") {
                const textEl = idx(["type", "text"], object);
                const textEl2 = idx(["type", "text2"], object);
                if (!textEl) {
                    console.log("no text");
                } else {
                    const meters = Math.trunc((100 * object.getScaledWidth()) / 190);
                    textEl.set({
                        text: meters + "m"
                    });

                    if (textEl2) {
                        textEl2.set({
                            text: meters + "m"
                        });
                    }
                }
            }
            const typeMeta = placedMeta[meta.type];
            if (!typeMeta) {
                continue;
            }
            const baseScale = typeMeta.customScale || 1;
            if (doScale && (typeMeta.zoomScale || (typeMeta.hasOwnProperty("zoomScaleWhen") && typeMeta.zoomScaleWhen()))) {
                const max = typeMeta.maxZoom || 2.25;
                let adjusted = baseScale + (scale - 1);
                if (adjusted > max) {
                    adjusted = max;
                }
                object.set({scaleX: adjusted, scaleY: adjusted});
            } else {
                object.set({scaleX: baseScale, scaleY: baseScale});
            }
        }

        controls.fabricCanvas.requestRenderAll();
    }

    function calculateLineArea(line) {
        const minx = Math.min(line.x1, line.x2);
        const maxx = Math.max(line.x1, line.x2);
        const miny = Math.min(line.y1, line.y2);
        const maxy = Math.max(line.y1, line.y2);
        const width = (maxx - minx) || 1;
        const height = (maxy - miny) || 1;

        return width * height;
    }

    function changeZIndexBySize() {
        const objectAreas = {}
        for (let i = 0; i < placed.length; i++) {
            const element = placed[i];
            const type = idx(["type", "type"], element);
            const area = Math.round(type === "measure-line" ? calculateLineArea(element) :
                element.getScaledWidth() * element.getScaledHeight());

            if (objectAreas.hasOwnProperty(area)) {
                objectAreas[area].push(element);
            } else {
                objectAreas[area] = [element];
            }
        }
        //console.log(objectAreas);
        const sizes = Object.keys(objectAreas).sort(function (a, b) {
            return a - b;
        }).reverse();
        //console.log(sizes);
        for (let i = 0; i < sizes.length; i++) {
            const elements = objectAreas[sizes[i]];
            for (let j = 0; j < elements.length; j++) {
                const zIndex = 10 + i;
                const element = elements[j];
                elements[j].set({zIndex: zIndex});

                if (element.type.also) {
                    for (let k = 0; k < element.type.also.length; k++) {
                        element.type.also[k].set({zIndex: zIndex});
                    }
                }
            }
        }

        controls.fabricCanvas.orderByZindex();
    }

    function getSelectedSp() {
        const selected = [];
        $(".sp-toggle.available.selected").each(function (i, el) {
            const toggle = $(el);
            selected.push('' + toggle.data('x') + toggle.data('y'));
        })
        return selected;
    }

    async function loadFromRoomState(message, spCallback) {
        if (!message || !message.state) {
            console.warn('message or state was null')
            return;
        }

        console.log("loadFromState()")
        console.log(message);

        const controlState = message.state.controls;
        if (controlState) {
            console.log('updating controls state')
            controls.comboMapSelect.val(controlState.map);
            controls.checkGrid.prop('checked', controlState.grid);
            controls.checkDefaultGarries.prop('checked', controlState.defaultGarries);
            controls.checkPlacedGarries.prop('checked', controlState.placed);
            controls.checkGarryRadius.prop('checked', controlState.spawnRadius);
            controls.checkArty.prop('checked', controlState.arty);
            controls.checkArtyFlip.prop('checked', controlState.flipArty);
            controls.checkStrongpoints.prop('checked', controlState.sp);
            controls.checkSpResource.prop('checked', controlState.spResource);
            controls.checkSectors.prop('checked', controlState.sectors);
            controls.checkSectorSwap.prop('checked', controlState.swapSectors);
            controls.sectorRange.val(controlState.sectorValue);
            controls.checkDrawingsVisible.prop('checked', controlState.drawings);

            internal.roomsLoadMapAndSP(controlState.map, controlState.selectedSp, spCallback);
        }

        const elementState = message.state.elements;
        if (elementState) {
            console.log('updating element state')

            const updateIds = [];
            for (let i = 0; i < elementState.length; i++) {
                updateIds.push(elementState[i].type.id);
            }

            // remove elements not un update list
            const currentIds = [];
            const newPlaced = [];
            for (let i = 0; i < placed.length; i++) {
                const element = placed[i];
                if (updateIds.indexOf(element.type.id) === -1) {
                    console.log('removing ' + element.type.id)
                    controls.fabricCanvas.remove(element);
                    controls.exportCanvas.remove(element);

                    if (element.type && element.type.also) {
                        const also = element.type.also;
                        for (let j = 0; j < also.length; j++) {
                            controls.fabricCanvas.remove(also[j]);
                            controls.exportCanvas.remove(also[j]);
                        }
                    }
                } else {
                    newPlaced.push(element);
                    currentIds.push(element.type.id);
                }
            }
            placed = newPlaced;

            // update element angle and position if changed
            for (let i = 0; i < placed.length; i++) {
                const element = placed[i];
                for (let j = 0; j < elementState.length; j++) {
                    const updated = elementState[j];
                    const meta = updated.type;
                    if (element.type.id === meta.id) {
                        if (meta.type === "measure-line") {
                            element.set({
                                x1: updated.x1,
                                x2: updated.x2,
                                y1: updated.y1,
                                y2: updated.y2
                            });
                            const lineLength = distance(updated.x1, updated.y1, updated.x2, updated.y2);
                            const meters = Math.trunc((100 * lineLength) / 190);
                            const point = midpoint(updated.x1, updated.y1, updated.x2, updated.y2);
                            element.type.text.set({
                                left: point[0],
                                top: point[1],
                                text: meters + "m"
                            })
                            element.type.c1.set({
                                left: element.get("x1"),
                                top: element.get("y1"),
                            })
                            element.type.c2.set({
                                left: element.get("x2"),
                                top: element.get("y2"),
                            })
                        } else if (meta.type === "measure-radius") {
                            console.log("updating measure-radius")
                            console.log(element);
                            element.type.text.set({
                                text: updated.type.text.text
                            });
                            if (element.type.text2) {
                                element.type.text2.set({
                                    text: updated.type.text.text
                                });
                            }
                            element.set({
                                angle: updated.angle,
                                scaleX: updated.scaleX,
                                scaleY: updated.scaleY,
                                top: updated.top,
                                left: updated.left
                            });
                        } else {
                            element.set({
                                angle: updated.angle,
                                top: updated.top,
                                left: updated.left,
                                scaleX: updated.scaleX,
                                scaleY: updated.scaleY,
                                text: updated.text,
                                backgroundColor: updated.backgroundColor,
                                fill: updated.fill,
                                stroke: updated.stroke,
                                opacity: updated.opacity,
                            });
                        }

                        const side = idx(["type", "side"], updated);
                        if (side) {
                            element.type.side = updated.type.side;
                        }

                        if (roomsMode && roomsRole === 'viewer') {
                            element.set({
                                selectable: false,
                                evented: false
                            })
                        }
                    }
                }
            }

            // add elements from update not in current list

            console.log(elementState);
            for (let i = 0; i < elementState.length; i++) {
                const meta = elementState[i].type;

                if (currentIds.indexOf(meta.id) === -1) {
                    console.log('adding ' + meta.id)
                    addMapElement(meta.originalEvent, meta.type, meta.modifier, false, meta.id, elementState[i]);
                }
            }
        }

        if (controlState || elementState) {
            internal.updateStatesAndRender();
        }

        const drawingState = message.state.drawings;
        if (drawingState) {
            console.log('updating drawing state')
            while (drawings.length) {
                const element = drawings.pop();
                controls.fabricCanvas.remove(element);
                controls.exportCanvas.remove(element);
            }

            fabric.util.enlivenObjects(drawingState, function (objects) {
                objects.forEach(function (o) {
                    drawings.push(o);

                    o.set({
                        zIndex: zIndex.drawings,
                        evented: false,
                        selectable: false,
                        visible: (idx(["state", "controls", "drawings"], message) || controls.checkDrawingsVisible.is(":checked"))
                    });

                    controls.fabricCanvas.add(o);
                    controls.exportCanvas.add(o);
                });
            });
            controls.fabricCanvas.orderByZindex();

            internal.render();
        }
    }

    function getFullState() {
        return {
            state: {
                controls: getControlsRoomState(),
                elements: getElementsRoomState(),
                drawings: drawings
            }
        }
    }

    function getControlsRoomState() {
        return {
            map: controls.comboMapSelect.val(),
            grid: controls.checkGrid.is(":checked"),
            defaultGarries: controls.checkDefaultGarries.is(":checked"),
            placed: controls.checkPlacedGarries.is(":checked"),
            spawnRadius: controls.checkGarryRadius.is(":checked"),
            arty: controls.checkArty.is(":checked"),
            flipArty: controls.checkArtyFlip.is(":checked"),
            sp: controls.checkStrongpoints.is(":checked"),
            spResource: controls.checkSpResource.is(":checked"),
            selectedSp: getSelectedSp(),
            sectors: controls.checkSectors.is(":checked"),
            swapSectors: controls.checkSectorSwap.is(":checked"),
            sectorValue: controls.sectorRange.val(),
            drawings: controls.checkDrawingsVisible.is(":checked")
        }
    }

    function roomEditorUpdateControls(control) {
        const controlAbout = control instanceof jQuery ? control.attr("id") + "=" + (control.val() || control.is(":checked")) : control;
        console.log("roomEditorUpdateControls(" + controlAbout + ")")
        if (roomsMode && roomsRole === 'editor') {
            console.log('sending editor-controls event')
            const payload = {
                roomId: controls.inputRoomId.val(),
                editorKey: $("#editorKeyDisplay").val(),
                state: {
                    controls: getControlsRoomState()
                },
                controlsChange: controlAbout
            };
            console.log(payload);
            socket.emit('editor-controls', payload);
        }
    }

    function getElementsRoomState() {
        // images cannot be enlivened as easily as drawings
        // storing only necessary data to recreate in the clients
        const reducedElements = [];
        for (let i = 0; i < placed.length; i++) {
            const element = placed[i];
            reducedElements.push({
                angle: element.angle,
                height: element.height,
                left: element.left,
                top: element.top,
                type: element.type,
                width: element.width,
                scaleX: element.scaleX,
                scaleY: element.scaleY,
                text: element.text,
                x1: element.x1,
                y1: element.y1,
                x2: element.x2,
                y2: element.y2,
                backgroundColor: element.backgroundColor,
                fill: element.fill,
                stroke: element.stroke,
                opacity: element.opacity,
            })
        }

        return reducedElements;
    }

    function roomEditorUpdateElements() {
        if (roomsMode && roomsRole === 'editor') {
            console.log('sending editor-elements event');

            socket.emit('editor-elements', {
                roomId: controls.inputRoomId.val(),
                editorKey: $("#editorKeyDisplay").val(),
                state: {
                    elements: getElementsRoomState().slice(0, 50)
                }
            });
        }
    }

    function roomEditorUpdateDrawings() {
        if (roomsMode && roomsRole === 'editor') {
            console.log('sending editor-drawings event')
            socket.emit('editor-drawings', {
                roomId: controls.inputRoomId.val(),
                editorKey: $("#editorKeyDisplay").val(),
                state: {
                    drawings: drawings.slice(0, 50)
                }
            });
        }
    }

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
        node: 9,
        class: 9,
        "repair-station": 9,
        "supply-drop": 9,
        "ammo-drop": 9,
        "precision-strike": 9,
        "katyusha-strike": 9,
        "strafing-run": 9,
        "bombing-run": 9,
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
                const objectX = object.left;
                const objectY = object.top;

                if (radiusHidden) {
                    return './assets/garry-plain.png';
                } else if (sectorsVisible &&
                    (!sectorBred && rectContainsPoint(elements.sectorA, objectX, objectY) ||
                        sectorBred && rectContainsPoint(elements.sectorB, objectX, objectY))) {
                    return './assets/garry-red-zone.png';
                } else if (sectorsVisible &&
                    (sectorBred && rectContainsPoint(elements.sectorA, objectX, objectY) ||
                        !sectorBred && rectContainsPoint(elements.sectorB, objectX, objectY))) {
                    return './assets/garry-blue-zone.png';
                } else if (sectorsVisible) {
                    return './assets/garry-invalid.png';
                }

                return './assets/garry-blue-zone.png';
            },
            zoomScaleWhen: function () {
                return controls.checkGarryRadius.is(":checked")
            },
            customizable: "asset",
            filterRotation: -0.45,
        },
        airhead: {
            wh: 122,
            resolveImg: function (object) {
                const radiusHidden = controls.checkGarryRadius.is(":checked");
                return './assets/airhead-' + (radiusHidden ? 'plain' : 'radius') + '.png'
            },
            zoomScaleWhen: function () {
                return controls.checkGarryRadius.is(":checked")
            }
        },
        halftrack: {
            wh: 122,
            resolveImg: function (object) {
                const radiusHidden = controls.checkGarryRadius.is(":checked");
                return './assets/halftrack-' + (radiusHidden ? 'plain' : 'radius') + '.png'
            },
            controlsVisibility: {mtr: true},
            zoomScaleWhen: function () {
                return controls.checkGarryRadius.is(":checked")
            },
            customizable: "asset",
            filterRotation: -0.45,
        },
        outpost: {
            wh: 122,
            resolveImg: function (object) {
                const radiusHidden = controls.checkGarryRadius.is(":checked");
                return './assets/outpost-' + object.type.modifier + "-" + (radiusHidden ? 'plain' : 'radius') + '.png'
            },
            zoomScaleWhen: function () {
                return controls.checkGarryRadius.is(":checked")
            }
        },
        node: {
            wh: 122,
            resolveImg: function (object) {
                if (object.type.modifier) {
                    return './assets/node-' + object.type.modifier + ".png";
                }

                return './assets/tank-batch.png'
            }
        },
        "repair-station": {
            wh: 122,
            resolveImg: function (object) {
                return "./assets/repair-station.png"
            },
            zoomScale: false
        },
        "supply-drop": {
            wh: 51,
            resolveImg: function (object) {
                return "./assets/supply-drop.png"
            },
            zoomScale: false
        },
        "ammo-drop": {
            wh: 51,
            resolveImg: function (object) {
                return "./assets/ammo-drop.png"
            },
            zoomScale: false
        },
        "precision-strike": {
            wh: 122,
            resolveImg: function (object) {
                return "./assets/precision-strike.png"
            },
            zoomScale: false
        },
        "katyusha-strike": {
            wh: 197,
            resolveImg: function (object) {
                return "./assets/katyusha-strike.png"
            },
            zoomScale: false
        },
        "strafing-run": {
            wh: 380,
            resolveImg: function (object) {
                return "./assets/strafing-run.png"
            },
            set: {snapAngle: 45},
            controlsVisibility: {mtr: true},
        },
        "bombing-run": {
            wh: 380,
            resolveImg: function (object) {
                return "./assets/bombing-run.png"
            },
            set: {snapAngle: 45},
            controlsVisibility: {mtr: true},
        },
        "supplies": {
            wh: 51,
            resolveImg: function (object) {
                if (object.type.modifier) {
                    return './assets/supplies-' + object.type.modifier + ".png";
                }

                return './assets/supplies-plain.png'
            },
            zoomScale: true,
            customizable: "asset",
            filterRotation: -0.45,
        },
        tank: {
            wh: 51,
            resolveImg: function (object) {
                if (object.type.modifier) {
                    return './assets/tank-' + object.type.modifier + ".png";
                }
                return './assets/tank-med.png'
            },
            controlsVisibility: {mtr: true},
            zoomScale: true,
            customizable: "asset",
        },
        class: {
            wh: 51,
            resolveImg: function (object) {
                if (object.type.modifier) {
                    return './assets/class-' + object.type.modifier + ".png";
                }
                return './assets/class-rifleman.png'
            },
            customScale: 0.5,
            maxZoom: 1,
            zoomScale: true,
            customizable: "asset",
        },
        truck: {
            wh: 51,
            resolveImg: function (object) {
                if (object.type.modifier) {
                    return './assets/truck-' + object.type.modifier + ".png";
                }

                return './assets/truck-supply.png'
            },
            controlsVisibility: {mtr: true},
            zoomScale: true
        },
        'at-gun': {
            wh: 51,
            resolveImg: function (object) {
                return './assets/at-gun-plain.png'
            },
            controlsVisibility: {mtr: true},
            zoomScale: true
        },
        enemy: {
            wh: 51,
            resolveImg: function (object) {
                return './assets/enemy-' + object.type.modifier + '.png'
            },
            zoomScale: true
        }
    }

    function fixElementSelectBoxes() {
        const toFix = [];
        for (let i = 0; i < placed.length; i++) {
            const object = placed[i];
            toFix.push(object);

            if (object.type && object.type.also) {
                const also = object.type.also;
                for (let j = 0; j < also.length; j++) {
                    toFix.push(also[j]);
                }
            }
        }
        const sel = new fabric.ActiveSelection(toFix, {canvas: controls.fabricCanvas});
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
        render: renderRotateIcon,
        cornerSize: 24,
        withConnection: true
    });

    function renderRotateIcon(ctx, left, top, styleOverride, fabricObject) {
        const size = this.cornerSize;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
        ctx.drawImage(rotateImg, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = 'blue';
    fabric.Object.prototype.cornerStyle = 'circle';

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

    function makeCircle(left, top, line1, line2, line3, line4) {
        const c = new fabric.Circle({
            type: {
                type: "measure-line-circle",
                allowDrag: true
            },
            left: left,
            top: top,
            strokeWidth: 5,
            radius: 7,
            fill: "#fff",
            stroke: "#00ff00",
            originX: "center",
            originY: "center",
            selectable: true,
            evented: true,
            zIndex: 9,
            hasControls: false,
            hasBorders: false,
        });

        c.line1 = line1;
        c.line2 = line2;
        c.line3 = line3;
        c.line4 = line4;

        return c;
    }

    function makeLine(coords) {
        const line = new fabric.Line(coords, {
            type: {
                type: "measure-line"
            },
            stroke: "#00ff00",
            strokeWidth: 5,
            strokeDashArray: [10, 5],
            strokeUniform: true,
            selectable: true,
            evented: true,
            lockMovementX: true,
            lockMovementY: true,
            originX: "center",
            originY: "center",
            zIndex: 8,
        });
        line.setControlsVisibility({
            mt: false, mb: false, ml: false, mr: false, bl: false, br: false, tl: false, tr: false, mtr: false,
            moveObject: false
        })
        return line;
    }

    function addMapElement(e, type, modifier, roomSendUpdate, uuid, otherObject, resolve) {
        if (!type) {
            console.warn("Cannot add element without type");
            return;
        }

        console.log(`addMapElement(${type}, ${modifier}, ${roomSendUpdate}, ${uuid}, ${otherObject})`)
        console.log(e);

        let toAdd;
        let alsoAdd = [];
        if (type === "measure-radius") {
            const text_top = new fabric.Text("700m", {
                fontFamily: 'Calibri',
                fontSize: 18,
                stroke: "#00ff00",
                textAlign: 'center',
                originX: 'center',
                originY: 'center',
                lockScalingX: true,
                lockScalingY: true,
                top: 180
            });
            const text_bottom = new fabric.Text("700m", {
                fontFamily: 'Calibri',
                fontSize: 18,
                stroke: "#00ff00",
                textAlign: 'center',
                originX: 'center',
                originY: 'center',
                lockUniScaling: true,
                top: -180
            });
            const circle = new fabric.Circle({
                zIndex: 7,
                fill: "transparent",
                originX: "center",
                originY: "center",
                centeredScaling: true,
                radius: 190,
                stroke: "#00ff00",
                strokeWidth: 5,
                strokeDashArray: [10, 5],
                strokeUniform: true,
            });
            const vertLine = new fabric.Line([7, 0, -7, 0], {
                originX: "center",
                originY: "center",
                stroke: 'black',
                strokeUniform: true,
                strokeWidth: 1.5,
            });
            const horizLine = new fabric.Line([0, 7, 0, -7], {
                originX: "center",
                originY: "center",
                stroke: 'black',
                strokeWidth: 1.5,
                strokeUniform: true,
            });
            const group = new fabric.Group([circle, text_top, text_bottom, vertLine, horizLine], {
                selectable: true,
                evented: true,
                hasBorders: false,
                lockMovementX: true,
                lockMovementY: true,
                originX: "center",
                originY: "center",
                centeredScaling: true,
                strokeUniform: true,
                width: 380,
                height: 380,
                zIndex: 7,
                left: e.absolutePointer.x,
                top: e.absolutePointer.y,
                scaleX: 3.5036381745797236, // scale to 700m
                scaleY: 3.5036381745797236,
                type: {
                    id: uuid ? uuid : uuidv4(),
                    type: type,
                    modifier: modifier,
                    originalEvent: {absolutePointer: e.absolutePointer},
                    saveKeepScale: true,
                    text: text_bottom,
                    text2: text_top,
                }
            });
            group.setControlsVisibility({
                mt: false, mb: false, ml: false, mr: false, bl: true, br: true, tl: false, tr: false, mtr: true
            });

            if (otherObject) {
                text_top.set({
                    text: otherObject.type.text.text
                });
                text_bottom.set({
                    text: otherObject.type.text.text
                });
                group.set({
                    angle: otherObject.angle,
                    scaleX: otherObject.scaleX,
                    scaleY: otherObject.scaleY,
                    top: otherObject.top,
                    left: otherObject.left
                });

                if (roomsMode && roomsRole === 'viewer') {
                    group.set({
                        selectable: false,
                        evented: false
                    })
                }
            }

            toAdd = group;
        } else if (type === "textbox") {
            const itext = new fabric.IText("Hello world", {
                type: {
                    id: uuid ? uuid : uuidv4(),
                    originalEvent: {absolutePointer: e.absolutePointer},
                    type: "textbox",
                    customizable: "shape",
                },
                fontSize: 24,
                fontFamily: "system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", \"Liberation Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\"",
                top: e.absolutePointer.y,
                left: e.absolutePointer.x,
                width: 380,
                height: 380,
                backgroundColor: "#222222",
                fill: "#ffffff",
                opacity: 0.8,
                zIndex: 7,
                hasBorders: false,
                lockMovementX: true,
                lockMovementY: true,
            });
            itext.setControlsVisibility({
                mt: false, mb: false, ml: false, mr: false, bl: false, br: false, tl: false, tr: false, mtr: true
            })

            if (otherObject) {
                itext.set({
                    top: otherObject.top,
                    left: otherObject.left,
                    text: otherObject.text,
                    backgroundColor: otherObject.backgroundColor,
                    fill: otherObject.fill,
                    opacity: otherObject.opacity,
                })
            }

            toAdd = itext;
        } else if (type === "rectangle") {
            const rect = new fabric.Rect({
                type: {
                    id: uuid ? uuid : uuidv4(),
                    originalEvent: {absolutePointer: e.absolutePointer},
                    type: "rectangle",
                    customizable: "shape",
                    saveKeepScale: true,
                },
                top: e.absolutePointer.y,
                left: e.absolutePointer.x,
                width: 380,
                height: 380,
                opacity: 0.25,
                fill: "#0080FFFF",
                zIndex: 7,
                hasBorders: false,
                lockMovementX: true,
                lockMovementY: true,
            });
            rect.setControlsVisibility({
                mt: true, mb: true, ml: true, mr: true, bl: true, br: true, tl: false, tr: false, mtr: true
            })

            if (otherObject) {
                rect.set({
                    angle: otherObject.angle,
                    top: otherObject.top,
                    left: otherObject.left,
                    width: otherObject.width,
                    height: otherObject.height,
                    scaleX: otherObject.scaleX,
                    scaleY: otherObject.scaleY,
                    fill: otherObject.fill,
                    opacity: otherObject.opacity,
                })
            }

            toAdd = rect;
        } else if (type === "circle") {
            const circle = new fabric.Circle({
                type: {
                    id: uuid ? uuid : uuidv4(),
                    originalEvent: {absolutePointer: e.absolutePointer},
                    type: "circle",
                    customizable: "shape",
                    saveKeepScale: true,
                },
                top: e.absolutePointer.y,
                left: e.absolutePointer.x,
                radius: 190,
                originX: "center",
                originY: "center",
                //centeredScaling: true,
                opacity: 0.25,
                fill: "#0080FFFF",
                zIndex: 7,
                hasBorders: false,
                lockMovementX: true,
                lockMovementY: true,
            });
            circle.setControlsVisibility({
                mt: true, mb: true, ml: true, mr: true, bl: true, br: true, tl: false, tr: false, mtr: true
            })

            if (otherObject) {
                circle.set({
                    angle: otherObject.angle,
                    top: otherObject.top,
                    left: otherObject.left,
                    width: otherObject.width,
                    height: otherObject.height,
                    scaleX: otherObject.scaleX,
                    scaleY: otherObject.scaleY,
                    fill: otherObject.fill,
                    opacity: otherObject.opacity,
                })
            }

            toAdd = circle;
        } else if (type === "measure-line") {
            const line = makeLine([
                e.absolutePointer.x, e.absolutePointer.y,
                e.absolutePointer.x + 380, e.absolutePointer.y
            ]);
            const c1 = makeCircle(line.get("x1"), line.get("y1"), null, line);
            const c2 = makeCircle(line.get("x2"), line.get("y2"), line, null);
            const text = new fabric.Text("400m", {
                selectable: false,
                evented: false,
                lockMovementX: true,
                lockMovementY: true,
                top: e.absolutePointer.y,
                left: e.absolutePointer.x + 380 / 2,
                fontSize: 18,
                backgroundColor: "rgb(34,34,34)",
                fill: "rgb(255,255,255)",
                zIndex: 9,
                opacity: 0.8,
            });
            line.set({
                type: {
                    id: uuid ? uuid : uuidv4(),
                    originalEvent: {absolutePointer: e.absolutePointer},
                    type: "measure-line",
                    text: text,
                    c1: c1,
                    c2: c2,
                    also: [text, c1, c2],
                }
            });

            if (otherObject) {
                line.set({
                    x1: otherObject.x1,
                    x2: otherObject.x2,
                    y1: otherObject.y1,
                    y2: otherObject.y2
                });
                const lineLength = distance(line.x1, line.y1, line.x2, line.y2);
                const meters = Math.trunc((100 * lineLength) / 190);
                const point = midpoint(line.x1, line.y1, line.x2, line.y2);
                line.type.text.set({
                    left: point[0],
                    top: point[1],
                    text: meters + "m"
                })
                c1.set({
                    left: line.get("x1"),
                    top: line.get("y1"),
                })
                c2.set({
                    left: line.get("x2"),
                    top: line.get("y2"),
                })
            }

            toAdd = line;
            alsoAdd = [text, c1, c2];
        }

        if (toAdd) {
            placed.push(toAdd);

            if (alsoAdd.length) {
                add(toAdd);
                for (let i = 0; i < alsoAdd.length; i++) {
                    add(alsoAdd[i]);
                }
                order();
            } else {
                addAndOrder(toAdd);
            }

            if (roomSendUpdate) {
                internal.updateStatesAndRender();
            }
            fixElementSelectBoxes();
            updateZoomScale();

            if (roomSendUpdate) {
                roomEditorUpdateElements()
            }
            return;
        }

        if (!placedMeta.hasOwnProperty(type)) {
            console.warn("no meta properties for type " + type)
            return;
        }

        fabric.Image.fromURL('', function (img) {
            console.log(img);

            const wh = placedMeta[type].wh;
            img.set({
                selectable: true,
                evented: true,
                hasBorders: false,
                lockMovementX: true,
                lockMovementY: true,
                zIndex: zIndex[type],
                originX: "center",
                originY: "center",
                centeredScaling: true,
                top: e.absolutePointer.y,
                left: e.absolutePointer.x,
                width: wh,
                height: wh,
            });
            // img.filters.push(new fabric.Image.filters.HueRotation({rotation: 2 * Math.random() - 1}))
            img.type = {
                id: uuid ? uuid : uuidv4(),
                type: type,
                modifier: modifier,
                originalEvent: {absolutePointer: e.absolutePointer}
            };
            if (otherObject) {
                img.set({
                    angle: otherObject.angle,
                    top: otherObject.top,
                    left: otherObject.left,
                });

                const side = idx(["type", "side"], otherObject);
                if (side) {
                    img.type.side = otherObject.type.side;
                }
                if (roomsMode && roomsRole === 'viewer') {
                    img.set({
                        selectable: false,
                        evented: false
                    })
                }
            }
            if (placedMeta[type].set) {
                img.set(placedMeta[type].set);
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
            if (roomSendUpdate) {
                internal.updateStatesAndRender();
            }
            fixElementSelectBoxes();
            updateZoomScale();

            if (roomSendUpdate) {
                roomEditorUpdateElements()
            }
        });
    }

    function add(object) {
        controls.fabricCanvas.add(object);
        controls.exportCanvas.add(object);
    }

    function order() {
        controls.fabricCanvas.orderByZindex();
    }

    function addAndOrder(object) {
        add(object);
        order();
    }

    const internal = {
        init: function () {
            controls.comboMapSelect = $("#map-select");
            controls.checkGrid = $("#grid-visible");
            controls.checkArty = $("#arty-visible");
            controls.checkArtyFlip = $("#flip-arty");
            controls.checkStrongpoints = $("#sp-visible");
            controls.checkSpResource = $("#sp-resource-visible");
            elements.strongpointGrid = $("#sp-grid");
            controls.checkDefaultGarries = $("#dg-visible");
            controls.checkPlacedGarries = $("#garry-visible");
            controls.checkGarryRadius = $("#garry-radius-visible");
            controls.btnRemoveAllElements = $("#remove-all-elements");
            controls.btnUndoLastElement = $("#undo-last-element");
            controls.btnEnableAll = $("#enableAll");
            controls.btnDisableAll = $("#disableAll");
            controls.btnSave = $("#save");
            elements.canvas = $("#canvas");
            elements.canvasParent = $("#canvas-container")[0];
            controls.checkSectors = $("#sector-visible");
            controls.checkSectorSwap = $("#swap-sector-color");
            controls.sectorRange = $("#sector-range");
            controls.checkZoomScale = $("#zoom-scale");

            elements.extraPanel = $("#extra-panel");
            elements.noSelection = $("#no-selection");
            elements.editShape = $("#edit-shape");
            elements.editAsset = $("#edit-asset");
            controls.textColor = $("#text-color");
            elements.textColorDiv = $("#text-color-div");
            controls.shapeBgColor = $("#shape-color");
            controls.rangeBgOpacity = $("#shape-opacity");
            elements.opacityValue = $("#shape-opacity-value");

            elements.viewerPanel = $("#viewer-panel");
            elements.editorPanel = $("#editor-panel");
            elements.joinPanel = $("#join-panel");
            elements.menuPanel = $("#menu-panel");
            elements.canvasPanel = $("#canvas-panel");
            controls.inputRoomId = $("#roomId");
            controls.inputViewerPassword = $("#viewerPassword");
            controls.inputEditorKey = $("#editorKey");
            elements.joinError = $("#joinError");
            controls.btnCreateJoin = $("#submitJoin");

            controls.btnExport = $("#export");
            controls.btnImport = $("#import");
            controls.importFileChooser = $("#importFileChooser");

            new ClipboardJS('.btn');

            if (elements.joinPanel[0]) {
                roomsMode = true;

                console.log("Rooms Mode");
                //socket = io('localhost:3000');
                socket = io('https://maps-let-loose-websocket.herokuapp.com/');
            } else {
                roomsMode = false;
                console.log("Solo Mode");
            }

            controls.checkZoomScale.click(function () {
                updateZoomScale();
            })

            controls.btnCreateJoin.click(function () {
                if (!roomsMode) {
                    return;
                }

                const payload = {
                    roomId: sanitize(controls.inputRoomId.val()),
                    viewerPassword: sanitize(controls.inputViewerPassword.val()),
                    editorKey: sanitize(controls.inputEditorKey.val())
                }

                if (!payload.roomId || !payload.roomId.length) {
                    console.warn('sanitized roomId was blank')
                    return;
                }

                socket.emit('create-or-join', payload);
            });

            if (roomsMode) {
                elements.menuPanel.hide();
                elements.extraPanel.hide();
                elements.canvasPanel.hide();

                controls.inputRoomId.val("Map-Session-" + Math.trunc(99999 * Math.random()))

                socket.on('room-status', function (message) {
                    console.log(message);

                    $(".connected").text(message.connected)
                    $(".editors").text(message.editors)
                    $(".viewers").text(message.viewers)
                })

                socket.on('join-error', function (message) {
                    console.warn('Join error')

                    elements.joinError.text(JSON.stringify(message));
                });

                socket.on('connect_error', function (error) {
                    console.warn('connect error')

                    elements.joinError.text(JSON.stringify(error));
                    controls.btnCreateJoin.prop('disabled', true);
                });

                async function checkRestart() {
                    if ($("#viewer-panel").is(":visible") || $("#editor-panel").is(":visible")) {
                        console.warn('server restart, room no longer exists')

                        $("#viewer-panel").hide();
                        $("#extra-panel").hide();
                        $("#editor-panel").hide();
                        $("#menu-panel").hide();
                        $("#canvas-panel").hide();
                        $("#join-panel").show();

                        $("#warning-panel").show();
                        $("#warn-reason").text("Either you lost connection or the rooms server restarted and the room no longer exists. Try joining again or create a new one.");

                        document.title = "Rooms - Maps Let Loose"
                    }
                }

                socket.on('connect', function (error) {
                    console.info('connected')

                    elements.joinError.text("");
                    controls.btnCreateJoin.prop('disabled', false);

                    checkRestart();
                });

                socket.on('join-success', function (message) {
                    console.log('join-success')
                    console.log(message)

                    $(".room-id").val(message.roomId);
                    $(".editor-key").val(message.editorKey);
                    $(".viewer-password").val(message.viewerPassword);

                    document.title = message.roomId + " - Rooms - Maps Let Loose"

                    $("#warning-panel").hide();
                    elements.joinPanel.hide();
                    elements.menuPanel.show();
                    if (message.role === 'editor') {
                        roomsRole = "editor";
                        $(".editor-div").show();
                        elements.editorPanel.show();
                        elements.viewerPanel.hide();
                        elements.extraPanel.show();

                        $("#shareLinkDisplay").val(
                            window.location.origin + window.location.pathname +
                            "?roomId=" + encodeURI(message.roomId || "") +
                            "&viewerPassword=" + encodeURI(message.viewerPassword || "") +
                            "&join=true");

                        const map = idx(["state", "controls", "map"], message) || "Carentan";
                        controls.comboMapSelect.val(map)
                        const filePrefix = controls.comboMapSelect.val();
                        internal.loadMap(filePrefix);
                    } else {
                        roomsRole = 'viewer'
                        $(".editor-div").hide();
                        elements.editorPanel.hide();
                        elements.viewerPanel.show();
                    }
                    elements.canvasPanel.show();

                    loadFromRoomState(message);
                });

                socket.on('update-controls', function (message) {
                    console.log('update-controls')
                    console.log(message);

                    loadFromRoomState(message);
                });
                socket.on('update-elements', function (message) {
                    console.log('update-elements')
                    console.log(message);

                    loadFromRoomState(message);
                });
                socket.on('update-drawings', function (message) {
                    console.log('update-drawings')
                    console.log(message);

                    loadFromRoomState(message);
                });

                $(document).on('click', '.leave-room', function () {
                    console.log('leave room')

                    socket.emit('leave-room');

                    $("#viewer-panel").hide();
                    $("#extra-panel").hide();
                    $("#editor-panel").hide();
                    $("#menu-panel").hide();
                    $("#canvas-panel").hide();
                    $("#join-panel").show();
                });

                socket.on('room-expired', function () {
                    console.log('current room expired, leaving')

                    $(".leave-room").click();

                    $("#warning-panel").show();
                    $("#warn-reason").text("The room you were in has expired. Create a new room or join another.");
                })

                socket.on('room-pw-change', function (message) {
                    console.log('room password changed');

                    if (roomsRole === 'viewer' && message && !message.blankPw) {
                        $(".leave-room").click();

                        $("#warning-panel").show();
                        $("#warn-reason").text("The password for the room was changed and is not blank. Ask an editor for the new password.");
                    }
                    if (roomsRole === 'editor') {
                        socket.emit('editor-get-pw', {
                            roomId: controls.inputRoomId.val(),
                            editorKey: $("#editorKeyDisplay").val()
                        });
                    }
                });

                socket.on('editor-get-pw', function (message) {
                    console.log('editor retrieve new pw');

                    $("#editor-update-pw").prop('disabled', true);
                    $("#editor-viewer-pw").val(message.viewerPassword);
                    $("#shareLinkDisplay").val(
                        window.location.origin + window.location.pathname +
                        "?roomId=" + encodeURI(message.roomId || "") +
                        "&viewerPassword=" + encodeURI(message.viewerPassword || "") +
                        "&join=true");
                });

                $("#editor-viewer-pw").on('keyup', function () {
                    $("#editor-update-pw").prop('disabled', false);

                    $("#editor-viewer-pw").val(sanitize($("#editor-viewer-pw").val()));
                })

                $("#editor-update-pw").click(function () {
                    if (roomsRole === 'viewer') {
                        return;
                    }
                    socket.emit('update-room-pw', {
                        roomId: sanitize(controls.inputRoomId.val()),
                        editorKey: sanitize($("#editorKeyDisplay").val()),
                        viewerPassword: sanitize($("#editor-viewer-pw").val())
                    });
                });
                $("#editor-update-pw").prop('disabled', true);
            }

            controls.fabricCanvas = new fabric.Canvas(elements.canvas.get(0), {
                selection: false,
                fireRightClick: true,
                stopContextMenu: false,
                preserveObjectStacking: true,
                enableRetinaScaling: false,
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

            const menuActions = {
                garrison: function () {
                    mll.menuAdd("garry")
                },
                // Spawn
                airhead: function () {
                    mll.menuAdd("airhead")
                },
                halftrack: function () {
                    mll.menuAdd("halftrack")
                },
                outpost: function () {
                    mll.menuAdd("outpost", "normal")
                },
                recon_op: function () {
                    mll.menuAdd("outpost", "recon")
                },
                // Vehicle
                tank_heavy: function () {
                    mll.menuAdd("tank", "heavy")
                },
                tank_medium: function () {
                    mll.menuAdd("tank", "med")
                },
                tank_light: function () {
                    mll.menuAdd("tank", "light")
                },
                tank_recon: function () {
                    mll.menuAdd("tank", "recon")
                },
                truck_supply: function () {
                    mll.menuAdd("truck", "supply")
                },
                truck_transport: function () {
                    mll.menuAdd("truck", "transport")
                },
                // Player Class
                class_commander: function () {
                    mll.menuAdd("class", "commander")
                },
                class_officer: function () {
                    mll.menuAdd("class", "officer")
                },
                class_rifleman: function () {
                    mll.menuAdd("class", "rifleman")
                },
                class_assault: function () {
                    mll.menuAdd("class", "assault")
                },
                class_auto_rifleman: function () {
                    mll.menuAdd("class", "auto-rifleman")
                },
                class_medic: function () {
                    mll.menuAdd("class", "medic")
                },
                class_support: function () {
                    mll.menuAdd("class", "support")
                },
                class_machine_gunner: function () {
                    mll.menuAdd("class", "machine-gunner")
                },
                class_anti_tank: function () {
                    mll.menuAdd("class", "anti-tank")
                },
                class_engineer: function () {
                    mll.menuAdd("class", "engineer")
                },
                class_spotter: function () {
                    mll.menuAdd("class", "spotter")
                },
                class_sniper: function () {
                    mll.menuAdd("class", "sniper")
                },
                // Buildable
                at_gun: function () {
                    mll.menuAdd("at-gun")
                },
                repair_station: function () {
                    mll.menuAdd("repair-station")
                },
                node_batch: function () {
                    mll.menuAdd("node", "batch")
                },
                node_manpower: function () {
                    mll.menuAdd("node", "manpower")
                },
                node_munition: function () {
                    mll.menuAdd("node", "munition")
                },
                node_fuel: function () {
                    mll.menuAdd("node", "fuel")
                },
                // Placeable
                supply_50: function () {
                    mll.menuAdd("supplies", "50")
                },
                supply_50x2: function () {
                    mll.menuAdd("supplies", "50x2")
                },
                supply_100: function () {
                    mll.menuAdd("supplies", "100")
                },
                supply_150: function () {
                    mll.menuAdd("supplies", "150")
                },
                supply_150x2: function () {
                    mll.menuAdd("supplies", "150x2")
                },
                // Marker
                enemy_garrison: function () {
                    mll.menuAdd("enemy", "garry")
                },
                enemy_infantry: function () {
                    mll.menuAdd("enemy", "infantry")
                },
                enemy_outpost: function () {
                    mll.menuAdd("enemy", "op")
                },
                enemy_tank: function () {
                    mll.menuAdd("enemy", "tank")
                },
                enemy_vehicle: function () {
                    mll.menuAdd("enemy", "vehicle")
                },
                // Command Ability
                supply_drop: function () {
                    mll.menuAdd("supply-drop");
                },
                ammo_drop: function () {
                    mll.menuAdd("ammo-drop");
                },
                reinforce: function () {
                    mll.menuAdd("reinforce");
                },
                recon_plane: function () {
                    mll.menuAdd("recon-plane");
                },
                precision_strike: function () {
                    mll.menuAdd("precision-strike");
                },
                strafing_run: function () {
                    mll.menuAdd("strafing-run");
                },
                bombing_run: function () {
                    mll.menuAdd("bombing-run");
                },
                katyusha_strike: function () {
                    mll.menuAdd("katyusha-strike");
                },
                // Custom
                measure_radius: function () {
                    mll.menuAdd("measure-radius")
                },
                measure_line: function () {
                    mll.menuAdd("measure-line")
                },
                rectangle: function () {
                    mll.menuAdd("rectangle")
                },
                circle: function () {
                    mll.menuAdd("circle")
                },
                textbox: function () {
                    mll.menuAdd("textbox")
                },
            };

            $.contextMenu({
                selector: "canvas",
                callback: function (key, options) {
                    console.log(key);
                    console.log(options);

                    if (menuActions.hasOwnProperty(key)) {
                        menuActions[key]();
                    }
                },
                animation: {duration: 5, show: 'fadeIn', hide: 'fadeOut'},
                items: {
                    garrison: {name: "Add Garrison", icon: "bi bi-flag"},
                    spawn: {
                        name: "Add Spawn",
                        items: {
                            airhead: {name: "Airhead", icon: "bi bi-triangle-fill"},
                            halftrack: {name: "Halftrack"},
                            outpost: {name: "Outpost", icon: "bi bi-triangle"},
                            recon_op: {name: "Recon Outpost", icon: "bi bi-triangle-half"}
                        }
                    },
                    vehicle: {
                        name: "Add Vehicle",
                        icon: "bi bi-truck",
                        items: {
                            tank_heavy: {name: "Heavy Tank", icon: "bi bi-three-dots"},
                            tank_medium: {name: "Medium Tank"},
                            tank_light: {name: "Light Tank", icon: "bi bi-dot"},
                            tank_recon: {name: "Recon Tank", icon: "bi bi-camera"},
                            truck_supply: {name: "Supply Truck"},
                            truck_transport: {name: "Transport Truck"},
                        }
                    },
                    infatry_class: {
                        name: "Add Player Class",
                        icon: "bi bi-person-circle",
                        items: {
                            class_commander: {name: "Commander", icon: "bi bi-diagram-2-fill"},
                            class_officer: {name: "Officer", icon: "bi bi-chevron-double-down"},
                            class_rifleman: {name: "Rifleman", icon: "bi bi-x-lg"},
                            class_assault: {name: "Assault", icon: "bi bi-lightning-charge"},
                            class_auto_rifleman: {name: "Automatic Rifleman", icon: "bi bi-chevron-bar-contract"},
                            class_medic: {name: "Medic", icon: "bi bi-plus-lg"},
                            class_support: {name: "Support", icon: "bi bi-record-circle"},
                            class_machine_gunner: {name: "Machine Gunner"},
                            class_anti_tank: {name: "Anti-Tank", icon: "bi bi-chevron-double-up"},
                            class_engineer: {name: "Engineer"},
                            class_spotter: {name: "Spotter", icon: "bi bi-triangle-half"},
                            class_sniper: {name: "Sniper", icon: "bi bi-bullseye"},
                        }
                    },
                    buildable: {
                        name: "Add Buildable",
                        icon: "bi bi-hammer",
                        items: {
                            at_gun: {name: "AT Gun"},
                            repair_station: {name: "Repair Station", icon: "bi bi-wrench"},
                            node_batch: {name: "Batch of Nodes", icon: "bi bi-x-diamond"},
                            node_manpower: {name: "Manpower Node", icon: "bi bi-diamond"},
                            node_munition: {name: "Munitions Node", icon: "bi bi-diamond"},
                            node_fuel: {name: "Fuel Node", icon: "bi bi-diamond"},
                        }
                    },
                    placeable: {
                        name: "Add Placeable",
                        items: {
                            // ammo_box: {name: "Ammo Box"},
                            // explosive_box: {name: "Explosive Box"},
                            // bandage_box: {name: "Bandage Box"},
                            supply_50: {name: "Supplies (50)", icon: "bi bi-tools"},
                            supply_50x2: {name: "Supplies (50 x 2)", icon: "bi bi-tools"},
                            supply_100: {name: "Supplies (100)", icon: "bi bi-tools"},
                            supply_150: {name: "Supplies (150)", icon: "bi bi-tools"},
                            supply_150x2: {name: "Supplies (150 x 2)", icon: "bi bi-tools"},
                        }
                    },
                    marker: {
                        name: "Add Marker",
                        icon: "bi bi-geo-alt",
                        items: {
                            enemy_garrison: {name: "Enemy Garrison", icon: "bi bi-flag"},
                            enemy_infantry: {name: "Enemy Infantry"},
                            enemy_outpost: {name: "Enemy Outpost", icon: "bi bi-triangle"},
                            enemy_tank: {name: "Enemy Tank"},
                            enemy_vehicle: {name: "Enemy Light Vehicle"},
                        }
                    },
                    ability: {
                        name: "Add Command Ability",
                        icon: "bi bi-telephone-outbound",
                        items: {
                            supply_drop: {name: "Supply Drop", icon: "bi bi-box2"},
                            ammo_drop: {name: "Ammo Drop", icon: "bi bi-box2"},
                            // recon_plane: {name: "Recon Plane", icon: "bi bi-camera", disabled: true},
                            precision_strike: {name: "Precision Strike", icon: "bi bi-arrow-down-circle"},
                            strafing_run: {name: "Strafing Run", icon: "bi bi-file-arrow-up"},
                            bombing_run: {name: "Bombing Run", icon: "bi bi-file-arrow-up"},
                            katyusha_strike: {name: "Katyusha Strike", icon: "bi bi-arrow-down-circle"},
                        }
                    },
                    objects: {
                        name: "Add Custom Object",
                        icon: "bi bi-bounding-box-circles",
                        items: {
                            measure_radius: {name: "Measure Radius", icon: "bi bi-plus-circle-dotted"},
                            measure_line: {name: "Measure Line", icon: "bi bi-rulers"},
                            rectangle: {name: "Rectangle", icon: "bi bi-square"},
                            circle: {name: "Circle", icon: "bi bi-circle"},
                            textbox: {name: "Textbox", icon: "bi bi-textarea-t"}
                        }
                    },
                    cancel: {name: "Cancel"}
                }
            })

            const eCanvas = document.createElement("canvas");
            controls.exportCanvas = new fabric.Canvas(eCanvas, {
                scale: 1,
                width: 1920,
                height: 1920
            });

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
            fabric.Image.fromURL('./assets/plain-grid.png', function (img) {
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
                const target = transform.target;

                for (let i = 0; i < placed.length; i++) {
                    if (placed[i].type.id === target.type.id) {
                        placed.splice(i, 1);
                        break;
                    }
                }

                controls.fabricCanvas.remove(target);
                controls.exportCanvas.remove(target);
                if (target.type && target.type.also) {
                    const also = target.type.also;
                    for (let j = 0; j < also.length; j++) {
                        controls.fabricCanvas.remove(also[j]);
                        controls.exportCanvas.remove(also[j]);
                    }
                }
                controls.fabricCanvas.requestRenderAll();

                roomEditorUpdateElements();
            }

            function renderIcon(ctx, left, top, styleOverride, fabricObject) {
                const size = this.cornerSize;
                ctx.save();
                ctx.translate(left, top);
                ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
                ctx.drawImage(deleteImg, -size / 2, -size / 2, size, size);
                ctx.restore();
            }

            function renderIconDrag(ctx, left, top, styleOverride, fabricObject) {
                const size = this.cornerSize;
                ctx.save();
                ctx.translate(left, top);
                ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
                ctx.drawImage(dragImg, -size / 2, -size / 2, size, size);
                ctx.restore();
            }

            controls.fabricCanvas.on('object:moving', function (e) {
                const p = e.target;
                if (p && p.type && p.type.type === "measure-line-circle") {
                    p.line1 && p.line1.set({'x2': p.left, 'y2': p.top});
                    p.line2 && p.line2.set({'x1': p.left, 'y1': p.top});
                    p.line3 && p.line3.set({'x1': p.left, 'y1': p.top});
                    p.line4 && p.line4.set({'x1': p.left, 'y1': p.top});

                    const line = (p.line1 || p.line2 || p.line3 || p.line4);
                    const lineLength = distance(line.x1, line.y1, line.x2, line.y2);
                    const meters = Math.trunc((100 * lineLength) / 190);
                    const point = midpoint(line.x1, line.y1, line.x2, line.y2);
                    line.type.text.set({
                        left: point[0],
                        top: point[1],
                        text: meters + "m"
                    })

                    controls.fabricCanvas.requestRenderAll();
                }
            });

            controls.fabricCanvas.on('object:modified', function (e) {
                console.log("object:modified")
                console.log(e.target);
                internal.updateStatesAndRender();
                roomEditorUpdateElements();
            });

            controls.fabricCanvas.on({
                'selection:created': handleSelection,
                'selection:updated': handleSelection
            });

            function handleSelection(e) {
                elements.editShape.hide();
                elements.editAsset.hide();
                elements.noSelection.show();

                const type = idx(["e", "type"], e);
                if (!type) {
                    // object select box fix will trigger selection event, ignore
                    return;
                }
                if (type === "mousedown") {
                    selectedElement = idx(["selected", 0], e);
                    const type = idx(["type", "type"], selectedElement);
                    const meta = idx([type, "customizable"], placedMeta);
                    const customizable = idx(["type", "customizable"], selectedElement) || meta;
                    if (!customizable) {
                        return;
                    }

                    console.log("customizable element selected");
                    console.log(selectedElement);

                    if (customizable === "shape") {
                        const elType = idx(["type", "type"], selectedElement);
                        if (elType === "textbox") {
                            elements.textColorDiv.show();
                            controls.textColor.val((selectedElement.fill || "").substring(0, 7));
                            controls.shapeBgColor.val((selectedElement.backgroundColor || "").substring(0, 7));
                        } else {
                            elements.textColorDiv.hide();
                            controls.shapeBgColor.val((selectedElement.fill || "").substring(0, 7));
                        }

                        controls.rangeBgOpacity.val(selectedElement.opacity);
                        elements.opacityValue.text(selectedElement.opacity);

                        elements.noSelection.hide();
                        elements.editShape.show();
                    } else {
                        $(".asset-side").removeClass("selected");
                        const filters = selectedElement.filters;
                        if (filters && filters.length) {
                            $(".asset-side.red").addClass("selected");
                        } else {
                            $(".asset-side.blue").addClass("selected");
                        }

                        elements.noSelection.hide();
                        elements.editAsset.show();
                    }
                }
            }

            $(document).on('click', '.asset-side', function (e) {
                $(".asset-side").removeClass("selected");
                const clicked = $(e.target);
                clicked.addClass("selected");
                if (!selectedElement) {
                    return;
                }

                if (clicked.hasClass("blue")) {
                    selectedElement.type.side = "friendly";
                } else {
                    selectedElement.type.side = "enemy";
                }

                internal.updateStatesAndRender();
                roomEditorUpdateElements();
            })

            controls.textColor.change(function () {
                const elType = idx(["type", "type"], selectedElement);
                if (elType !== "textbox") {
                    console.log("no selected element or was not a textbox");
                    return;
                }

                selectedElement.set({
                    fill: controls.textColor.val()
                });

                internal.render();
                roomEditorUpdateElements();
            });

            controls.shapeBgColor.change(function () {
                if (!selectedElement) {
                    console.log("no selected element");
                    return;
                }
                const elType = idx(["type", "type"], selectedElement);

                if (elType === "textbox") {
                    selectedElement.set({
                        backgroundColor: controls.shapeBgColor.val()
                    });
                } else {
                    selectedElement.set({
                        fill: controls.shapeBgColor.val()
                    });
                }

                internal.render();
                roomEditorUpdateElements();
            })

            controls.rangeBgOpacity.on('input', function () {
                if (!selectedElement) {
                    console.log("no selected element");
                    return;
                }

                elements.opacityValue.text(controls.rangeBgOpacity.val());

                selectedElement.set({
                    opacity: controls.rangeBgOpacity.val()
                });

                internal.render();
                roomEditorUpdateElements();
            })

            controls.fabricCanvas.on('selection:cleared', function (e) {
                selectedElement = null;

                elements.editShape.hide();
                elements.editAsset.hide();
                elements.noSelection.show();
            });

            controls.fabricCanvas.on('object:scaling', function (e) {
                const object = e.target;
                const meta = object.type;
                if (meta.type === "measure-radius") {
                    const textEl = idx(["type", "text"], object);
                    const textEl2 = idx(["type", "text2"], object);
                    if (!textEl) {
                        console.log("no text");
                    } else {
                        const meters = Math.trunc((100 * object.getScaledWidth()) / 190);
                        textEl.set({
                            text: meters + "m"
                        });

                        if (textEl2) {
                            textEl2.set({
                                text: meters + "m"
                            });
                        }
                    }
                }
            });

            controls.fabricCanvas.on('mouse:dblclick', function (e) {
                if (roomsMode && roomsRole === 'viewer') {
                    return;
                }

                addMapElement(e, 'garry', null, true);
            });

            controls.btnRemoveAllElements.on('click', function () {
                console.log('Remove all element')

                while (placed.length > 0) {
                    const element = placed.pop();

                    controls.fabricCanvas.remove(element);
                    controls.exportCanvas.remove(element);

                    if (element.type && element.type.also) {
                        const also = element.type.also;
                        for (let j = 0; j < also.length; j++) {
                            controls.fabricCanvas.remove(also[j]);
                            controls.exportCanvas.remove(also[j]);
                        }
                    }
                }

                roomEditorUpdateElements()
            })

            controls.btnUndoLastElement.on('click', function () {
                console.log('Undo last element')

                const element = placed.pop();
                if (element) {
                    controls.fabricCanvas.remove(element);
                    controls.exportCanvas.remove(element);

                    if (element.type && element.type.also) {
                        const also = element.type.also;
                        for (let j = 0; j < also.length; j++) {
                            controls.fabricCanvas.remove(also[j]);
                            controls.exportCanvas.remove(also[j]);
                        }
                    }
                }

                roomEditorUpdateElements()
            });

            const drawingModeEl = $('#drawing-mode'),
                drawingColorEl = $('#drawing-color'),
                drawingLineWidthEl = $('#drawing-line-width'),
                clearEl = $('#clear-paths'),
                undoEl = $("#undo-path");

            controls.checkDrawingsVisible = $("#drawing-visible");

            drawingModeEl.on('click', function () {
                controls.fabricCanvas.isDrawingMode = !controls.fabricCanvas.isDrawingMode;
                if (controls.fabricCanvas.isDrawingMode) {
                    drawingModeEl.text('Stop drawing mode');
                    $("canvas").addClass("draw-mode").removeClass('drag-mode');
                } else {
                    drawingModeEl.text('Start drawing mode');
                    $("canvas").removeClass("draw-mode").addClass('drag-mode');
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
            drawingLineWidthEl.on('input', function () {
                const value = drawingLineWidthEl.val();
                controls.fabricCanvas.freeDrawingBrush.width = parseInt(value, 10) || 1;
                $("#line-width-value").text(value);
            });
            drawingLineWidthEl.trigger('input');

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

                roomEditorUpdateDrawings();
            });

            undoEl.click(function () {
                console.log("Undo last drawing");

                const path = drawings.pop();
                controls.fabricCanvas.remove(path);
                controls.exportCanvas.remove(path);

                roomEditorUpdateDrawings();
            })

            clearEl.click(function () {
                console.log("Clear all drawings");

                while (drawings.length) {
                    const path = drawings.pop();
                    controls.fabricCanvas.remove(path);
                    controls.exportCanvas.remove(path);
                }

                roomEditorUpdateDrawings();
            });

            $(document).on('keypress', function (e) {
                if (e.shiftKey && String.fromCharCode(e.which).toLowerCase() === 'd') {
                    if (roomsMode && roomsRole === 'viewer') {
                        return;
                    }

                    console.log("Shift+D")
                    drawingModeEl.click();
                }
            })
            $(document).on('keyup', function (e) {
                if (roomsMode && roomsRole === 'viewer') {
                    return;
                }
                if ((e.ctrlKey || e.shiftKey) && e.keyCode === 37) {
                    console.log("Ctrl+" + e.keyCode)
                    controls.sectorRange.val(Number(controls.sectorRange.val()) - 1);
                    controls.sectorRange.trigger('input');
                }
                if ((e.ctrlKey || e.shiftKey) && e.keyCode === 39) {
                    console.log("Ctrl+" + e.keyCode)
                    controls.sectorRange.val(Number(controls.sectorRange.val()) + 1);
                    controls.sectorRange.trigger('input');
                }
            })

            internal.setupPage();
        },

        setupPage: function () {
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    elements.strongpointGrid.append(`<div class='sp-toggle sp-toggle-${x}${y} unavailable' data-x='${x}' data-y='${y}'></div>`)
                }
            }

            $(document).on('click tap', '.sp-toggle', function (e) {
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
                roomEditorUpdateControls("selectedSp=" + getSelectedSp());
            });

            controls.btnEnableAll.click(function () {
                $(".sp-toggle.available").addClass("selected");

                internal.updateStatesAndRender();
                roomEditorUpdateControls("btnEnableAll");
            });

            controls.btnDisableAll.click(function () {
                $(".sp-toggle.available").removeClass("selected");

                internal.updateStatesAndRender();
                roomEditorUpdateControls("btnDisableAll");
            });

            let panning = false;
            controls.fabricCanvas.on('mouse:up', function (e) {
                if (e.e.touches) {return;}
                panning = false;
            });
            controls.fabricCanvas.on('mouse:down', function (e) {
                if (e.e.touches) {
                    contextMenuEvent = e; // store absolutePointer for mobile longpress
                    return;
                }
                console.log(e);
                if (e.button === 3) {
                    if (roomsMode && roomsRole === 'viewer') {
                        return;
                    }

                    contextMenuEvent = e;
                } else if (e.target && e.target.type && e.target.type.allowDrag) {
                    panning = false;
                } else if (e.target && e.target.selectable === true && e.target.lockMovementX === false ||
                    e.transform && (e.transform.action === 'rotate' || e.transform.action.indexOf('scale') !== -1) ||
                    controls.fabricCanvas.isDrawingMode === true) {
                    // Dragging element
                    panning = false;
                } else {
                    panning = true;
                }
            });
            controls.fabricCanvas.on('mouse:move', function (e) {
                if (e.e.touches) {return;}
                if (panning && e && e.e && (e.e.movementX || e.e.movementY)) {
                    const delta = new fabric.Point(e.e.movementX, e.e.movementY);
                    controls.fabricCanvas.relativePan(delta);
                }
            });

            // Look into https://stackoverflow.com/a/45131912/2650847
            let pausePanning = false, currentX, currentY, xChange, yChange, lastX, lastY, prevDiff;
            controls.fabricCanvas.on({
                'touch:gesture': function (e) {
                    if (!e.e.touches) {return;}
                    try {
                        if (e.e.touches && e.e.touches.length == 2 && !pausePanning) {
                            // console.log(e);
                            pausePanning = true;

                            const touch1 = e.e.touches[0];
                            const touch2 = e.e.touches[1];
                            const mid = midpoint(touch1.clientX, touch1.clientY, touch2.clientX, touch2.clientY);
                            const curDiff = Math.max(Math.abs(touch1.clientX - touch2.clientX),
                                Math.abs(touch1.clientY - touch2.clientY));
                            const point = new fabric.Point(mid[0], mid[1]);

                            let zoom = controls.fabricCanvas.getZoom();
                            if (prevDiff > 8) {
                                //console.log(curDiff)
                                if (curDiff > prevDiff) {
                                    zoom += 0.015;
                                }
                                if (curDiff < prevDiff) {
                                    zoom -= 0.015;
                                }
                            }
                            if (zoom > 1.6) zoom = 1.6;
                            if (zoom < 0.15) zoom = 0.15;
                            //console.log(zoom);
                            controls.fabricCanvas.zoomToPoint(point, zoom);

                            pausePanning = false;
                            prevDiff = curDiff;
                        }
                    } catch (e) {
                        pausePanning = false;
                        console.error(e);
                    }
                },
                'touch:drag': function (e) {
                    if (!e.e.touches) {return;}
                    if (e.target && e.target.selectable === true && e.target.lockMovementX === false ||
                        e.transform && (e.transform.action === 'rotate' || e.transform.action.indexOf('scale') !== -1) ||
                        controls.fabricCanvas.isDrawingMode === true) {
                        return;
                    }
                    if (pausePanning !== true && e.self.x && e.self.y) {
                        currentX = e.self.x;
                        currentY = e.self.y;
                        xChange = currentX - lastX;
                        yChange = currentY - lastY;

                        const distX = Math.abs(currentX - lastX);
                        const distY = Math.abs(currentY - lastY);
                        if ((distX > 1 || distY > 1) && distX <= 50 && distY <= 50) {
                            const delta = new fabric.Point(xChange, yChange);
                            controls.fabricCanvas.relativePan(delta);
                        }

                        lastX = e.self.x;
                        lastY = e.self.y;
                    }
                },
                'touch:longpress': function (e) {
                    if (!e.e.touches) {return;}

                    return;

                    if (e.e.type === "touchstart") {
                        $("canvas").trigger(jQuery.Event("contextmenu", {}))
                    }
                }
            });

            controls.fabricCanvas.on('mouse:wheel', function (opt) {
                var delta = opt.e.deltaY;
                var zoom = controls.fabricCanvas.getZoom();
                zoom *= 0.999 ** delta;
                if (zoom > 10) zoom = 10;
                if (zoom < 0.15) zoom = 0.15;
                controls.fabricCanvas.zoomToPoint({x: opt.e.offsetX, y: opt.e.offsetY}, zoom);
                opt.e.preventDefault();
                opt.e.stopPropagation();

                fixElementSelectBoxes();
                updateZoomScale();
            });

            // TODO https://codepen.io/durga598/pen/gXQjdw?editors=0010

            elements.spImage = new Image();
            elements.spImage.onload = loadStrongpoints;
            elements.spImage.onerror = function () {
                for (let i = 0; i < elements.strongpoints.length; i++) {
                    for (let j = 0; j < elements.strongpoints[i].length; j++) {
                        elements.strongpoints[i][j].setSrc('')
                    }
                }
            }

            function loadStrongpoints() {
                console.log("loadStrongpoints(" + elements.spImage.src + ")")
                const filePrefix = controls.comboMapSelect.val();

                initStrongpointData(filePrefix);

                for (let x = 0; x < 5; x++) {
                    for (let y = 0; y < 5; y++) {
                        const toggle = $(".sp-toggle-" + x + y);
                        if (pointCoords[filePrefix][x][y] == null) {
                            toggle.removeClass("selected").removeClass('available').addClass('unavailable');
                            continue;
                        }

                        toggle.addClass('available').removeClass('unavailable')

                        if (resetSelectedPoints) {
                            toggle.addClass('selected');
                        }
                    }
                }

                let wasRoomEvent = false;
                if (elements.spImage.roomsSelectedSp) {
                    $(".sp-toggle.available").removeClass('selected');
                    for (let i = 0; i < elements.spImage.roomsSelectedSp.length; i++) {
                        $(".sp-toggle-" + elements.spImage.roomsSelectedSp[i]).addClass('selected');
                    }
                    delete elements.spImage.roomsSelectedSp;
                    wasRoomEvent = true;
                }

                if (!wasRoomEvent && roomsMode && roomsRole === "editor") {
                    roomEditorUpdateControls("loadStrongpoints editor");
                }

                resetSelectedPoints = false;

                internal.updateStatesAndRender();

                if (elements.spImage.spCallback) {
                    elements.spImage.spCallback();
                    delete elements.spImage.spCallback;
                }
            }

            function initStrongpointData(filePrefix) {
                const resourceChecked = controls.checkSpResource.is(":checked");
                const strongpointKey = filePrefix + resourceChecked;
                if (pointCutoutData.hasOwnProperty(strongpointKey)) {
                    return;
                }

                console.log("initStrongpoints('" + strongpointKey + "')")

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

                                context.drawImage(elements.spImage, rect[0], rect[1], rect[2], rect[3], dx, dy, dw, dh);
                            }

                            pointData["dataUrl"] = tempCanvas.toDataURL();
                            pointData["position"] = {top: top, left: left, width: width, height: height}
                            pointData["visible"] = true;
                        }

                        data['' + x + y] = pointData;
                    }
                }

                console.log(data);

                pointCutoutData[strongpointKey] = data;
            }

            internal.loadMap = function (filePrefix) {
                if (lastLoadedMap === filePrefix) {
                    return;
                }
                lastLoadedMap = filePrefix;
                resetSelectedPoints = true;

                console.log("Loading " + filePrefix)

                elements.map.setSrc('./assets/no-grid/' + filePrefix + '_NoGrid.png', internal.render);
                elements.defaultgarries.setSrc('./assets/defaultgarries/' + filePrefix + '_defaultgarries.png', internal.render)
                let artySuffix = controls.checkArtyFlip.is(":checked") ? 2 : 1;
                elements.arty.setSrc('./assets/arty/' + filePrefix + '_Arty' + artySuffix + '.png', internal.render)
                elements.spImage.src = './assets/points/' + filePrefix + '_SP_NoMap' + (controls.checkSpResource.is(":checked") ? 3 : 2) + '.png';
            }

            internal.roomsLoadMapAndSP = function (filePrefix, selectedSp, spCallback) {
                resetSelectedPoints = true;

                console.log("Rooms loading " + filePrefix);

                const promises = [
                    new Promise(function (resolve) {
                        const imgSrc = './assets/no-grid/' + filePrefix + '_NoGrid.png';
                        if (elements.map.src !== imgSrc) {
                            elements.map.setSrc(imgSrc, resolve);
                        } else {
                            resolve();
                        }
                    }),
                    new Promise(function (resolve) {
                        const imgSrc = './assets/defaultgarries/' + filePrefix + '_defaultgarries.png';
                        if (elements.defaultgarries.src !== imgSrc) {
                            elements.defaultgarries.setSrc(imgSrc, resolve);
                        } else {
                            resolve();
                        }
                    }),
                    new Promise(function (resolve) {
                        const artySuffix = controls.checkArtyFlip.is(":checked") ? 2 : 1;
                        const imgSrc = './assets/arty/' + filePrefix + '_Arty' + artySuffix + '.png';
                        if (elements.arty.src !== imgSrc) {
                            elements.arty.setSrc(imgSrc, resolve);
                        } else {
                            resolve();
                        }
                    })
                ];
                Promise.all(promises).then(internal.render);

                elements.spImage.spCallback = spCallback;
                elements.spImage.roomsSelectedSp = selectedSp;
                elements.spImage.src = './assets/points/' + filePrefix + '_SP_NoMap' + (controls.checkSpResource.is(":checked") ? 3 : 2) + '.png';
            }

            controls.comboMapSelect.change(function () {
                if (roomsMode && roomsMode === "viewer") {
                    return;
                }

                const filePrefix = controls.comboMapSelect.val();
                internal.loadMap(filePrefix);

                roomEditorUpdateControls(controls.comboMapSelect);
            });
            controls.checkSpResource.change(function () {
                if (roomsMode && roomsMode === "viewer") {
                    return;
                }
                const filePrefix = controls.comboMapSelect.val();
                elements.spImage.src = './assets/points/' + filePrefix + '_SP_NoMap' + (controls.checkSpResource.is(":checked") ? 3 : 2) + '.png';
            })
            if (!roomsMode) {
                controls.comboMapSelect.trigger('change');
            }

            [controls.checkGrid, controls.checkArty, controls.checkStrongpoints, controls.checkDefaultGarries,
                controls.checkSectors, controls.checkSectorSwap, controls.checkPlacedGarries, controls.checkGarryRadius,
                controls.checkArtyFlip, controls.checkSpResource, controls.checkDrawingsVisible
            ].forEach(function (control) {
                control.change(function () {
                    internal.updateStatesAndRender();

                    roomEditorUpdateControls(control);
                });
            });

            controls.btnSave.click(function () {
                for (let i = 0; i < placed.length; i++) {
                    const element = placed[i];
                    if (idx(["type", "saveKeepScale"], element)) {
                        continue;
                    }
                    placed[i].set({scaleX: 1, scaleY: 1});
                }



                $('<a>').attr({
                    href: controls.exportCanvas.toDataURL(),
                    download: controls.comboMapSelect.val() + "_Custom_MLL.png"
                })[0].click();

                updateZoomScale();
            });

            let lastRangeVal = controls.sectorRange.val();
            controls.sectorRange.on('input', function () {
                if (controls.sectorRange.val() !== lastRangeVal) {
                    lastRangeVal = controls.sectorRange.val();

                    roomEditorUpdateControls(controls.sectorRange);
                    internal.updateStatesAndRender();
                }
            })

            new ResizeObserver(() => {
                controls.fabricCanvas.setWidth(elements.canvasParent.clientWidth)
                controls.fabricCanvas.setHeight(elements.canvasParent.clientHeight)
            }).observe(document.getElementById("canvas-container"));

            controls.btnExport.on('click', async function () {
                controls.btnExport.addClass("loading").addClass("disabled");

                controls.exportCanvas.renderAll();
                controls.exportCanvas.orderByZindex();

                const zip = new JSZip();
                console.log("Creating about.txt...")
                zip.file("about.txt",
                    "Downloaded by Maps Let Loose " + new Date().toLocaleString() + "\n\n" +
                    "URL: " + window.location
                );

                console.log("Creating mll_config.json...");
                zip.file("mll_config.json", JSON.stringify(getFullState(), null, 4));

                const fileName = "mll_" + controls.comboMapSelect.val().toLowerCase() + "_" + moment().format("YYYYMMDD-HHmmss");
                console.log("Saving as " + fileName);
                zip.generateAsync({
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: {
                        level: 9
                    }
                }).then(function (content) {
                    saveAs(content, fileName);

                    controls.btnExport.removeClass("loading").removeClass("disabled");
                });
            });

            // Drag & Drop listener
            document.addEventListener("dragover", function (event) {
                event.preventDefault();
            });
            document.documentElement.addEventListener('drop', async function (e) {
                e.stopPropagation();
                e.preventDefault();

                let file = e.dataTransfer.files[0];
                console.log("Loading file");
                console.log(file);

                importFile(file);
            });

            controls.importFileChooser.on('change', function (event) {
                console.log(event);

                let file = event.target.files[0];

                if (file) {
                    controls.inputValue.val(file.name);
                } else {
                    return;
                }

                importFile(file);
            });

            function importFile(file) {
                console.log("Importing from file " + file.name);

                if (roomsMode && roomsRole === "viewer") {
                    console.log("Viewer cannot import, ignoring")
                    return;
                }

                controls.btnImport.addClass("loading").addClass("disabled");

                JSZip.loadAsync(file).then(function (content) {
                    const file = content.file("mll_config.json");
                    return file ? file.async("string") : null;
                }).then(function (text) {
                    if (!text) {
                        console.log("file was empty?")
                        return;
                    }
                    const content = JSON.parse(text);
                    loadFromRoomState(content, function () {
                        roomEditorUpdateControls("importFile")
                        roomEditorUpdateElements();
                        roomEditorUpdateDrawings();
                    });

                    controls.btnImport.removeClass("loading").removeClass("disabled");
                });
            }

            internal.pageReady();
        },

        pageReady: function () {
            const query = parseQuery(window.location.search);
            console.log(query);

            if (query.roomId) {
                controls.inputRoomId.val(sanitize(query.roomId));
            }
            if (query.viewerPassword) {
                controls.inputViewerPassword.val(sanitize(query.viewerPassword))
            }
            if (query.editorKey) {
                controls.inputEditorKey.val(sanitize(query.editorKey))
            }
            if (query["join"] && query["join"] === "true") {
                controls.btnCreateJoin.click();
            }
        },

        // Update fabricjs element states and re-render
        updateStatesAndRender: function () {
            console.log("updateStatesAndRender()");
            const filePrefix = controls.comboMapSelect.val();
            const strongpointKey = filePrefix + controls.checkSpResource.is(":checked");
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

            let artySuffix = controls.checkArtyFlip.is(":checked") ? 2 : 1;
            elements.arty.setSrc('./assets/arty/' + filePrefix + '_Arty' + artySuffix + '.png', internal.render);

            for (let i = 0; i < drawings.length; i++) {
                const path = drawings[i];
                path.visible = controls.checkDrawingsVisible.is(":checked");
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

            const applyFilters = [];
            // Update placed element images
            for (let i = 0; i < placed.length; i++) {
                const object = placed[i];
                promises.push(new Promise(function (resolve) {
                    const meta = placedMeta[object.type.type];
                    if (!meta) {
                        resolve();
                    }
                    if (meta.customizable === "asset") {
                        console.log(object);
                        if (object.type.side === "enemy") {
                            // blue to red
                            const rotation = meta.filterRotation || 0.8097437437027739;
                            object.filters = [new fabric.Image.filters.HueRotation({rotation: rotation})];
                        } else {
                            object.filters = [];
                        }
                        applyFilters.push(object);
                    }

                    object.setSrc(meta.resolveImg(object), resolve);
                }));
            }

            let wasLoaded = false;
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    const spObject = elements.strongpoints[x][y];

                    spObject.visible = controls.checkStrongpoints.is(":checked") && $(".sp-toggle-" + x + y).hasClass("selected");

                    if (!pointCutoutData.hasOwnProperty(strongpointKey)) {
                        continue;
                    }

                    wasLoaded = true;

                    if (currentLoadedPoints !== strongpointKey) {
                        const pointData = pointCutoutData[strongpointKey]['' + x + y];
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

            if (wasLoaded && currentLoadedPoints !== strongpointKey) {
                currentLoadedPoints = strongpointKey;
            }

            if (promises.length) {
                Promise.all(promises).then(function () {
                    internal.render(applyFilters);
                });
            } else {
                internal.render(applyFilters);
            }
        },

        render: function (applyFilters) {
            console.log("render()");

            if (applyFilters && applyFilters.length) {
                for (let i = 0; i < applyFilters.length; i++) {
                    applyFilters[i].applyFilters();
                }
            }

            changeZIndexBySize();
            updateZoomScale();
            controls.fabricCanvas.renderAll();
        }
    }

    $(document).ready(internal.init);

    return {
        menuAdd: function (type, modifier) {
            console.log('menuAdd(' + type + ')')

            if (!type) {
                return;
            }

            addMapElement(contextMenuEvent, type, modifier, true);
        }
    }
}());


