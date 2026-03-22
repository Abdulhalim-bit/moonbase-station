/* ═══════════════════════════════════════════════════
   MOONBASE — Enhanced 3D Animation Engine
   Detailed Station + Bloom + Cinematic Camera
   ═══════════════════════════════════════════════════ */
(function () {
    'use strict';

    var container = document.getElementById('canvas-container');
    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.00035);

    var camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 3000);
    camera.position.set(0, 12, 60);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // ── Material Helpers ─────────────────
    function chrome(color, opts) {
        return new THREE.MeshStandardMaterial(Object.assign(
            { color: color, metalness: 0.85, roughness: 0.2 }, opts || {}
        ));
    }
    function glow(color, opacity) {
        return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity || 0.7 });
    }
    function edgeLine(geo, color) {
        return new THREE.LineSegments(
            new THREE.EdgesGeometry(geo),
            new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.35 })
        );
    }

    // ── Starfield ────────────────────────
    var SC = 8000, sp = new Float32Array(SC * 3), sc = new Float32Array(SC * 3);
    for (var i = 0; i < SC; i++) {
        sp[i*3] = (Math.random()-.5)*2500; sp[i*3+1] = (Math.random()-.5)*2500; sp[i*3+2] = (Math.random()-.5)*2500;
        var c = new THREE.Color().setHSL(.55+Math.random()*.15,.3+Math.random()*.5,.7+Math.random()*.3);
        sc[i*3]=c.r; sc[i*3+1]=c.g; sc[i*3+2]=c.b;
    }
    var sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    var stars = new THREE.Points(sg, new THREE.PointsMaterial({ size:1.3, vertexColors:true, transparent:true, opacity:.85, sizeAttenuation:true }));
    scene.add(stars);

    // ── Moon ─────────────────────────────
    var mg = new THREE.SphereGeometry(180, 64, 64);
    var mp = mg.attributes.position;
    for (i = 0; i < mp.count; i++) {
        var n = (Math.random()-.5)*5;
        mp.setX(i, mp.getX(i)+mp.getX(i)/180*n);
        mp.setY(i, mp.getY(i)+mp.getY(i)/180*n);
        mp.setZ(i, mp.getZ(i)+mp.getZ(i)/180*n);
    }
    mg.computeVertexNormals();
    var moon = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ color:0x1a1a2e, roughness:.95, metalness:.05, flatShading:true }));
    moon.position.set(0, -195, -60);
    scene.add(moon);

    // ═════════════════════════════════════
    // SPACE STATION — Detailed Build
    // ═════════════════════════════════════
    var station = new THREE.Group();
    var mods = [];
    function addMod(mesh, pos, spd, off) {
        station.add(mesh);
        mods.push({ mesh:mesh, orig:pos.slice(), spd:spd, off:off });
    }

    // --- Central Hub: Layered icosahedron with inner glow ---
    var hubG = new THREE.Group();
    var hGeo = new THREE.IcosahedronGeometry(7, 1);
    hubG.add(new THREE.Mesh(hGeo, chrome(0x8888bb, { metalness:.92, roughness:.15 })));
    hubG.add(edgeLine(hGeo, 0x00f0ff));
    // Inner frame layer
    var hGeo2 = new THREE.IcosahedronGeometry(5.5, 1);
    hubG.add(new THREE.Mesh(hGeo2, chrome(0x7777aa, { transparent:true, opacity:.3 })));
    hubG.add(edgeLine(hGeo2, 0x00ccdd));
    // Core glow sphere
    hubG.add(new THREE.Mesh(new THREE.SphereGeometry(3.5, 20, 20), glow(0x00f0ff, 0.2)));
    // Bright inner point
    hubG.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 12), glow(0x00f0ff, 0.5)));
    addMod(hubG, [0,0,0], 0.5, 0);

    // --- Main Habitat Ring: Chrome torus + neon strip ---
    var rG = new THREE.Group();
    var rGeo = new THREE.TorusGeometry(16, 2.2, 12, 80);
    rG.add(new THREE.Mesh(rGeo, chrome(0x7755bb, { metalness:.88 })));
    rG.add(edgeLine(rGeo, 0x9977dd));
    // Outer neon strip
    rG.add(new THREE.Mesh(new THREE.TorusGeometry(16, 2.4, 6, 80), glow(0x7b2ff7, 0.35)));
    // Inner neon strip
    rG.add(new THREE.Mesh(new THREE.TorusGeometry(16, 1.85, 6, 80), glow(0x00f0ff, 0.25)));
    rG.rotation.x = Math.PI / 2;
    addMod(rG, [0,0,0], 0.3, 1);

    // --- Secondary Ring (tilted over-arch) ---
    var r2G = new THREE.Group();
    var r2Geo = new THREE.TorusGeometry(20, 1.5, 10, 60);
    r2G.add(new THREE.Mesh(r2Geo, chrome(0x6688aa)));
    r2G.add(edgeLine(r2Geo, 0x66aacc));
    r2G.add(new THREE.Mesh(new THREE.TorusGeometry(20, 1.7, 6, 60), glow(0x00ff88, 0.2)));
    r2G.rotation.set(Math.PI/3, Math.PI/4, 0);
    addMod(r2G, [0,0,0], 0.25, 2);

    // --- Solar Panel Arrays (4 units with grid detail) ---
    function mkPanel(x, z, ry) {
        var g = new THREE.Group();
        var pGeo = new THREE.BoxGeometry(13, 0.15, 5.5);
        g.add(new THREE.Mesh(pGeo, chrome(0x3355aa, { metalness:.7, roughness:.4 })));
        g.add(edgeLine(pGeo, 0x5577cc));
        // Grid cells
        var lm = new THREE.LineBasicMaterial({ color:0x4466bb, transparent:true, opacity:.25 });
        for (var j = -5; j <= 5; j += 2.5) {
            var pts = [new THREE.Vector3(j,.1,-2.75), new THREE.Vector3(j,.1,2.75)];
            g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm));
        }
        for (var k = -2; k <= 2; k += 2) {
            var pts2 = [new THREE.Vector3(-6.5,.1,k), new THREE.Vector3(6.5,.1,k)];
            g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), lm));
        }
        // Support arm truss
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,9,6), chrome(0x888899)));
        g.children[g.children.length-1].rotation.z = Math.PI/2;
        g.children[g.children.length-1].position.x = -11;
        // Arm glow joint
        g.add(new THREE.Mesh(new THREE.SphereGeometry(.5,8,8), glow(0x00f0ff, 0.6)));
        g.children[g.children.length-1].position.x = -15.5;
        g.position.set(x, 0, z);
        g.rotation.y = ry;
        return g;
    }
    var p1 = mkPanel(25,0,0); addMod(p1,[25,0,0],.4,.5);
    var p2 = mkPanel(-25,0,Math.PI); addMod(p2,[-25,0,0],.4,1.5);
    var p3 = mkPanel(0,25,Math.PI/2); addMod(p3,[0,0,25],.4,2.5);
    var p4 = mkPanel(0,-25,-Math.PI/2); addMod(p4,[0,0,-25],.4,3.5);

    // --- Communication Dishes (3) ---
    function mkDish(px, py, pz, h) {
        var g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(.3,.4,h,6), chrome(0x999999)));
        // Dish cone/bowl
        var dGeo = new THREE.SphereGeometry(2.8, 16, 10, 0, Math.PI*2, 0, Math.PI*.38);
        var dish = new THREE.Mesh(dGeo, chrome(0xaaaacc, { metalness:.92, side:THREE.DoubleSide }));
        dish.position.y = h/2; dish.rotation.x = Math.PI;
        g.add(dish);
        // Glow tip
        g.add(new THREE.Mesh(new THREE.SphereGeometry(.45,8,8), glow(0xff44aa, 0.9)));
        g.children[2].position.y = h/2 + .5;
        // Dish edge ring glow
        g.add(new THREE.Mesh(new THREE.TorusGeometry(2.5,.06,8,32), glow(0x7b2ff7, 0.3)));
        g.children[3].position.y = h/2; g.children[3].rotation.x = Math.PI/2;
        g.position.set(px, py, pz);
        return g;
    }
    for (i = 0; i < 3; i++) {
        var a = i*2*Math.PI/3;
        var dx = Math.cos(a)*11, dz = Math.sin(a)*11, dh = 7 + i*1.5;
        var dish = mkDish(dx, 8, dz, dh);
        addMod(dish, [dx,8,dz], .6, i*.8);
    }

    // --- Central Spire / Antenna ---
    var spG = new THREE.Group();
    spG.add(new THREE.Mesh(new THREE.CylinderGeometry(.12,.45,14,6), chrome(0x999999)));
    // Spire tip (glowing octahedron)
    var tipM = new THREE.Mesh(new THREE.OctahedronGeometry(1.3,0), glow(0x00f0ff, 0.9));
    tipM.position.y = 8; spG.add(tipM);
    // Signal rings
    for (i = 0; i < 4; i++) {
        var sr = new THREE.Mesh(new THREE.TorusGeometry(2+i*.6,.04,8,32), glow(0x00f0ff, .3-i*.07));
        sr.position.y = 8; sr.rotation.x = Math.PI/2;
        spG.add(sr);
    }
    spG.position.y = 10;
    addMod(spG, [0,10,0], .5, 4);

    // --- Docking Bay ---
    var dkG = new THREE.Group();
    var dkGeo = new THREE.CylinderGeometry(3, 3.5, 10, 12);
    dkG.add(new THREE.Mesh(dkGeo, chrome(0x7788aa, { metalness:.88 })));
    dkG.add(edgeLine(dkGeo, 0x88aacc));
    // Port glow ring
    var portRing = new THREE.Mesh(new THREE.TorusGeometry(3,.12,8,24), glow(0x00ddff, 0.5));
    portRing.position.y = 5; dkG.add(portRing);
    // Bottom port glow
    var portRing2 = new THREE.Mesh(new THREE.TorusGeometry(3.3,.12,8,24), glow(0x7b2ff7, 0.3));
    portRing2.position.y = -5; dkG.add(portRing2);
    dkG.position.set(18,-4,-12); dkG.rotation.set(0,0,Math.PI/6);
    addMod(dkG, [18,-4,-12], .45, 2.5);

    // --- Research Pod ---
    var pdG = new THREE.Group();
    var pdGeo = new THREE.DodecahedronGeometry(4.5, 0);
    pdG.add(new THREE.Mesh(pdGeo, chrome(0x8866aa, { metalness:.88 })));
    pdG.add(edgeLine(pdGeo, 0xaa88cc));
    pdG.add(new THREE.Mesh(new THREE.DodecahedronGeometry(3.5,0), glow(0xff8800, 0.12)));
    pdG.position.set(-4,-12,14);
    addMod(pdG, [-4,-12,14], .35, 3);

    // --- Truss connectors (lines between modules) ---
    var trussMat = new THREE.LineBasicMaterial({ color:0x556677, transparent:true, opacity:.25 });
    var trussPts = [
        [[0,0,0],[25,0,0]], [[0,0,0],[-25,0,0]],
        [[0,0,0],[0,0,25]], [[0,0,0],[0,0,-25]],
        [[0,0,0],[0,10,0]], [[0,0,0],[18,-4,-12]],
        [[0,0,0],[-4,-12,14]]
    ];
    trussPts.forEach(function(pair) {
        var lg = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(pair[0][0],pair[0][1],pair[0][2]),
            new THREE.Vector3(pair[1][0],pair[1][1],pair[1][2])
        ]);
        station.add(new THREE.Line(lg, trussMat));
    });

    scene.add(station);

    // ── Floating Debris ──────────────────
    var debrisG = new THREE.Group();
    for (i = 0; i < 50; i++) {
        var ds = Math.random()*.35+.08;
        var dm = new THREE.Mesh(
            new THREE.OctahedronGeometry(ds, 0),
            new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(.5+Math.random()*.2,.7,.5), wireframe:true, transparent:true, opacity:.2 })
        );
        dm.position.set((Math.random()-.5)*120, (Math.random()-.5)*120, (Math.random()-.5)*120);
        dm.userData.rs = { x:(Math.random()-.5)*.02, y:(Math.random()-.5)*.02, z:(Math.random()-.5)*.02 };
        debrisG.add(dm);
    }
    scene.add(debrisG);

    // ── Lighting ─────────────────────────
    scene.add(new THREE.AmbientLight(0x1a1a3e, 0.35));
    var sun = new THREE.DirectionalLight(0xffeedd, 1.3);
    sun.position.set(80, 60, 40); scene.add(sun);
    var cyanPt = new THREE.PointLight(0x00f0ff, 2, 100);
    scene.add(cyanPt);
    var purplePt = new THREE.PointLight(0x7b2ff7, 1.2, 80);
    purplePt.position.set(-25, 12, -25); scene.add(purplePt);
    var goldPt = new THREE.PointLight(0xffd700, 0.5, 60);
    goldPt.position.set(20, -5, 15); scene.add(goldPt);

    // ── Scroll Tracking ──────────────────
    var currentScroll = 0, targetScroll = 0;
    addEventListener('scroll', function () {
        var max = document.documentElement.scrollHeight - innerHeight;
        targetScroll = max > 0 ? scrollY / max : 0;
    });

    // ── Render Loop ──────────────────────
    var clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        var t = clock.getElapsedTime();
        currentScroll += (targetScroll - currentScroll) * 0.04;

        // Cinematic idle orbit vs scroll-driven blend
        var heroW = Math.max(0, 1 - currentScroll * 10);
        // Idle: slow orbit
        var idleX = Math.sin(t * 0.12) * 55;
        var idleZ = Math.cos(t * 0.12) * 55;
        var idleY = 12 + Math.sin(t * 0.06) * 8;
        // Scroll-driven
        var sX = Math.sin(currentScroll * Math.PI * .8) * 25;
        var sZ = 120 - currentScroll * 100;
        var sY = 5 + currentScroll * 35;
        // Blend
        camera.position.x = idleX * heroW + sX * (1 - heroW);
        camera.position.z = idleZ * heroW + sZ * (1 - heroW);
        camera.position.y = idleY * heroW + sY * (1 - heroW);
        camera.lookAt(0, currentScroll * 8, 0);

        // Station rotation
        station.rotation.y = t * 0.06 + currentScroll * 2;

        // Module separation
        var sep = Math.max(0, (currentScroll - 0.04) * 2.5);
        mods.forEach(function (mod, idx) {
            if (idx === 0) {
                var sc = 1 + Math.sin(t * 2) * .04;
                mod.mesh.scale.set(sc, sc, sc);
                return;
            }
            var o = mod.orig;
            var dir = new THREE.Vector3(o[0], o[1], o[2]);
            if (dir.length() < .01) dir.set(Math.cos(idx*1.5)*.7, Math.sin(idx*.8)*.3, Math.sin(idx*1.5)*.7);
            dir.normalize();
            var fl = Math.sin(t * mod.spd + mod.off) * 2 * sep;
            mod.mesh.position.set(
                o[0] + dir.x * sep * 18 + Math.sin(t + mod.off) * fl,
                o[1] + dir.y * sep * 18 + Math.cos(t*.7 + mod.off) * fl,
                o[2] + dir.z * sep * 18 + Math.sin(t*.5 + mod.off) * fl
            );
            mod.mesh.rotation.x += .003 * sep;
            mod.mesh.rotation.z += .002 * sep;
        });

        // Spire tip pulse
        if (tipM) { var ts = 1 + Math.sin(t*3)*.15; tipM.scale.set(ts, ts, ts); }

        stars.rotation.y = t * .006;
        debrisG.children.forEach(function (d) {
            d.rotation.x += d.userData.rs.x; d.rotation.y += d.userData.rs.y; d.rotation.z += d.userData.rs.z;
        });
        moon.rotation.y = t * .002;
        cyanPt.intensity = 2 + Math.sin(t*2)*.8;
        purplePt.intensity = 1.2 + Math.cos(t*1.5)*.4;

        renderer.render(scene, camera);
    }
    animate();

    // Resize
    addEventListener('resize', function () {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });

    // ── GSAP ScrollTrigger ───────────────
    gsap.registerPlugin(ScrollTrigger);
    gsap.from('#about .section-content', { scrollTrigger:{trigger:'#about',start:'top 80%',end:'top 30%',scrub:1}, y:80, opacity:0 });
    gsap.from('.stat-item', { scrollTrigger:{trigger:'.stats-grid',start:'top 85%',end:'top 50%',scrub:1}, y:40, opacity:0, stagger:.1 });
    gsap.utils.toArray('.mission-item').forEach(function(item,i){
        gsap.from(item, { scrollTrigger:{trigger:item,start:'top 88%',end:'top 55%',scrub:1}, x:i%2===0?-60:60, opacity:0 });
    });
    gsap.from('.program-card', { scrollTrigger:{trigger:'#programs',start:'top 75%',end:'top 25%',scrub:1}, y:60, opacity:0, stagger:.12, scale:.9 });
    gsap.from('.team-card', { scrollTrigger:{trigger:'#team',start:'top 75%',end:'top 30%',scrub:1}, y:50, opacity:0, stagger:.1 });
    gsap.from('.cta-content', { scrollTrigger:{trigger:'#contact',start:'top 80%',end:'top 40%',scrub:1}, y:60, opacity:0 });

    // ── Nav ──────────────────────────────
    var nav = document.querySelector('nav');
    addEventListener('scroll', function () { nav.classList.toggle('scrolled', scrollY > 80); });
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var tgt = document.querySelector(link.getAttribute('href'));
            if (tgt) tgt.scrollIntoView({ behavior:'smooth' });
            var m = document.getElementById('nav-links'), b = document.getElementById('menu-toggle');
            if (m) m.classList.remove('active'); if (b) b.classList.remove('active');
        });
    });
    var menuBtn = document.getElementById('menu-toggle'), mobileNav = document.getElementById('nav-links');
    if (menuBtn && mobileNav) menuBtn.addEventListener('click', function () {
        mobileNav.classList.toggle('active'); menuBtn.classList.toggle('active');
    });
    // Active nav
    var sections = document.querySelectorAll('section[id]'), navLinks = document.querySelectorAll('.nav-link');
    var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) {
                navLinks.forEach(function (l) { l.classList.remove('active'); });
                var al = document.querySelector('.nav-link[href="#'+e.target.id+'"]');
                if (al) al.classList.add('active');
            }
        });
    }, { rootMargin:'-50% 0px', threshold:0 });
    sections.forEach(function (s) { obs.observe(s); });

    // ── Counter Animation ────────────────
    function animCounters() {
        document.querySelectorAll('[data-count]').forEach(function (el) {
            var tgt = parseInt(el.dataset.count,10), st = performance.now();
            function up(now) {
                var p = Math.min((now-st)/2000,1);
                el.textContent = Math.floor(tgt*(1-Math.pow(1-p,3)));
                if (p<1) requestAnimationFrame(up);
            }
            requestAnimationFrame(up);
        });
    }
    var statsEl = document.querySelector('.stats-grid');
    if (statsEl) {
        var so = new IntersectionObserver(function (e) {
            e.forEach(function (en) { if (en.isIntersecting) { animCounters(); so.unobserve(en.target); } });
        }, { threshold:.4 });
        so.observe(statsEl);
    }

    // ── Live Clock ───────────────────────
    var sysTime = document.getElementById('sys-time');
    if (sysTime) setInterval(function () {
        var d = new Date();
        sysTime.textContent = String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')+':'+String(d.getUTCSeconds()).padStart(2,'0');
    }, 1000);
})();
