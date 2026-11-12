(() => {
    "use strict";

    if (new URLSearchParams(window.location.search).has("vista")) {
        document.documentElement.classList.add("scene-preview");
        return;
    }

    const canvas = document.querySelector("#sceneWebGL");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: true, depth: true, powerPreference: "low-power" });
    if (!canvas || !gl) {
        document.documentElement.classList.add("no-webgl");
        return;
    }

    const vertexSource = `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        uniform vec3 uOffset;
        uniform vec3 uScale;
        uniform mat3 uAxes;
        uniform float uAspect;
        uniform float uTurn;
        uniform float uPitch;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vec3 p = uAxes * (aPosition * uScale) + uOffset;
            float c = cos(uTurn);
            float s = sin(uTurn);
            p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
            float cp = cos(uPitch);
            float sp = sin(uPitch);
            p = vec3(p.x, cp * p.y - sp * p.z, sp * p.y + cp * p.z);
            vNormal = normalize(uAxes * aNormal);
            vPosition = p;
            float depth = max(2.4, 4.2 - p.z);
            gl_Position = vec4(p.x * 3.6 / (uAspect * depth), p.y * 3.6 / depth, -p.z * .08, 1.0);
        }`;
    const fragmentSource = `
        precision mediump float;
        uniform vec4 uColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vec3 n = normalize(vNormal);
            vec3 light = normalize(vec3(-.42, .68, .78));
            float diffuse = .34 + .66 * max(dot(n, light), 0.0);
            vec3 viewDirection = normalize(vec3(0.0, 0.0, 4.0) - vPosition);
            float specular = pow(max(dot(reflect(-light, n), viewDirection), 0.0), 22.0) * .22;
            gl_FragColor = vec4(uColor.rgb * (diffuse + specular), uColor.a);
        }`;

    function compile(type, source) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error("No se pudo crear un shader WebGL.");
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const message = gl.getShaderInfoLog(shader) || "Error de compilación WebGL.";
            gl.deleteShader(shader);
            throw new Error(message);
        }
        return shader;
    }

    const program = gl.createProgram();
    if (!program) throw new Error("No se pudo crear el programa WebGL.");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "No se pudo enlazar el programa WebGL.");
    }
    gl.useProgram(program);

    const locations = {
        position: gl.getAttribLocation(program, "aPosition"),
        normal: gl.getAttribLocation(program, "aNormal"),
        offset: gl.getUniformLocation(program, "uOffset"),
        scale: gl.getUniformLocation(program, "uScale"),
        axes: gl.getUniformLocation(program, "uAxes"),
        aspect: gl.getUniformLocation(program, "uAspect"),
        turn: gl.getUniformLocation(program, "uTurn"),
        pitch: gl.getUniformLocation(program, "uPitch"),
        color: gl.getUniformLocation(program, "uColor"),
    };

    function uploadMesh(positions, normals, indices) {
        const positionBuffer = gl.createBuffer();
        const normalBuffer = gl.createBuffer();
        const indexBuffer = gl.createBuffer();
        if (!positionBuffer || !normalBuffer || !indexBuffer) throw new Error("No se pudo reservar memoria para la escena 3D.");
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        return { positionBuffer, normalBuffer, indexBuffer, count: indices.length };
    }

    function sphereMesh(rows = 14, columns = 20) {
        const positions = [];
        const normals = [];
        const indices = [];
        for (let row = 0; row <= rows; row += 1) {
            const phi = Math.PI * row / rows;
            for (let column = 0; column <= columns; column += 1) {
                const theta = 2 * Math.PI * column / columns;
                const x = Math.sin(phi) * Math.cos(theta);
                const y = Math.cos(phi);
                const z = Math.sin(phi) * Math.sin(theta);
                positions.push(x, y, z);
                normals.push(x, y, z);
            }
        }
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const a = row * (columns + 1) + column;
                const b = a + columns + 1;
                indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }
        return uploadMesh(positions, normals, indices);
    }

    function cylinderMesh(segments = 12) {
        const positions = [];
        const normals = [];
        const indices = [];
        for (let end = 0; end < 2; end += 1) {
            const y = end ? 1 : -1;
            for (let i = 0; i <= segments; i += 1) {
                const angle = i / segments * Math.PI * 2;
                const x = Math.cos(angle);
                const z = Math.sin(angle);
                positions.push(x, y, z);
                normals.push(x, 0, z);
            }
        }
        for (let i = 0; i < segments; i += 1) {
            const a = i;
            const b = i + segments + 1;
            indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
        return uploadMesh(positions, normals, indices);
    }

    function cubeMesh() {
        const positions = [];
        const normals = [];
        const indices = [];
        const faces = [
            [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
            [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
            [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
            [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
            [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
            [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
        ];
        for (const [normal, corners] of faces) {
            const start = positions.length / 3;
            for (const corner of corners) {
                positions.push(...corner);
                normals.push(...normal);
            }
            indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
        }
        return uploadMesh(positions, normals, indices);
    }

    function torusMesh(major = .82, minor = .035, segments = 36, sides = 8) {
        const positions = [];
        const normals = [];
        const indices = [];
        for (let i = 0; i <= segments; i += 1) {
            const u = i / segments * Math.PI * 2;
            for (let j = 0; j <= sides; j += 1) {
                const v = j / sides * Math.PI * 2;
                const radial = major + minor * Math.cos(v);
                positions.push(radial * Math.cos(u), radial * Math.sin(u), minor * Math.sin(v));
                normals.push(Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v));
            }
        }
        for (let i = 0; i < segments; i += 1) {
            for (let j = 0; j < sides; j += 1) {
                const a = i * (sides + 1) + j;
                const b = a + sides + 1;
                indices.push(a, a + 1, b, a + 1, b + 1, b);
            }
        }
        return uploadMesh(positions, normals, indices);
    }

    const sphere = sphereMesh();
    const cylinder = cylinderMesh();
    const cube = cubeMesh();
    const torus = torusMesh();
    const identity = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const dpr = () => Math.min(window.devicePixelRatio || 1, 1.5);
    let frame = 0;
    let lastFrame = 0;
    let startTime = performance.now();
    let activeIndex = 0;
    let pointerX = 0;
    let pointerY = 0;
    let transitionStarted = performance.now();
    let entryScale = 1;
    let target = null;

    function resize() {
        const ratio = dpr();
        const width = Math.round(window.innerWidth * ratio);
        const height = Math.round(window.innerHeight * ratio);
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, width, height);
        }
    }

    function draw(mesh, offset, scale, color, axes = identity, turn = 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
        gl.enableVertexAttribArray(locations.position);
        gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
        gl.enableVertexAttribArray(locations.normal);
        gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.uniform3fv(locations.offset, [offset[0] * entryScale, offset[1] * entryScale, offset[2] * entryScale]);
        gl.uniform3fv(locations.scale, [scale[0] * entryScale, scale[1] * entryScale, scale[2] * entryScale]);
        gl.uniformMatrix3fv(locations.axes, false, axes);
        gl.uniform4fv(locations.color, color);
        gl.uniform1f(locations.turn, turn);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    }

    function drawBone(from, to, radius, color, turn) {
        const direction = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
        const length = Math.hypot(...direction);
        if (!length) return;
        direction.forEach((value, i) => { direction[i] = value / length; });
        let right = [
            direction[1] * 0 - direction[2],
            direction[2] * 0 - direction[0],
            direction[0] * 1 - direction[1] * 0,
        ];
        let rightLength = Math.hypot(...right);
        if (rightLength < .001) {
            right = [1, 0, 0];
            rightLength = 1;
        }
        right = right.map((value) => value / rightLength);
        const forward = [
            right[1] * direction[2] - right[2] * direction[1],
            right[2] * direction[0] - right[0] * direction[2],
            right[0] * direction[1] - right[1] * direction[0],
        ];
        const axes = new Float32Array([
            right[0], right[1], right[2],
            direction[0], direction[1], direction[2],
            forward[0], forward[1], forward[2],
        ]);
        draw(cylinder, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2],
            [radius, length / 2, radius], color, axes, turn);
    }

    function drawFace(time, turn, alpha) {
        const skin = [0.32, 0.88, 1, alpha];
        const shade = [0.07, 0.27, 0.44, alpha];
        const at = (x, y, z) => [x + .8, y, z];
        draw(sphere, at(0, .28, 0), [.34, .43, .25], skin, identity, turn);
        draw(sphere, at(-.34, .27, 0), [.07, .13, .09], [0.23, .73, .91, alpha], identity, turn);
        draw(sphere, at(.34, .27, 0), [.07, .13, .09], [0.23, .73, .91, alpha], identity, turn);
        draw(sphere, at(-.12, .34, .225), [.045, .034, .025], shade, identity, turn);
        draw(sphere, at(.12, .34, .225), [.045, .034, .025], shade, identity, turn);
        draw(sphere, at(0, .19, .24), [.055, .09, .045], [0.54, .94, 1, alpha], identity, turn);
        draw(sphere, at(0, -.28, 0), [.38, .23, .23], [0.12, .48, .71, alpha], identity, turn);
        const sweep = .02 + Math.sin(time * 1.2) * .39;
        draw(torus, at(0, sweep, .02), [.52, .64, .08], [0.48, .96, 1, alpha * .8], identity, turn);
        draw(torus, at(0, .25, 0), [.48, .58, .1], [0.22, .76, 1, alpha * .5], identity, turn);
    }

    function drawAcademy(time, turn, alpha) {
        draw(cube, [-.04, -.02, 0], [.48, .34, .09], [0.65, .48, 1, alpha], identity, turn);
        draw(cube, [-.27, 0, .12], [.22, .31, .045], [.83, .72, 1, alpha], identity, turn);
        draw(cube, [.18, 0, .12], [.22, .31, .045], [.49, .78, 1, alpha], identity, turn);
        draw(cube, [-.01, -.05, .18], [.04, .28, .025], [.95, .9, 1, alpha], identity, turn);
        const orbit = time * .7;
        draw(sphere, [.62 * Math.cos(orbit), .49 + .12 * Math.sin(orbit), .08], [.1, .1, .1], [.46, .91, 1, alpha], identity, turn);
        draw(sphere, [-.61 * Math.cos(orbit * .8), -.4 + .1 * Math.cos(orbit), .05], [.08, .08, .08], [.83, .65, 1, alpha], identity, turn);
        draw(torus, [0, 0, -.03], [.92, .64, .08], [.74, .62, 1, alpha * .55], identity, -turn * .5);
    }

    function drawPosture(time, turn, alpha) {
        const cyan = [.44, .95, .86, alpha];
        const joints = [
            [0, .69, 0], [0, .48, 0], [-.3, .42, 0], [.31, .42, 0],
            [-.43, .14, .02], [.46, .12, .02], [-.48, -.11, .05], [.52, -.13, .05],
            [-.14, -.08, 0], [.18, -.08, 0], [-.19, -.43, .02], [.22, -.43, .02],
            [-.21, -.69, .1], [.25, -.69, .1],
        ];
        const sway = Math.sin(time * .8) * .035;
        joints.forEach((joint, i) => {
            if (i === 0) draw(sphere, [joint[0] + sway, joint[1], joint[2]], [.15, .18, .13], cyan, identity, turn);
            else draw(sphere, [joint[0] + (i < 8 ? sway : sway * .6), joint[1], joint[2]], [.045, .045, .045], cyan, identity, turn);
        });
        const bones = [[0, 1], [1, 2], [1, 3], [2, 4], [4, 6], [3, 5], [5, 7],
            [1, 8], [8, 9], [8, 10], [10, 12], [9, 11], [11, 13]];
        for (const [a, b] of bones) {
            const from = [...joints[a]];
            const to = [...joints[b]];
            from[0] += sway;
            to[0] += sway;
            drawBone(from, to, .033, cyan, turn);
        }
        draw(torus, [0, -.08, -.05], [.52, .9, .06], [.36, .8, 1, alpha * .6], identity, .08);
    }

    function drawFlower(time, turn, alpha, origin = [0, 0, 0]) {
        const petalColors = [
            [1, .46, .78, alpha], [.9, .37, .95, alpha], [.51, .64, 1, alpha],
            [.35, .91, .87, alpha], [.98, .69, .48, alpha], [.76, .54, 1, alpha],
        ];
        for (let i = 0; i < 6; i += 1) {
            const angle = i * Math.PI / 3 + time * .12;
            const distance = .27;
            draw(sphere, [origin[0] + Math.cos(angle) * distance, origin[1] + .12 + Math.sin(angle) * distance, origin[2]],
                [.19, .3, .11], petalColors[i], identity, angle);
        }
        draw(sphere, [origin[0], origin[1] + .12, origin[2] + .1], [.19, .19, .16], [1, .84, .48, alpha], identity, turn);
        draw(torus, [origin[0], origin[1] + .12, origin[2]], [.78, .78, .05], [.42, .83, 1, alpha * .5], identity, -time * .08);
    }

    function drawIntegrated(time, turn, alpha) {
        drawFlower(time, turn, alpha);
        draw(torus, [0, .1, -.06], [1.05, 1.05, .035], [.44, .72, 1, alpha * .52], identity, turn);
        draw(torus, [0, .1, -.08], [1.24, 1.24, .025], [.71, .56, 1, alpha * .38], identity, -turn * .7);
    }

    function getTarget(index) {
        const currentScene = document.querySelectorAll(".scene")[index];
        if (!currentScene) return null;
        const selector = index === 0 ? ".cover-3d-art" : index === 4 ? ".biometric-art"
            : index === 5 ? ".academy-photo" : index === 6 ? ".posture-art"
                : index === 8 ? ".closing-emblem" : null;
        return selector ? currentScene.querySelector(selector) : null;
    }

    function render(timestamp) {
        frame = 0;
        if (document.hidden || document.body.classList.contains("is-paused")) return;
        if (!reducedMotion && timestamp - lastFrame < 1000 / 24) {
            if (!reducedMotion) requestFrame();
            return;
        }
        lastFrame = timestamp;
        resize();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        target = getTarget(activeIndex);
        if (!target || !document.querySelectorAll(".scene")[activeIndex]?.classList.contains("is-active")) return;

        const bounds = target.getBoundingClientRect();
        const ratio = dpr();
        const left = Math.max(0, Math.round(bounds.left * ratio));
        const bottom = Math.max(0, Math.round((window.innerHeight - bounds.bottom) * ratio));
        const width = Math.min(canvas.width - left, Math.round(bounds.width * ratio));
        const height = Math.min(canvas.height - bottom, Math.round(bounds.height * ratio));
        if (width < 4 || height < 4) return;
        gl.viewport(left, bottom, width, height);
        gl.scissor(left, bottom, width, height);
        gl.enable(gl.SCISSOR_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.SCISSOR_TEST);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(locations.aspect, width / height);
        const elapsed = reducedMotion ? 0 : (timestamp - startTime) / 1000;
        const transition = reducedMotion ? 1 : Math.min(1, (timestamp - transitionStarted) / 720);
        const alpha = .82 * Math.min(1, transition * 1.8);
        const turn = reducedMotion ? 0 : Math.sin(elapsed * .33) * .1 + pointerX * .14;
        const pitch = reducedMotion ? 0 : pointerY * .09 + Math.cos(elapsed * .27) * .025;
        const targetScale = activeIndex === 0 ? .92 : activeIndex === 4 ? .82 : activeIndex === 8 ? .32 : .96;
        entryScale = targetScale + Math.pow(transition, 3) * (1 - targetScale);
        gl.uniform1f(locations.turn, turn);
        gl.uniform1f(locations.pitch, pitch);
        switch (activeIndex) {
            case 0:
                drawFlower(elapsed, turn, alpha); break;
            case 4: drawFace(elapsed, turn, alpha); break;
            case 5: drawAcademy(elapsed, turn, alpha); break;
            case 6: drawPosture(elapsed, turn, alpha); break;
            default: break;
        }
        if (!reducedMotion) requestFrame();
    }

    function requestFrame() {
        if (!frame && !document.hidden && !document.body.classList.contains("is-paused")) {
            frame = requestAnimationFrame(render);
        }
    }

    function setScene(index, direction = 1) {
        activeIndex = Math.max(0, Math.min(8, Number(index) || 0));
        transitionStarted = performance.now();
        gl.uniform1f(locations.turn, direction * .24);
        target = getTarget(activeIndex);
        requestFrame();
    }

    window.addEventListener("resize", requestFrame);
    window.addEventListener("pointermove", (event) => {
        pointerX = (event.clientX / window.innerWidth - .5) * 2;
        pointerY = (event.clientY / window.innerHeight - .5) * 2;
    }, { passive: true });
    document.addEventListener("visibilitychange", requestFrame);
    document.addEventListener("nexflor:scene", (event) => {
        setScene(event.detail?.index, event.detail?.direction);
    });
    document.addEventListener("nexflor:pause", requestFrame);
    setScene(0);
})();
