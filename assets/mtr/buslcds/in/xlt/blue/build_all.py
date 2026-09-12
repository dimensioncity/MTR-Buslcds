#!/usr/bin/env python
# build_all.py — Patch dispatcher.js + create all dianxian scripts
import os, sys

ROOT = r"c:\Users\caigu\Documents\GitHub\MTR-Buslcds\assets\mtr\buslcds"

def w(relpath, content):
    full = os.path.join(ROOT, relpath)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print("  WROTE %s (%d bytes)" % (relpath, os.path.getsize(full)))

# ===== 1. Patch dispatcher.js =====
def patch_dispatcher():
    p = os.path.join(ROOT, "dispatcher.js")
    with open(p, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    changed = False
    while i < len(lines):
        line = lines[i]
        if 'stub (variant=' in line and 'path=' in line:
            # Replace this line (print stub) and next (catch include skip)
            if i + 1 < len(lines) and 'include skip' in lines[i+1]:
                # new content (preserve surrounding whitespace style)
                new_block = [
                    '        print("[MTR] " + id + " loading variant=" + v + (parts.length ? ", " + parts.join(", ") : "") + ", path=" + fullPath);\n',
                    '        // Actually include the variant main.js!\n',
                    '        include(Resources.id(fullPath + "/main.js"));\n',
                    '        // If variant exposed MODULE_IMPL, use it to override buildConfig/renderOne\n',
                    '        if (typeof MODULE_IMPL !== \'undefined\' && MODULE_IMPL) {\n',
                    '          if (MODULE_IMPL.buildConfig) this.buildConfig = MODULE_IMPL.buildConfig;\n',
                    '          if (MODULE_IMPL.renderOne)   this.renderOne   = MODULE_IMPL.renderOne;\n',
                    '          print("[MTR] " + id + " variant impl loaded OK");\n',
                    '        } else {\n',
                    '          print("[MTR] " + id + " no MODULE_IMPL, using stub");\n',
                    '        }\n',
                    '      } catch(e) { print("[MTR] " + id + " include err: " + e); }\n',
                ]
                new_lines.extend(new_block)
                i += 2  # skip old print stub line and old catch line
                changed = True
                continue
        new_lines.append(line)
        i += 1

    if changed:
        with open(p, 'w', encoding='utf-8', newline='') as f:
            f.writelines(new_lines)
        print("PATCHED dispatcher.js makeStubModule.doIncludes")
    else:
        print("WARNING: dispatcher.js patch pattern not found - check manually")

patch_dispatcher()

# ===== 2. lib/dianxian_util.js =====
w("lib/dianxian_util.js", r'''// dianxian_util.js — shared for in/out dianxian BW & KL
importPackage(java.awt);

// ============ FONTS ============
var KL_LED_FONT = Font.createFont(Font.TRUETYPE_FONT,
    Resources.getResource("mtr:buslcds/font/kl/led.ttf").openStream());
var BW_LED_FONT = Font.createFont(Font.TRUETYPE_FONT,
    Resources.getResource("mtr:buslcds/font/bw/led/cn.ttf").openStream());

// ============ SCROLL ENGINE ============
// ScrollConfig: { text, y, font, color, maxWidth, speed, pauseStart, pauseEnd }
// speed: pixels per frame. KL=2.0 (fast), BW=0.6 (slow)
// If text width <= maxWidth, draw static (centered).
// Otherwise scroll left-to-right: start=text left edge at x=maxWidth (off right),
// end=text right edge at x=0 (off left). Pause at start/end.

function makeScrollState(config) {
    return {
        text: config.text,
        y: config.y,
        font: config.font,
        color: config.color,
        maxWidth: config.maxWidth,
        speed: config.speed,
        pauseStart: config.pauseStart || 0,  // frames
        pauseEnd: config.pauseEnd || 0,
        x: 0,
        state: 'pauseStart',  // pauseStart | scroll | pauseEnd
        frame: 0,
        width: 0
    };
}

// Call once per render frame with graphics context g
function drawScrollingText(g, ss) {
    g.setFont(ss.font);
    var fm = g.getFontMetrics();
    ss.width = fm.stringWidth(ss.text);
    var needsScroll = ss.width > ss.maxWidth;

    if (!needsScroll) {
        // Static centered
        g.setColor(ss.color);
        CentreText(g, ss.text, ss.maxWidth / 2, ss.y + fm.getAscent(), ss.maxWidth);
        return;
    }

    // Scrolling state machine
    if (ss.state === 'pauseStart') {
        ss.frame++;
        if (ss.frame >= ss.pauseStart) { ss.state = 'scroll'; ss.frame = 0; ss.x = ss.maxWidth; }
    } else if (ss.state === 'scroll') {
        ss.x -= ss.speed;
        if (ss.x + ss.width <= 0) { ss.state = 'pauseEnd'; ss.frame = 0; }
    } else { // pauseEnd
        ss.frame++;
        if (ss.frame >= ss.pauseEnd) { ss.state = 'pauseStart'; ss.frame = 0; ss.x = ss.maxWidth; }
    }

    g.setColor(ss.color);
    g.drawString(ss.text, Math.round(ss.x), ss.y + fm.getAscent());
}

// ============ STATION STATE ============
// Returns: { state: 'none'|'terminal'|'arrive'|'depart'|'running',
//            currentCN, currentEN, nextCN, nextEN, startCN, endCN, routeNum }
function getStationInfo(train, routePlats) {
    var info = { state: 'none', currentCN: '', currentEN: '', nextCN: '', nextEN: '',
                 startCN: '', endCN: '', routeNum: '' };
    if (!routePlats || routePlats.size() === 0) return info;

    // Route number
    try {
        info.routeNum = String(train.routeName || train.lineName || "");
    } catch(e) {}

    // Terminals
    try { info.startCN = String(routePlats.get(0).station.name); } catch(e) {}
    try {
        var last = routePlats.get(routePlats.size() - 1);
        info.endCN = String(last.station.name);
    } catch(e) {}

    // Current train position -> determine state
    try {
        var curPlat = train.currentPlatform || null;
        var nextPlat = train.nextPlatform || null;
        for (var i = 0; i < routePlats.size(); i++) {
            var rp = routePlats.get(i);
            var match = (curPlat && rp.station.name === curPlat.station.name) ||
                        (nextPlat && rp.station.name === nextPlat.station.name);
            if (match) {
                info.currentCN = String(rp.station.name);
                // English name - try enName field, fallback to Chinese
                info.currentEN = String(rp.station.enName || "");
                if (!info.currentEN) info.currentEN = info.currentCN;
                // Apply global bw filtering
                if (typeof filterAtIfNeeded === 'function') {
                    info.currentEN = filterAtIfNeeded(info.currentEN);
                }
                // Next station
                if (i + 1 < routePlats.size()) {
                    var np = routePlats.get(i + 1);
                    info.nextCN = String(np.station.name);
                    info.nextEN = String(np.station.enName || info.nextCN);
                    if (typeof filterAtIfNeeded === 'function') info.nextEN = filterAtIfNeeded(info.nextEN);
                }
                // Detect terminal vs running
                if (i === routePlats.size() - 1) info.state = 'terminal';
                else info.state = 'running';
                break;
            }
        }
    } catch(e) { info.state = 'none'; }

    return info;
}

// ============ CENTRED TEXT HELPER ============
function CentreText(g, text, cx, y, maxWidth) {
    var fm = g.getFontMetrics();
    var w = fm.stringWidth(text);
    g.drawString(text, Math.round(cx - w / 2), Math.round(y));
}

// ============ LEFT-ALIGNED TEXT HELPER (scrollable) ============
function LeftText(g, text, x, y) {
    g.drawString(text, Math.round(x), Math.round(y));
}

// Temperature placeholder - real value from game API not available in stub
function getTemperature() { return "xx"; }

// Beijing time
function getBeijingTime() {
    var now = new Date();
    var dow = ['日','一','二','三','四','五','六'][now.getDay()];
    return String.format("%d月%d日星期%s %02d时%02d分",
        now.getMonth()+1, now.getDate(), dow, now.getHours(), now.getMinutes());
}

print("[MTR] dianxian_util loaded");
''')

# ===== 3. out/dianxian/bw/main.js =====
w("out/dianxian/bw/main.js", r'''// out/dianxian/bw/main.js — 车外电显 BW variant
importPackage(java.awt);
include(Resources.id("mtr:buslcds/lib/dianxian_util.js"));

// texSize: 3 panels stacked vertically: 3*200 = 600 tall, 1600 wide
var _BW_OUT_SIZE = [1600, 600];
var _BW_OUT_PANEL_H = 200;

function buildOutBwConfig(cfg) {
    var pos = (cfg && cfg.pos) ? cfg.pos : [];
    var slots = [];
    for (var i = 0; i < 3; i++) {
        var sp = (pos.length > i) ? pos[i] : [[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]];
        slots.push({
            name: "out-dianxian-bw-" + i,
            texArea: [0, i * _BW_OUT_PANEL_H, 1600, _BW_OUT_PANEL_H],
            pos: sp, offsets: [[0,0,0]],
            width: 1600, height: _BW_OUT_PANEL_H
        });
    }
    return { version: 1, texSize: _BW_OUT_SIZE, slots: slots };
}

function drawOutBw(g, cfg, info, panelW, panelH) {
    g.setColor(Color.BLACK);
    g.fillRect(0, 0, panelW, panelH);
    g.setFont(BW_LED_FONT.deriveFont(Font.PLAIN, 64));
    g.setColor(Color.WHITE);

    if (!info || !info.routeNum) {
        CentreText(g, "机 动 车", panelW / 2, panelH / 2 + 24, panelW - 40);
        return;
    }

    // Default: [雪花][线路名]->[终点站]
    // start=true: [雪花][线路名] [起点]->[终点]
    var arrow = "\u2192";
    var mainText;
    if (cfg && cfg.start) {
        mainText = info.routeNum + "  " + info.startCN + " " + arrow + " " + info.endCN;
    } else {
        mainText = info.routeNum + "  " + arrow + " " + info.endCN;
    }

    // English carousel
    if (cfg && cfg.english) {
        // Toggle CN/EN roughly every 2 seconds using frame counter
        if (typeof _OUT_BW_FRAME === 'undefined') _OUT_BW_FRAME = 0;
        _OUT_BW_FRAME++;
        var showEN = Math.floor(_OUT_BW_FRAME / 60) % 2 === 1;
        if (showEN) {
            var enArrow = "\u2192";
            if (cfg.start) {
                mainText = filterAtIfNeeded(info.startEN) + " " + enArrow + " " + filterAtIfNeeded(info.endEN);
            } else {
                mainText = filterAtIfNeeded(info.endEN);
            }
        }
    }

    // Draw with scroll if needed, static otherwise
    var fm = g.getFontMetrics();
    var tw = fm.stringWidth(mainText);
    if (tw <= panelW - 40) {
        CentreText(g, mainText, panelW / 2, panelH / 2 + 24, panelW - 40);
    } else {
        // Simple scroll - keep reusing one scroll state
        if (!_OUT_BW_SCROLL) {
            _OUT_BW_SCROLL = makeScrollState({
                text: mainText, y: panelH / 2 - 24, font: BW_LED_FONT.deriveFont(Font.PLAIN, 64),
                color: Color.WHITE, maxWidth: panelW - 40, speed: 0.6, pauseStart: 60, pauseEnd: 60
            });
        }
        _OUT_BW_SCROLL.text = mainText;
        drawScrollingText(g, _OUT_BW_SCROLL);
    }
}

var MODULE_IMPL = {
    buildConfig: function(cfg) { return buildOutBwConfig(cfg); },
    renderOne: function(displays, train, rp, ap) {
        var cfg = (typeof CONFIG !== 'undefined' && CONFIG.out_dianxian) ? CONFIG.out_dianxian : null;
        var info = getStationInfo(train, rp);
        var slots = displays.gen.config.slots;
        for (var i = 0; i < slots.length; i++) {
            var g = displays.graphicsFor(slots[i].name);
            drawOutBw(g, cfg, info, slots[i].width, slots[i].height);
        }
        displays.upload();
    }
};
print("[MTR] out_dianxian/bw main loaded");
''')

# ===== 4. out/dianxian/kl/main.js =====
w("out/dianxian/kl/main.js", r'''// out/dianxian/kl/main.js — 车外电显 KL variant
importPackage(java.awt);
include(Resources.id("mtr:buslcds/lib/dianxian_util.js"));

var _KL_OUT_SIZE = [1600, 600];
var _KL_OUT_PANEL_H = 200;
var _KL_NUM_FONT = Font.createFont(Font.TRUETYPE_FONT,
    Resources.getResource("mtr:buslcds/font/kl/cepainum.otf").openStream());

function getKlLedColor(cfg) {
    if (cfg && cfg.color === "red") return new Color(255, 60, 40);
    return new Color(255, 200, 60); // orange default
}

function buildOutKlConfig(cfg) {
    var pos = (cfg && cfg.pos) ? cfg.pos : [];
    var slots = [];
    for (var i = 0; i < 3; i++) {
        var sp = (pos.length > i) ? pos[i] : [[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]];
        slots.push({
            name: "out-dianxian-kl-" + i,
            texArea: [0, i * _KL_OUT_PANEL_H, 1600, _KL_OUT_PANEL_H],
            pos: sp, offsets: [[0,0,0]],
            width: 1600, height: _KL_OUT_PANEL_H
        });
    }
    return { version: 1, texSize: _KL_OUT_SIZE, slots: slots };
}

function drawOutKl(g, cfg, info, panelW, panelH) {
    g.setColor(Color.BLACK);
    g.fillRect(0, 0, panelW, panelH);
    var ledColor = getKlLedColor(cfg);
    g.setColor(ledColor);
    g.setFont(KL_LED_FONT.deriveFont(Font.PLAIN, 72));

    if (!info || !info.routeNum) {
        CentreText(g, "机 动 车", panelW / 2, panelH / 2 + 28, panelW - 40);
        return;
    }

    var arrow = "\u2192";
    var mainText;
    if (cfg && cfg.start) {
        mainText = info.routeNum + "  " + info.startCN + " " + arrow + " " + info.endCN;
    } else {
        mainText = info.routeNum + "  " + arrow + " " + info.endCN;
    }

    if (cfg && cfg.english) {
        if (typeof _OUT_KL_FRAME === 'undefined') _OUT_KL_FRAME = 0;
        _OUT_KL_FRAME++;
        var showEN = Math.floor(_OUT_KL_FRAME / 60) % 2 === 1;
        if (showEN) {
            if (cfg.start) {
                mainText = filterAtIfNeeded(info.startEN) + " " + arrow + " " + filterAtIfNeeded(info.endEN);
            } else {
                mainText = filterAtIfNeeded(info.endEN);
            }
        }
    }

    var fm = g.getFontMetrics();
    var tw = fm.stringWidth(mainText);
    if (tw <= panelW - 40) {
        CentreText(g, mainText, panelW / 2, panelH / 2 + 28, panelW - 40);
    } else {
        if (!_OUT_KL_SCROLL) {
            _OUT_KL_SCROLL = makeScrollState({
                text: mainText, y: panelH / 2 - 26, font: KL_LED_FONT.deriveFont(Font.PLAIN, 72),
                color: ledColor, maxWidth: panelW - 40, speed: 2.0, pauseStart: 30, pauseEnd: 30
            });
        }
        _OUT_KL_SCROLL.text = mainText;
        _OUT_KL_SCROLL.color = ledColor;
        drawScrollingText(g, _OUT_KL_SCROLL);
    }
}

var MODULE_IMPL = {
    buildConfig: function(cfg) { return buildOutKlConfig(cfg); },
    renderOne: function(displays, train, rp, ap) {
        var cfg = (typeof CONFIG !== 'undefined' && CONFIG.out_dianxian) ? CONFIG.out_dianxian : null;
        var info = getStationInfo(train, rp);
        var slots = displays.gen.config.slots;
        for (var i = 0; i < slots.length; i++) {
            var g = displays.graphicsFor(slots[i].name);
            drawOutKl(g, cfg, info, slots[i].width, slots[i].height);
        }
        displays.upload();
    }
};
print("[MTR] out_dianxian/kl main loaded");
''')

print("\n=== Step 1-4 done (dispatcher patched, util + out/bw + out/kl written) ===")
print("Now writing in/dianxian/bw and in/dianxian/kl (the big ones)...")
