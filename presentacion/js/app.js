/* NEXFLOR — motor de la presentación.
   Flecha derecha avanza. Flecha izquierda retrocede.
   Esc menú. F pantalla completa. P vista de presentador. Espacio pausa. */

(() => {
    "use strict";

    const DESIGN_W = 1920;
    const DESIGN_H = 1080;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const VISTA = new URLSearchParams(location.search).has("vista");
    if (VISTA) {
        document.body.classList.add("vista");
        document.body.classList.remove("experience-pending");
    }

    const scenes = $$(".scene");
    const total = scenes.length;
    const ui = {
        title: $("#hudTitle"),
        current: $("#hudCurrent"),
        total: $("#hudTotal"),
        steps: $("#hudSteps"),
        progress: $("#hudProgress"),
        stage: $("#stage"),
        hud: $("#hud"),
        menu: $("#menu"),
        menuGrid: $("#menuGrid"),
        btnMenu: $("#btnMenu"),
        btnFs: $("#btnFullscreen"),
        btnMusic: $("#btnMusic"),
        btnAudioSettings: $("#btnAudioSettings"),
        btnEffects: $("#btnEffects"),
        btnMuteAll: $("#btnMuteAll"),
        btnPrev: $("#btnPrev"),
        btnNext: $("#btnNext"),
        toast: $("#toast"),
        experienceGate: $("#experienceGate"),
        btnStartExperience: $("#btnStartExperience"),
        soundPanel: $("#soundPanel"),
        musicVolume: $("#musicVolume"),
        musicVolumeValue: $("#musicVolumeValue"),
        effectsVolume: $("#effectsVolume"),
        effectsVolumeValue: $("#effectsVolumeValue"),
        musicFile: $("#musicFile"),
        musicTrack: $("#musicTrack"),
    };
    const pad = (n) => String(n).padStart(2, "0");

    function fit() {
        const scale = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
        document.documentElement.style.setProperty("--scale", String(scale));
        document.body.classList.toggle("compact-presentation", window.innerWidth <= 760 || window.innerHeight <= 560);
    }
    window.addEventListener("resize", fit);
    fit();

    const tiltTargets = $$(".card, .mod, .node, .solution-card, .module-visual, .learn .academy-photo, .benefits article, .photo-row img, .cover-photo, .seq article");
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches
        && !reducedMotion) {
        tiltTargets.forEach((target) => {
            target.addEventListener("pointermove", (event) => {
                const bounds = target.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                const y = (event.clientY - bounds.top) / bounds.height - 0.5;
                target.style.setProperty("--tilt-x", `${y * -5}deg`);
                target.style.setProperty("--tilt-y", `${x * 5}deg`);
            });
            target.addEventListener("pointerleave", () => {
                target.style.removeProperty("--tilt-x");
                target.style.removeProperty("--tilt-y");
            });
        });
    }

    const canvas = $("#space");
    const ctx = canvas.getContext("2d");
    const pollen = Array.from({ length: 18 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.5 + 0.35,
        v: Math.random() * 0.00018 + 0.00004,
        a: Math.random() * 0.35 + 0.12,
    }));
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
    let spaceFrame = 0;
    let lastSpaceFrame = 0;
    function resizeCanvas() {
        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
        canvas.width = Math.round(window.innerWidth * pixelRatio);
        canvas.height = Math.round(window.innerHeight * pixelRatio);
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }
    function drawSpace(timestamp) {
        if (timestamp - lastSpaceFrame < 1000 / 24) {
            requestSpaceFrame();
            return;
        }
        lastSpaceFrame = timestamp;
        const width = window.innerWidth;
        const height = window.innerHeight;
        ctx.clearRect(0, 0, width, height);
        for (const p of pollen) {
            if (!reducedMotion) {
                p.y -= p.v;
                if (p.y < 0) p.y = 1;
            }
            ctx.beginPath();
            ctx.fillStyle = `rgba(117, 181, 255, ${p.a})`;
            ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < pollen.length; i += 1) {
            const a = pollen[i];
            for (let j = i + 1; j < pollen.length; j += 1) {
                const b = pollen[j];
                const dx = (a.x - b.x) * width;
                const dy = (a.y - b.y) * height;
                const distance = Math.hypot(dx, dy);
                if (distance > 130) continue;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(109, 156, 255, ${(1 - distance / 130) * 0.12})`;
                ctx.lineWidth = 1;
                ctx.moveTo(a.x * width, a.y * height);
                ctx.lineTo(b.x * width, b.y * height);
                ctx.stroke();
            }
        }
        if (!reducedMotion && !document.body.classList.contains("is-paused")
            && !document.body.classList.contains("experience-pending") && !document.hidden) requestSpaceFrame();
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    function requestSpaceFrame() {
        if (reducedMotion || spaceFrame || document.hidden || document.body.classList.contains("is-paused")
            || document.body.classList.contains("experience-pending")) return;
        spaceFrame = requestAnimationFrame(() => {
            spaceFrame = 0;
            drawSpace(performance.now());
        });
    }
    function startSpace() {
        requestSpaceFrame();
    }
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            cancelAnimationFrame(spaceFrame);
            spaceFrame = 0;
        } else startSpace();
    });
    const stepCount = scenes.map((scene) =>
        $$(".step", scene).reduce((max, el) => Math.max(max, Number(el.dataset.step) || 0), 0)
    );
    const revealed = scenes.map(() => 0);
    let current = -1;
    const leaveTimers = new WeakMap();
    let presenterWin = null;
    let menuOpen = false;
    let effectsOn = false;

    const chords = [
        [130.81, 196, 261.63, 329.63, 392],
        [110, 164.81, 220, 261.63, 329.63],
        [146.83, 220, 293.66, 369.99, 440],
        [98, 146.83, 196, 246.94, 293.66],
    ];
    let audioCtx = null;
    let musicBus = null;
    let effectsBus = null;
    let musicFilter = null;
    let musicVoices = [];
    let musicOn = false;
    let chordTimer = null;
    let chordIndex = 0;
    let musicObjectUrl = null;
    let musicVolume = Number(ui.musicVolume.value);
    let effectsVolume = Number(ui.effectsVolume.value);
    let experienceStarted = VISTA;
    if (VISTA) startSpace();
    if (!VISTA) {
        ui.stage.setAttribute("aria-hidden", "true");
        ui.hud.setAttribute("aria-hidden", "true");
        ui.menu.setAttribute("aria-hidden", "true");
    }

    function ensureAudioContext() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            toast("Este navegador no admite audio ambiental. La presentación seguirá funcionando.");
            return false;
        }
        if (!audioCtx) {
            audioCtx = new AudioContextClass();
            musicBus = audioCtx.createGain();
            musicFilter = audioCtx.createBiquadFilter();
            musicFilter.type = "lowpass";
            musicFilter.frequency.value = 1100;
            musicFilter.Q.value = 0.3;
            musicBus.gain.value = 0;
            musicBus.connect(musicFilter);
            musicFilter.connect(audioCtx.destination);

            effectsBus = audioCtx.createGain();
            effectsBus.gain.value = effectsOn ? effectsVolume : 0;
            effectsBus.connect(audioCtx.destination);

            musicVoices = chords[0].map((frequency, index) => {
                const oscillator = audioCtx.createOscillator();
                const voiceGain = audioCtx.createGain();
                oscillator.type = index === 1 ? "triangle" : "sine";
                oscillator.frequency.value = frequency;
                voiceGain.gain.value = index === 0 ? 0.18 : 0.105;
                oscillator.connect(voiceGain);
                voiceGain.connect(musicBus);
                oscillator.start();
                return oscillator;
            });
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => toast("El navegador no pudo activar el audio."));
        }
        return true;
    }

    function setChord(index) {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        chords[index].forEach((frequency, voiceIndex) => {
            musicVoices[voiceIndex].frequency.cancelScheduledValues(now);
            musicVoices[voiceIndex].frequency.setTargetAtTime(frequency, now, 1.6);
        });
    }

    function playTone(frequency, duration, peak, when = 0, type = "sine", endFrequency = frequency) {
        if (!audioCtx || !effectsBus || VISTA) return;
        const start = audioCtx.currentTime + when;
        const oscillator = audioCtx.createOscillator();
        const envelope = audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        if (endFrequency !== frequency) {
            oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        }
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.linearRampToValueAtTime(peak, start + Math.min(0.12, duration * 0.18));
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(envelope);
        envelope.connect(effectsBus);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.03);
        oscillator.addEventListener("ended", () => {
            oscillator.disconnect();
            envelope.disconnect();
        }, { once: true });
    }

    function playClosingSound() {
        if (!effectsOn || !ensureAudioContext()) return;
        [392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
            playTone(frequency, 1.15, 0.085, index * 0.11, "sine");
        });
        playTone(78, 1.3, 0.045, 0.02, "sine", 117);
    }

    function isShown(el, n) {
        return Number(el.dataset.step) <= n;
    }

    function applySteps(index, instant = false) {
        const scene = scenes[index];
        const n = revealed[index];
        scene.classList.toggle("instant", instant);
        scene.dataset.step = String(n);
        $$(".step", scene).forEach((el) => el.classList.toggle("shown", isShown(el, n)));
    }

    function goTo(index, { fromBack = false } = {}) {
        index = Math.max(0, Math.min(total - 1, index));
        if (index === current) return;
        const dir = current < 0 || index > current ? 1 : -1;
        if (current >= 0) {
            const outgoing = scenes[current];
            const previousTimer = leaveTimers.get(outgoing);
            if (previousTimer) window.clearTimeout(previousTimer);
            outgoing.style.setProperty("--exit-x", dir > 0 ? "-8vw" : "8vw");
            outgoing.style.setProperty("--exit-yaw", dir > 0 ? "11deg" : "-11deg");
            outgoing.classList.remove("is-active", "no-trans");
            outgoing.classList.add("is-leaving");
            leaveTimers.set(outgoing, window.setTimeout(() => {
                outgoing.classList.remove("is-leaving");
            }, 820));
        }
        current = index;
        const scene = scenes[current];
        scene.dataset.direction = dir > 0 ? "forward" : "backward";
        scene.classList.remove("is-leaving");
        revealed[current] = fromBack ? stepCount[current] : 0;
        applySteps(current, fromBack);
        void scene.offsetWidth;
        scene.classList.add("is-active");
        document.dispatchEvent(new CustomEvent("nexflor:scene", { detail: { index: current, direction: dir } }));
        if (current === total - 1 && effectsOn) playClosingSound();
        document.body.dataset.bg = scene.dataset.bg || "hero";
        document.body.classList.toggle("no-chrome", scene.dataset.chrome === "off");
        history.replaceState(null, "", `#${current + 1}`);
        updateHud();
    }

    function showState(index, step) {
        goTo(index);
        revealed[current] = Math.max(0, Math.min(stepCount[current], step || 0));
        applySteps(current, true);
        updateHud();
    }

    function next() {
        if (revealed[current] < stepCount[current]) {
            revealed[current] += 1;
            applySteps(current);
            updateHud();
            return;
        }
        if (current < total - 1) goTo(current + 1);
    }

    function prev() {
        if (revealed[current] > 0) {
            revealed[current] -= 1;
            applySteps(current, true);
            updateHud();
            return;
        }
        if (current > 0) goTo(current - 1, { fromBack: true });
    }

    function updateHud() {
        const scene = scenes[current];
        ui.title.textContent = scene.dataset.title || "";
        ui.current.textContent = pad(current + 1);
        ui.total.textContent = pad(total);
        ui.progress.style.width = `${((current + 1) / total) * 100}%`;
        ui.steps.innerHTML = "";
        for (let i = 1; i <= stepCount[current]; i += 1) {
            const dot = document.createElement("i");
            if (i <= revealed[current]) dot.className = "on";
            ui.steps.appendChild(dot);
        }
        $$(".menu-item", ui.menuGrid).forEach((item, i) => item.classList.toggle("current", i === current));
        syncPresenter();
    }

    function openPresenter() {
        if (presenterWin && !presenterWin.closed) {
            presenterWin.focus();
            return;
        }
        presenterWin = window.open("presentador.html", "nexflor-presentador", "width=1440,height=900");
        if (!presenterWin) toast("Permite las ventanas emergentes para abrir la vista de presentador");
    }

    function syncPresenter() {
        if (!presenterWin || presenterWin.closed || current < 0) return;
        presenterWin.postMessage({
            tipo: "estado",
            index: current,
            step: revealed[current],
            steps: stepCount,
        }, "*");
    }

    window.addEventListener("message", (e) => {
        const d = e.data || {};
        if (d.tipo === "hola") {
            presenterWin = e.source;
            syncPresenter();
        } else if (d.tipo === "cmd") {
            if (d.accion === "next") next();
            else if (d.accion === "prev") prev();
            else if (d.accion === "goto") goTo(Number(d.index) || 0);
        } else if (d.tipo === "mostrar" && VISTA) {
            showState(Number(d.index) || 0, Number(d.step) || 0);
        }
    });

    let toastTimer = null;
    function toast(message) {
        ui.toast.textContent = message;
        ui.toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 2200);
    }

    function togglePause() {
        const paused = document.body.classList.toggle("is-paused");
        document.dispatchEvent(new Event("nexflor:pause"));
        toast(paused ? "Animaciones en pausa" : "Animaciones reanudadas");
        if (paused) {
            cancelAnimationFrame(spaceFrame);
            spaceFrame = 0;
        } else startSpace();
    }

    async function toggleFullscreen() {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
    }

    function buildMenu() {
        scenes.forEach((scene, i) => {
            const item = document.createElement("button");
            item.className = "menu-item";
            item.innerHTML = `<b>${pad(i + 1)}</b><span></span><small></small>`;
            $("span", item).textContent = scene.dataset.title || `Escena ${i + 1}`;
            $("small", item).textContent = scene.dataset.owner || "";
            item.addEventListener("click", () => {
                closeMenu();
                goTo(i);
            });
            ui.menuGrid.appendChild(item);
        });
    }

    function openMenu() {
        menuOpen = true;
        ui.menu.classList.add("open");
    }
    function closeMenu() {
        menuOpen = false;
        ui.menu.classList.remove("open");
    }

    let idleTimer = null;
    function wake() {
        document.body.classList.remove("idle");
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (!menuOpen) document.body.classList.add("idle");
        }, 2500);
    }
    document.addEventListener("mousemove", wake);

    function startMusic() {
        if (VISTA || musicOn) return;
        if (ui.musicTrack.src) {
            ui.musicTrack.volume = musicVolume;
            ui.musicTrack.play().catch((error) => {
                stopMusic();
                console.error("No se pudo reproducir la pista local.", error);
                toast("No se pudo reproducir el archivo de audio seleccionado.");
            });
            musicOn = true;
            ui.btnMusic.classList.add("on");
            ui.btnMusic.setAttribute("aria-pressed", "true");
            ui.btnMusic.setAttribute("aria-label", "Pausar música ambiental");
            return;
        }
        if (!ensureAudioContext()) return;
        const now = audioCtx.currentTime;
        chordIndex = 0;
        setChord(chordIndex);
        musicBus.gain.cancelScheduledValues(now);
        musicBus.gain.setTargetAtTime(musicVolume, now, 1.5);
        chordTimer = setInterval(() => {
            chordIndex = (chordIndex + 1) % chords.length;
            setChord(chordIndex);
        }, 26000);
        musicOn = true;
        ui.btnMusic.classList.add("on");
        ui.btnMusic.setAttribute("aria-pressed", "true");
        ui.btnMusic.setAttribute("aria-label", "Pausar música ambiental");
    }

    function stopMusic() {
        if (chordTimer) clearInterval(chordTimer);
        chordTimer = null;
        ui.musicTrack.pause();
        if (audioCtx && musicBus) {
            const now = audioCtx.currentTime;
            musicBus.gain.cancelScheduledValues(now);
            musicBus.gain.setTargetAtTime(0, now, 0.12);
        }
        musicOn = false;
        ui.btnMusic.classList.remove("on");
        ui.btnMusic.setAttribute("aria-pressed", "false");
        ui.btnMusic.setAttribute("aria-label", "Reproducir música ambiental");
    }

    function startExperience() {
        if (experienceStarted) return;
        experienceStarted = true;
        toggleFullscreen().catch(() => toast("No se pudo activar pantalla completa. Puedes intentarlo con F."));
        document.body.classList.remove("experience-pending");
        startSpace();
        document.body.classList.add("experience-started");
        ui.experienceGate.setAttribute("aria-hidden", "true");
        ui.experienceGate.classList.add("leaving");
        ui.btnStartExperience.blur();
        ui.stage.removeAttribute("aria-hidden");
        ui.hud.removeAttribute("aria-hidden");
        ui.menu.removeAttribute("aria-hidden");
        if (ensureAudioContext()) {
            startMusic();
        }
        window.setTimeout(() => { ui.experienceGate.hidden = true; }, 1100);
    }

    document.addEventListener("keydown", (e) => {
        if (VISTA || e.ctrlKey || e.altKey || e.metaKey) return;
        if (!experienceStarted) return;
        if (ui.soundPanel && !ui.soundPanel.hidden && e.key === "Escape") {
            e.preventDefault();
            closeSoundPanel();
            return;
        }
        if (menuOpen && e.key === "Escape") {
            e.preventDefault();
            closeMenu();
            return;
        }
        switch (e.key) {
            case "ArrowRight":
            case "PageDown":
                e.preventDefault();
                next();
                break;
            case "ArrowLeft":
            case "PageUp":
                e.preventDefault();
                prev();
                break;
            case " ":
            case "Spacebar":
                e.preventDefault();
                if (!e.repeat) togglePause();
                break;
            case "Escape":
                e.preventDefault();
                if (!e.repeat) (menuOpen ? closeMenu() : openMenu());
                break;
            case "f":
            case "F":
                if (!e.repeat) toggleFullscreen();
                break;
            case "p":
            case "P":
                if (!e.repeat) openPresenter();
                break;
            case "m":
            case "M":
                if (!e.repeat) (musicOn ? stopMusic() : startMusic());
                break;
            case "s":
            case "S":
                if (!e.repeat) toggleEffects();
                break;
            case "v":
            case "V":
                if (!e.repeat) muteAll();
                break;
            case "Home":
                e.preventDefault();
                goTo(0);
                break;
            case "End":
                e.preventDefault();
                goTo(total - 1);
                break;
            default:
                break;
        }
    });

    const bind = (btn, fn) => {
        if (!btn) return;
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            fn();
        });
    };
    function toggleEffects() {
        effectsOn = !effectsOn;
        if (audioCtx && effectsBus) {
            const now = audioCtx.currentTime;
            effectsBus.gain.cancelScheduledValues(now);
            effectsBus.gain.setTargetAtTime(effectsOn ? effectsVolume : 0, now, 0.08);
        }
        ui.btnEffects.classList.toggle("on", effectsOn);
        ui.btnEffects.setAttribute("aria-pressed", String(effectsOn));
        ui.btnEffects.setAttribute("aria-label", `${effectsOn ? "Desactivar" : "Activar"} sonido del cierre`);
        toast(effectsOn ? "Solo se reproducirá un sonido al cerrar" : "Efectos silenciados");
    }
    function muteAll() {
        stopMusic();
        effectsOn = false;
        if (audioCtx && effectsBus) {
            const now = audioCtx.currentTime;
            effectsBus.gain.cancelScheduledValues(now);
            effectsBus.gain.setTargetAtTime(0, now, 0.04);
        }
        ui.btnEffects.classList.remove("on");
        ui.btnEffects.setAttribute("aria-pressed", "false");
        ui.btnEffects.setAttribute("aria-label", "Activar sonido del cierre");
        toast("Todo el audio está silenciado");
    }
    bind(ui.btnMenu, () => (menuOpen ? closeMenu() : openMenu()));
    bind(ui.btnFs, toggleFullscreen);
    bind(ui.btnMusic, () => (musicOn ? stopMusic() : startMusic()));
    bind(ui.btnEffects, toggleEffects);
    bind(ui.btnMuteAll, muteAll);
    bind(ui.btnPrev, prev);
    bind(ui.btnNext, next);
    ui.menu.addEventListener("click", (e) => {
        if (e.target === ui.menu) closeMenu();
    });

    function closeSoundPanel() {
        ui.soundPanel.hidden = true;
        ui.btnAudioSettings.setAttribute("aria-expanded", "false");
    }
    bind(ui.btnAudioSettings, () => {
        const open = ui.soundPanel.hidden;
        ui.soundPanel.hidden = !open;
        ui.btnAudioSettings.setAttribute("aria-expanded", String(open));
        if (open) ui.musicVolume.focus();
    });
    ui.soundPanel.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", (e) => {
        if (!ui.soundPanel.hidden && !ui.soundPanel.contains(e.target) && e.target !== ui.btnAudioSettings) {
            closeSoundPanel();
        }
    });
    ui.musicVolume.addEventListener("input", () => {
        musicVolume = Number(ui.musicVolume.value);
        ui.musicVolumeValue.value = `${Math.round(musicVolume * 100)}%`;
        ui.musicTrack.volume = musicVolume;
        if (audioCtx && musicBus && musicOn) {
            const now = audioCtx.currentTime;
            musicBus.gain.setTargetAtTime(musicVolume, now, 0.12);
        }
    });
    ui.musicFile.addEventListener("change", () => {
        const file = ui.musicFile.files[0];
        if (!file) return;
        if (file.type && !file.type.startsWith("audio/")) {
            toast("Selecciona un archivo de audio.");
            ui.musicFile.value = "";
            return;
        }
        const wasPlaying = musicOn;
        stopMusic();
        if (musicObjectUrl) URL.revokeObjectURL(musicObjectUrl);
        musicObjectUrl = URL.createObjectURL(file);
        ui.musicTrack.src = musicObjectUrl;
        ui.musicTrack.load();
        toast(`Pista local lista: ${file.name}`);
        if (wasPlaying) startMusic();
    });
    ui.effectsVolume.addEventListener("input", () => {
        effectsVolume = Number(ui.effectsVolume.value);
        ui.effectsVolumeValue.value = `${Math.round(effectsVolume * 100)}%`;
        if (audioCtx && effectsBus) {
            const now = audioCtx.currentTime;
            effectsBus.gain.setTargetAtTime(effectsOn ? effectsVolume : 0, now, 0.08);
        }
    });
    ui.btnStartExperience.addEventListener("click", startExperience);
    if (!VISTA) ui.btnStartExperience.focus();

    buildMenu();
    const fromHash = parseInt(location.hash.slice(1), 10);
    goTo(Number.isFinite(fromHash) ? fromHash - 1 : 0);
    wake();
})();
