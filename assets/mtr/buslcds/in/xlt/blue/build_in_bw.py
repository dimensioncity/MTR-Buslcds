#!/usr/bin/env python
# build_in.py — Generate in/dianxian/bw and in/dianxian/kl main.js
import os

ROOT = r"c:\Users\caigu\Documents\GitHub\MTR-Buslcds\assets\mtr\buslcds"

def w(relpath, content):
    full = os.path.join(ROOT, relpath)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print("  WROTE %s (%d bytes)" % (relpath, os.path.getsize(full)))

# ===== in/dianxian/bw/main.js =====
w("in/dianxian/bw/main.js", r'''// in/dianxian/bw/main.js — 车内LED电显 BW variant
importPackage(java.awt);
include(Resources.id("mtr:buslcds/lib/dianxian_util.js"));

// Panel: 1200x400, single horizontal LED strip
var _BW_IN_SIZE = [1200, 400];

// BW converts deg C to " 度"
function bwTemp() {
    return getTemperature() + " 度";
}

function buildInBwConfig(cfg) {
    var pos = (cfg && cfg.pos) ? cfg.pos : [];
    var sp = (pos.length > 0) ? pos[0] : [[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]];
    return {
        version: 1,
        texSize: _BW_IN_SIZE,
        slots: [{
            name: "in-dianxian-bw",
            texArea: [0, 0, 1200, 400],
            pos: sp, offsets: [[0,0,0]],
            width: 1200, height: 400
        }]
    };
}

// Helper: build line config
function mkLine(text, y, font, color, maxWidth, speed) {
    return { text: text, y: y, font: font, color: color, maxWidth: maxWidth, speed: speed };
}

// ============ SUB TEMPLATE BUILDERS ============

function buildQsLines(info, cfg) {
    var font = BW_LED_FONT.deriveFont(Font.PLAIN, 44);
    var speed = 0.6;
    var lines = [];
    var maxW = 1120;

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐！", 40, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), 160, font, Color.WHITE, maxW, speed));
        return lines;
    }

    var y1 = 40, y2 = 140, y3 = 240;

    if (info.state === 'running') {
        // 下一站 + 温度
        var t1 = "下一站 " + info.nextCN;
        var t2 = "Next stop is " + filterAtIfNeeded(info.nextEN);
        if (t2 === "Next stop is null") t2 = "";
        var t3 = "当前温度：" + bwTemp();
        lines.push(mkLine(t1, y1, font, Color.WHITE, maxW, speed));
        if (t2) lines.push(mkLine(t2, y2, font, Color.WHITE, maxW, speed));
        lines.push(mkLine(t3, y3, font, Color.WHITE, maxW, speed));
    } else {
        // 到站 (terminal or arrive)
        var t1 = info.currentCN + " 到了";
        var t2 = "We are arriving at " + filterAtIfNeeded(info.currentEN);
        if (t2 === "We are arriving at null") t2 = "";
        var t3 = "当前温度：" + bwTemp();
        lines.push(mkLine(t1, y1, font, Color.WHITE, maxW, speed));
        if (t2) lines.push(mkLine(t2, y2, font, Color.WHITE, maxW, speed));
        lines.push(mkLine(t3, y3, font, Color.WHITE, maxW, speed));
    }
    return lines;
}

function buildTdLines(info, cfg) {
    var font = BW_LED_FONT.deriveFont(Font.PLAIN, 38);
    var speed = 0.6;
    var lines = [];
    var maxW = 1120;
    var y1 = 40, y2 = 160, y3 = 280;

    var welcomeLong = "乘客们，你们好！您现在乘坐的是" + info.routeNum + "公交车，方向" + info.endCN + "。上车请主动买票（单一票价则显示上车请主动投币）。文明规范乘车从你我做起。";
    var carousel = ["请保管好随身携带的财务", "欢迎乘坐本公司公交车", "请站稳扶好"];
    var goodbyeLong = "下车时请检查随身携带的物品，请不要遗忘在车厢内。欢迎您再次乘坐" + info.routeNum + "公交车，并提出宝贵意见。";

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐", 140, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), 220, font, Color.WHITE, maxW, speed));
        return lines;
    }

    // Frame-based carousel cycling
    if (typeof _TD_FRAME === 'undefined') _TD_FRAME = 0;
    _TD_FRAME++;

    if (info.state === 'terminal') {
        lines.push(mkLine(goodbyeLong, y1, font, Color.WHITE, maxW, speed));
    } else if (info.state === 'running') {
        lines.push(mkLine("下一站：" + info.nextCN, y1, font, Color.WHITE, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + "到了", y1, font, Color.WHITE, maxW, speed));
    }
    // Carousel row
    var cIdx = Math.floor(_TD_FRAME / 90) % carousel.length;
    lines.push(mkLine(carousel[cIdx], y2, font, Color.WHITE, maxW, speed));
    lines.push(mkLine("当前温度：" + bwTemp(), y3, font, Color.WHITE, maxW, speed));

    return lines;
}

function buildZaLines(info, cfg) {
    var font = BW_LED_FONT.deriveFont(Font.PLAIN, 40);
    var speed = 0.6;
    var lines = [];
    var maxW = 1120;
    var y1 = 30, y2 = 120, y3 = 210, y4 = 310;

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐", 120, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), 220, font, Color.WHITE, maxW, speed));
        return lines;
    }

    if (info.state === 'running') {
        lines.push(mkLine("下一站" + info.nextCN + "。", y1, font, Color.WHITE, maxW, speed));
        var en = "Next stop is " + filterAtIfNeeded(info.nextEN);
        if (en === "Next stop is null") en = "";
        if (en) lines.push(mkLine(en, y2, font, Color.WHITE, maxW, speed));
        // Scroll row: temperature + route direction
        if (typeof _ZA_FRAME === 'undefined') _ZA_FRAME = 0;
        _ZA_FRAME++;
        var scrollRow = "当前温度：" + bwTemp() + "    " + info.routeNum + "公交车，方向" + info.endCN + "。";
        lines.push(mkLine(scrollRow, y3, font, Color.WHITE, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + "到了。", y1, font, Color.WHITE, maxW, speed));
        var en = "We are arriving at " + filterAtIfNeeded(info.currentEN) + ".";
        if (en === "We are arriving at null.") en = "";
        if (en) lines.push(mkLine(en, y2, font, Color.WHITE, maxW, speed));
        if (typeof _ZA_FRAME === 'undefined') _ZA_FRAME = 0;
        _ZA_FRAME++;
        var scrollRow = "当前温度：" + bwTemp() + "    " + info.routeNum + "公交车，方向" + info.endCN + "。";
        lines.push(mkLine(scrollRow, y3, font, Color.WHITE, maxW, speed));
    }
    return lines;
}

function buildKlSubLines(info, cfg) {
    // Same as bw sub (kl variant's kl sub), but BW ignores color - use white
    var font = BW_LED_FONT.deriveFont(Font.PLAIN, 40);
    var speed = 0.6;
    var lines = [];
    var maxW = 1120;
    var y1 = 30, y2 = 120, y3 = 210, y4 = 310;

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐", 140, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), 220, font, Color.WHITE, maxW, speed));
        return lines;
    }

    var welcomeLong = "乘客们，你们好！您现在乘坐的是" + info.routeNum + "公交车，方向" + info.endCN + "。上车请主动买票（单一票价则显示上车请主动投币）。文明规范乘车从你我做起。";
    var goodbyeLong = "下车时请检查随身携带的物品，请不要遗忘在车厢内。欢迎您再次乘坐" + info.routeNum + "公交车，并提出宝贵意见。";

    if (info.state === 'terminal') {
        lines.push(mkLine(goodbyeLong, y1, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), y2, font, Color.WHITE, maxW, speed));
    } else if (info.state === 'running') {
        lines.push(mkLine("下一站 " + info.nextCN, y1, font, Color.WHITE, maxW, speed));
        var en = "Next stop is " + filterAtIfNeeded(info.nextEN);
        if (en === "Next stop is null") en = "";
        if (en) lines.push(mkLine(en, y2, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), y3, font, Color.WHITE, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + " 到了", y1, font, Color.WHITE, maxW, speed));
        var en = filterAtIfNeeded(info.currentEN);
        if (en && en !== "null") lines.push(mkLine(en, y2, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), y3, font, Color.WHITE, maxW, speed));
    }
    return lines;
}

function buildRmLines(info, cfg) {
    var font = BW_LED_FONT.deriveFont(Font.PLAIN, 40);
    var speed = 0.6;
    var lines = [];
    var maxW = 1120;
    var y1 = 40, y2 = 160, y3 = 280;

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐", 120, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), 220, font, Color.WHITE, maxW, speed));
        return lines;
    }

    if (info.state === 'running') {
        lines.push(mkLine("下一站：" + info.nextCN, y1, font, Color.WHITE, maxW, speed));
    } else {
        var t1 = info.currentCN;
        if (info.state === 'terminal') t1 = info.currentCN;
        else t1 = info.currentCN + "  到了";
        lines.push(mkLine(t1, y1, font, Color.WHITE, maxW, speed));
    }
    lines.push(mkLine(getBeijingTime(), y2, font, Color.WHITE, maxW, speed));
    lines.push(mkLine("当前温度：" + bwTemp(), y3, font, Color.WHITE, maxW, speed));
    return lines;
}

function buildLsLines(info, cfg) {
    var font = BW_LED_FONT.deriveFont(Font.PLAIN, 40);
    var speed = 0.6;
    var lines = [];
    var maxW = 1120;
    var y1 = 30, y2 = 120, y3 = 210, y4 = 310;

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐", 140, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), 220, font, Color.WHITE, maxW, speed));
        return lines;
    }

    if (info.state === 'running') {
        lines.push(mkLine("下一站：" + info.nextCN, y1, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("The next stop is  " + filterAtIfNeeded(info.nextEN), y2, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), y3, font, Color.WHITE, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN, y1, font, Color.WHITE, maxW, speed));
        var en = filterAtIfNeeded(info.currentEN);
        if (en && en !== "null") lines.push(mkLine(en, y2, font, Color.WHITE, maxW, speed));
        if (info.state !== 'terminal') {
            lines.push(mkLine(info.currentCN + "  到了", y3, font, Color.WHITE, maxW, speed));
            lines.push(mkLine("We are arriving at  " + filterAtIfNeeded(info.currentEN), y4, font, Color.WHITE, maxW, speed));
        }
        lines.push(mkLine("当前温度：" + bwTemp(), y1 + (info.state !== 'terminal' ? 170 : 170), font, Color.WHITE, maxW, speed));
    }
    return lines;
}

function buildApepLines(info, cfg) {
    var font = BW_LED_FONT.deriveFont(Font.PLAIN, 40);
    var speed = 0.6;
    var lines = [];
    var maxW = 1120;
    var y1 = 40, y2 = 140, y3 = 240, y4 = 330;

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐！", 140, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), 220, font, Color.WHITE, maxW, speed));
        return lines;
    }

    var welcome = "乘客们，你们好，欢迎您乘坐" + info.routeNum + "公交车，方向" + info.endCN + "。";

    if (info.state === 'running') {
        lines.push(mkLine("下一站 " + info.nextCN, y1, font, Color.WHITE, maxW, speed));
        var en = "Next stop is " + filterAtIfNeeded(info.nextEN);
        if (en === "Next stop is null") en = "";
        if (en) lines.push(mkLine(en, y2, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), y3, font, Color.WHITE, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + " 到了", y1, font, Color.WHITE, maxW, speed));
        var en = "We are now arriving at " + filterAtIfNeeded(info.currentEN);
        if (en === "We are now arriving at null") en = "";
        if (en) lines.push(mkLine(en, y2, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), y3, font, Color.WHITE, maxW, speed));
    }
    return lines;
}

function buildKhLines(info, cfg) {
    var font = BW_LED_FONT.deriveFont(Font.PLAIN, 40);
    var speed = 0.6;
    var lines = [];
    var maxW = 1120;
    var y1 = 40, y2 = 140, y3 = 240, y4 = 330;

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐本次班车", 140, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), 220, font, Color.WHITE, maxW, speed));
        return lines;
    }

    if (info.state === 'terminal') {
        lines.push(mkLine("欢迎乘坐本次班车", 140, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), 220, font, Color.WHITE, maxW, speed));
    } else if (info.state === 'running') {
        lines.push(mkLine("下一站：" + info.nextCN, y1, font, Color.WHITE, maxW, speed));
        var en = "The next stop is: " + filterAtIfNeeded(info.nextEN);
        if (en === "The next stop is: null") en = "";
        if (en) lines.push(mkLine(en, y2, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), y3, font, Color.WHITE, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + "  到了", y1, font, Color.WHITE, maxW, speed));
        var en = "We are arriving at: " + filterAtIfNeeded(info.currentEN);
        if (en === "We are arriving at: null") en = "";
        if (en) lines.push(mkLine(en, y2, font, Color.WHITE, maxW, speed));
        lines.push(mkLine("当前温度：" + bwTemp(), y3, font, Color.WHITE, maxW, speed));
    }
    return lines;
}

// ============ SUB_TEMPLATES map ============
var SUB_TEMPLATES_BW = {
    qs: buildQsLines,
    td: buildTdLines,
    za: buildZaLines,
    kl: buildKlSubLines,
    rm: buildRmLines,
    ls: buildLsLines,
    bw: buildKlSubLines,  // Same as kl
    apep: buildApepLines,
    kh: buildKhLines
};

// ============ Line drawing ============
// Scroll state pool per line index
var _BW_IN_SCROLLS = {};

function drawLinesBw(g, lines, panelW) {
    if (typeof _BW_IN_SCROLLS === 'undefined') _BW_IN_SCROLLS = {};

    for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        if (!ln.text) continue;
        g.setFont(ln.font);
        var fm = g.getFontMetrics();
        var tw = fm.stringWidth(ln.text);

        // colorful BW -> always scroll (pause 2s before first char at left edge, 2s after last char at right edge)
        var isColorful = ln.colorful === true;
        var speed = ln.speed || 0.6;
        var maxW = ln.maxWidth || panelW - 40;

        if (tw <= maxW && !isColorful) {
            // Static centered
            g.setColor(ln.color);
            CentreText(g, ln.text, maxW / 2, ln.y + fm.getAscent(), maxW);
        } else {
            // Need scroll
            var scrollKey = "l" + i;
            if (!_BW_IN_SCROLLS[scrollKey] || _BW_IN_SCROLLS[scrollKey].text !== ln.text) {
                var pauseS = isColorful ? 120 : 60;  // ~2s @60fps
                var pauseE = isColorful ? 120 : 60;
                _BW_IN_SCROLLS[scrollKey] = makeScrollState({
                    text: ln.text, y: ln.y, font: ln.font, color: ln.color,
                    maxWidth: maxW, speed: speed, pauseStart: pauseS, pauseEnd: pauseE
                });
            } else {
                _BW_IN_SCROLLS[scrollKey].y = ln.y;
                _BW_IN_SCROLLS[scrollKey].font = ln.font;
                _BW_IN_SCROLLS[scrollKey].color = ln.color;
            }
            drawScrollingText(g, _BW_IN_SCROLLS[scrollKey]);
        }
    }
}

// ============ MODULE_IMPL ============
var MODULE_IMPL = {
    buildConfig: function(cfg) { return buildInBwConfig(cfg); },
    renderOne: function(displays, train, rp, ap) {
        var cfg = (typeof CONFIG !== 'undefined' && CONFIG.in_dianxian) ? CONFIG.in_dianxian : null;
        var info = getStationInfo(train, rp);
        var sub = (cfg && cfg.sub) ? String(cfg.sub) : "kl";

        var builder = SUB_TEMPLATES_BW[sub];
        if (!builder) builder = buildKlSubLines;

        var lines = builder(info, cfg);
        // Mark colorful for BW if requested
        if (cfg && cfg.colorful === true) {
            for (var k = 0; k < lines.length; k++) lines[k].colorful = true;
        }

        var g = displays.graphicsFor("in-dianxian-bw");
        g.setColor(Color.BLACK);
        g.fillRect(0, 0, 1200, 400);
        drawLinesBw(g, lines, 1200);
        displays.upload();
    }
};
print("[MTR] in_dianxian/bw main loaded (8 subs: qs,td,za,kl,rm,ls,bw,apep,kh)");
''')

print("in/dianxian/bw written. Now writing in/dianxian/kl...")
