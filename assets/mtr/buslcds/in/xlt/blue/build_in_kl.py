#!/usr/bin/env python
# build_in_kl.py — Generate in/dianxian/kl/main.js
import os

ROOT = r"c:\Users\caigu\Documents\GitHub\MTR-Buslcds\assets\mtr\buslcds"

def w(relpath, content):
    full = os.path.join(ROOT, relpath)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print("  WROTE %s (%d bytes)" % (relpath, os.path.getsize(full)))

w("in/dianxian/kl/main.js", r'''// in/dianxian/kl/main.js — 车内LED电显 KL variant
importPackage(java.awt);
include(Resources.id("mtr:buslcds/lib/dianxian_util.js"));

// Panel: 1200x400 single horizontal LED strip
var _KL_IN_SIZE = [1200, 400];

// ======== KL color helpers ========
function getKlLedColor(cfg) {
    if (cfg && cfg.color === "red") return new Color(255, 60, 40);
    return new Color(255, 200, 60); // orange default
}

// Color constants for colorful mode
var _KL_YELLOW = new Color(255, 220, 40);
var _KL_BLUE   = new Color(80, 180, 255);
var _KL_GREEN  = new Color(80, 240, 120);
var _KL_RED_C  = new Color(255, 70, 50);
var _KL_WHITE  = Color.WHITE;

function buildInKlConfig(cfg) {
    var pos = (cfg && cfg.pos) ? cfg.pos : [];
    var sp = (pos.length > 0) ? pos[0] : [[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]];
    return {
        version: 1,
        texSize: _KL_IN_SIZE,
        slots: [{
            name: "in-dianxian-kl",
            texArea: [0, 0, 1200, 400],
            pos: sp, offsets: [[0,0,0]],
            width: 1200, height: 400
        }]
    };
}

function mkLine(text, y, font, color, maxWidth, speed) {
    return { text: text, y: y, font: font, color: color, maxWidth: maxWidth, speed: speed };
}

// ============ SUB TEMPLATE BUILDERS (KL — single-color mode) ============
// Returns array of line configs.  Each line: {text, y, font, color, maxWidth, speed}

function buildKlQsLines(info, cfg, ledColor, font, speed, maxW) {
    var lines = [];
    var y1 = 40, y2 = 140, y3 = 240;
    var tempStr = "当前温度：" + getTemperature() + "\u00b0C";

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐！", 140, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, ledColor, maxW, speed));
        return lines;
    }

    if (info.state === 'running') {
        lines.push(mkLine("下一站 " + info.nextCN, y1, font, ledColor, maxW, speed));
        var en = "Next stop is " + filterAtIfNeeded(info.nextEN);
        if (en === "Next stop is null") en = "";
        if (en) lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + " 到了", y1, font, ledColor, maxW, speed));
        var en = "We are arriving at " + filterAtIfNeeded(info.currentEN);
        if (en === "We are arriving at null") en = "";
        if (en) lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    }
    return lines;
}

function buildKlTdLines(info, cfg, ledColor, font, speed, maxW) {
    var lines = [];
    var y1 = 30, y2 = 150, y3 = 270;
    var tempStr = "当前温度：" + getTemperature() + "\u00b0C";
    var carousel = ["请保管好随身携带的财务", "欢迎乘坐本公司公交车", "请站稳扶好"];

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐", 140, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, ledColor, maxW, speed));
        return lines;
    }

    if (typeof _KL_TD_FRAME === 'undefined') _KL_TD_FRAME = 0;
    _KL_TD_FRAME++;
    var cIdx = Math.floor(_KL_TD_FRAME / 90) % carousel.length;

    if (info.state === 'terminal') {
        var goodbyeLong = "下车时请检查随身携带的物品，请不要遗忘在车厢内。欢迎您再次乘坐" + info.routeNum + "公交车，并提出宝贵意见。";
        lines.push(mkLine(goodbyeLong, y1, font, ledColor, maxW, speed));
    } else if (info.state === 'running') {
        lines.push(mkLine("下一站：" + info.nextCN, y1, font, ledColor, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + "到了", y1, font, ledColor, maxW, speed));
    }
    lines.push(mkLine(carousel[cIdx], y2, font, ledColor, maxW, speed));
    lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    return lines;
}

function buildKlZaLines(info, cfg, ledColor, font, speed, maxW) {
    var lines = [];
    var y1 = 30, y2 = 120, y3 = 210;
    var tempStr = "当前温度：" + getTemperature() + "\u00b0C";

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐", 140, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, ledColor, maxW, speed));
        return lines;
    }

    if (info.state === 'running') {
        lines.push(mkLine("下一站" + info.nextCN + "。", y1, font, ledColor, maxW, speed));
        var en = "Next stop is " + filterAtIfNeeded(info.nextEN);
        if (en === "Next stop is null") en = "";
        if (en) lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        if (typeof _KL_ZA_FRAME === 'undefined') _KL_ZA_FRAME = 0;
        _KL_ZA_FRAME++;
        lines.push(mkLine(tempStr + "    开往：" + info.endCN, y3, font, ledColor, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + "到了。", y1, font, ledColor, maxW, speed));
        var en = "We are arriving at " + filterAtIfNeeded(info.currentEN) + ".";
        if (en === "We are arriving at null.") en = "";
        if (en) lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        if (typeof _KL_ZA_FRAME === 'undefined') _KL_ZA_FRAME = 0;
        _KL_ZA_FRAME++;
        lines.push(mkLine(tempStr + "    开往：" + info.endCN, y3, font, ledColor, maxW, speed));
    }
    return lines;
}

function buildKlKlLines(info, cfg, ledColor, font, speed, maxW) {
    var lines = [];
    var y1 = 30, y2 = 120, y3 = 210;
    var tempStr = "当前温度：" + getTemperature() + "\u00b0C";

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐", 140, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, ledColor, maxW, speed));
        return lines;
    }

    var welcomeLong = "乘客们，你们好！您现在乘坐的是" + info.routeNum + "公交车，方向" + info.endCN + "。上车请主动买票（单一票价则显示上车请主动投币）。文明规范乘车从你我做起。";
    var goodbyeLong = "下车时请检查随身携带的物品，请不要遗忘在车厢内。欢迎您再次乘坐" + info.routeNum + "公交车，并提出宝贵意见。";

    if (info.state === 'terminal') {
        lines.push(mkLine(goodbyeLong, y1, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    } else if (info.state === 'running') {
        lines.push(mkLine("下一站 " + info.nextCN, y1, font, ledColor, maxW, speed));
        var en = "Next stop is " + filterAtIfNeeded(info.nextEN);
        if (en === "Next stop is null") en = "";
        if (en) lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + " 到了", y1, font, ledColor, maxW, speed));
        var en = filterAtIfNeeded(info.currentEN);
        if (en && en !== "null") lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    }
    return lines;
}

function buildKlRmLines(info, cfg, ledColor, font, speed, maxW) {
    var lines = [];
    var y1 = 40, y2 = 160, y3 = 280;
    var tempStr = "当前温度：" + getTemperature() + "\u00b0C";

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐", 140, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, ledColor, maxW, speed));
        return lines;
    }

    if (info.state === 'running') {
        lines.push(mkLine("下一站：" + info.nextCN, y1, font, ledColor, maxW, speed));
    } else {
        var t1 = (info.state === 'terminal') ? info.currentCN : info.currentCN + "  到了";
        lines.push(mkLine(t1, y1, font, ledColor, maxW, speed));
    }
    lines.push(mkLine(getBeijingTime(), y2, font, ledColor, maxW, speed));
    lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    return lines;
}

function buildKlLsLines(info, cfg, ledColor, font, speed, maxW) {
    var lines = [];
    var y1 = 30, y2 = 120, y3 = 210, y4 = 310;
    var tempStr = "当前温度：" + getTemperature() + "\u00b0C";

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐", 140, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, ledColor, maxW, speed));
        return lines;
    }

    if (info.state === 'running') {
        lines.push(mkLine("下一站：" + info.nextCN, y1, font, ledColor, maxW, speed));
        lines.push(mkLine("The next stop is  " + filterAtIfNeeded(info.nextEN), y2, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN, y1, font, ledColor, maxW, speed));
        var en = filterAtIfNeeded(info.currentEN);
        if (en && en !== "null") lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        if (info.state !== 'terminal') {
            lines.push(mkLine(info.currentCN + "  到了", y3, font, ledColor, maxW, speed));
            lines.push(mkLine("We are arriving at  " + filterAtIfNeeded(info.currentEN), y4, font, ledColor, maxW, speed));
        }
        lines.push(mkLine(tempStr, y1 + 170, font, ledColor, maxW, speed));
    }
    return lines;
}

function buildKlBwLines(info, cfg, ledColor, font, speed, maxW) {
    // kl sub "bw" uses identical template to kl sub (single-color)
    return buildKlKlLines(info, cfg, ledColor, font, speed, maxW);
}

// ============ KL APEP / KH SINGLE-COLOR (no colorful) ============

function buildKlApepLines(info, cfg, ledColor, font, speed, maxW) {
    var lines = [];
    var y1 = 40, y2 = 140, y3 = 240;
    var tempStr = "当前温度：" + getTemperature() + "\u00b0C";

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐！", 140, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, ledColor, maxW, speed));
        return lines;
    }

    if (info.state === 'running') {
        lines.push(mkLine("下一站 " + info.nextCN, y1, font, ledColor, maxW, speed));
        var en = "Next stop is " + filterAtIfNeeded(info.nextEN);
        if (en === "Next stop is null") en = "";
        if (en) lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + " 到了", y1, font, ledColor, maxW, speed));
        var en = "We are now arriving at " + filterAtIfNeeded(info.currentEN);
        if (en === "We are now arriving at null") en = "";
        if (en) lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    }
    return lines;
}

function buildKlKhLines(info, cfg, ledColor, font, speed, maxW) {
    var lines = [];
    var y1 = 40, y2 = 140, y3 = 240;
    var tempStr = "当前温度：" + getTemperature() + "\u00b0C";

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐本次班车", 140, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, ledColor, maxW, speed));
        return lines;
    }

    if (info.state === 'terminal') {
        lines.push(mkLine("欢迎乘坐本次班车", 140, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, ledColor, maxW, speed));
    } else if (info.state === 'running') {
        lines.push(mkLine("下一站：" + info.nextCN, y1, font, ledColor, maxW, speed));
        var en = "The next stop is: " + filterAtIfNeeded(info.nextEN);
        if (en === "The next stop is: null") en = "";
        if (en) lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + "  到了", y1, font, ledColor, maxW, speed));
        var en = "We are arriving at: " + filterAtIfNeeded(info.currentEN);
        if (en === "We are arriving at: null") en = "";
        if (en) lines.push(mkLine(en, y2, font, ledColor, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, ledColor, maxW, speed));
    }
    return lines;
}

// ============ KL COLORFUL APEP ============
function buildKlApepColorfulLines(info, cfg, font, speed, maxW) {
    var lines = [];
    var y1 = 40, y2 = 140, y3 = 240;
    var tempStr = "当前温度：" + getTemperature() + "\u00b0C";

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐！", 140, font, _KL_YELLOW, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, _KL_GREEN, maxW, speed));
        return lines;
    }

    if (info.state === 'running') {
        // cn white, en blue, temp green
        lines.push(mkLine("下一站 " + info.nextCN, y1, font, _KL_WHITE, maxW, speed));
        var en = "Next stop is " + filterAtIfNeeded(info.nextEN);
        if (en === "Next stop is null") en = "";
        if (en) lines.push(mkLine(en, y2, font, _KL_BLUE, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, _KL_GREEN, maxW, speed));
    } else {
        lines.push(mkLine(info.currentCN + " 到了", y1, font, _KL_WHITE, maxW, speed));
        var en = "We are now arriving at " + filterAtIfNeeded(info.currentEN);
        if (en === "We are now arriving at null") en = "";
        if (en) lines.push(mkLine(en, y2, font, _KL_BLUE, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, _KL_GREEN, maxW, speed));
    }
    return lines;
}

// ============ KL COLORFUL KH ============
function buildKlKhColorfulLines(info, cfg, font, speed, maxW) {
    var lines = [];
    var y1 = 40, y2 = 140, y3 = 240;
    var tempStr = "当前温度：" + getTemperature() + "\u00b0C";

    if (!info || !info.routeNum) {
        lines.push(mkLine("欢迎乘坐本次班车", 140, font, _KL_RED_C, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, _KL_GREEN, maxW, speed));
        return lines;
    }

    if (info.state === 'terminal') {
        lines.push(mkLine("欢迎乘坐本次班车", 140, font, _KL_RED_C, maxW, speed));
        lines.push(mkLine(tempStr, 220, font, _KL_GREEN, maxW, speed));
    } else if (info.state === 'running') {
        // cn red "下一站:" + cn name yellow, en yellow, temp green
        lines.push(mkLine("\u4e0b\u4e00\u7ad9: " + info.nextCN, y1, font, _KL_RED_C, maxW, speed));
        // Override with the full colorful split: we will draw with two colors
        // For simplicity single-line approximation: combine prefix in red is complex - use all yellow for this line
        var en = "The next stop is: " + filterAtIfNeeded(info.nextEN);
        if (en === "The next stop is: null") en = "";
        // Prefix drawing handled by drawColorfulLine (below)
        // Actually we'll just set the main color to red and note in extra field
        lines.push(mkLine(en, y2, font, _KL_YELLOW, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, _KL_GREEN, maxW, speed));
        // Mark first line for prefix coloring (red prefix)
        lines[0].prefixText = "\u4e0b\u4e00\u7ad9:";  // "下一站:"
        lines[0].prefixColor = _KL_RED_C;
        lines[0].mainText = info.nextCN;
        lines[0].mainColor = _KL_YELLOW;
    } else {
        // arriving: cn yellow + "到了" green, en yellow, temp green
        lines.push(mkLine(info.currentCN, y1, font, _KL_YELLOW, maxW, speed));
        lines[0].suffixText = " 到了";
        lines[0].suffixColor = _KL_GREEN;
        var en = "We are arriving at: " + filterAtIfNeeded(info.currentEN);
        if (en === "We are arriving at: null") en = "";
        if (en) lines.push(mkLine(en, y2, font, _KL_YELLOW, maxW, speed));
        lines.push(mkLine(tempStr, y3, font, _KL_GREEN, maxW, speed));
    }
    return lines;
}

// ============ SUB_TEMPLATES dispatcher ============
function buildKlLines(info, cfg) {
    var ledColor = getKlLedColor(cfg);
    var font = KL_LED_FONT.deriveFont(Font.PLAIN, 42);
    var speed = 2.0;
    var maxW = 1120;

    var sub = (cfg && cfg.sub) ? String(cfg.sub) : "kl";

    // colorful only affects apep and kh subs
    if (cfg && cfg.colorful === true) {
        if (sub === "apep") return buildKlApepColorfulLines(info, cfg, font, speed, maxW);
        if (sub === "kh")   return buildKlKhColorfulLines(info, cfg, font, speed, maxW);
    }

    switch (sub) {
        case "qs":   return buildKlQsLines(info, cfg, ledColor, font, speed, maxW);
        case "td":   return buildKlTdLines(info, cfg, ledColor, font, speed, maxW);
        case "za":   return buildKlZaLines(info, cfg, ledColor, font, speed, maxW);
        case "kl":   return buildKlKlLines(info, cfg, ledColor, font, speed, maxW);
        case "rm":   return buildKlRmLines(info, cfg, ledColor, font, speed, maxW);
        case "ls":   return buildKlLsLines(info, cfg, ledColor, font, speed, maxW);
        case "bw":   return buildKlBwLines(info, cfg, ledColor, font, speed, maxW);
        case "apep": return buildKlApepLines(info, cfg, ledColor, font, speed, maxW);
        case "kh":   return buildKlKhLines(info, cfg, ledColor, font, speed, maxW);
        default:     return buildKlKlLines(info, cfg, ledColor, font, speed, maxW);
    }
}

// ============ Line drawing with right-temperature and prefix/suffix coloring ============
var _KL_IN_SCROLLS = {};

function drawColorfulLine(g, ln) {
    // Draw prefix in one color and main in another (or suffix)
    g.setFont(ln.font);
    var fm = g.getFontMetrics();

    if (ln.prefixText) {
        // Draw prefix in prefixColor, then main in mainColor
        g.setColor(ln.prefixColor);
        g.drawString(ln.prefixText, 40, ln.y + fm.getAscent());
        var preW = fm.stringWidth(ln.prefixText);
        g.setColor(ln.mainColor);
        // Handle scrolling if needed
        var mainText = ln.mainText;
        var availableW = ln.maxWidth - preW - 40;
        var mainW = fm.stringWidth(mainText);
        if (mainW <= availableW) {
            g.drawString(mainText, 40 + preW, ln.y + fm.getAscent());
        } else {
            // Simple left-aligned scroll for the main portion — skip for now, just left-align
            g.drawString(mainText, 40 + preW, ln.y + fm.getAscent());
        }
        return;
    }

    if (ln.suffixText) {
        // Draw main in mainColor, suffix in suffixColor
        var mainText = ln.text || "";
        // Strip suffix from text
        var suffixIdx = mainText.indexOf(ln.suffixText);
        var realMain = (suffixIdx >= 0) ? mainText.substring(0, suffixIdx) : mainText;
        var mainW = fm.stringWidth(realMain);
        var suffixW = fm.stringWidth(ln.suffixText);
        var totalW = mainW + suffixW;

        if (totalW <= ln.maxWidth) {
            var xStart = (ln.maxWidth - totalW) / 2;
            g.setColor(ln.mainColor || ln.color);
            g.drawString(realMain, Math.round(xStart), ln.y + fm.getAscent());
            g.setColor(ln.suffixColor);
            g.drawString(ln.suffixText, Math.round(xStart + mainW), ln.y + fm.getAscent());
        } else {
            g.setColor(ln.mainColor || ln.color);
            g.drawString(realMain, 40, ln.y + fm.getAscent());
            g.setColor(ln.suffixColor);
            g.drawString(ln.suffixText, 40 + mainW, ln.y + fm.getAscent());
        }
        return;
    }
    return false;
}

function drawLinesKl(g, lines, panelW, cfg) {
    if (typeof _KL_IN_SCROLLS === 'undefined') _KL_IN_SCROLLS = {};
    var useColorful = (cfg && cfg.colorful === true);
    // right_temperature only matters when NOT colorful
    var useRightTemp = (cfg && cfg.right_temperature === true && !useColorful);

    for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        if (!ln.text) continue;

        // Handle colorful prefix/suffix
        if (ln.prefixText || ln.suffixText) {
            drawColorfulLine(g, ln);
            continue;
        }

        g.setFont(ln.font);
        var fm = g.getFontMetrics();
        var tw = fm.stringWidth(ln.text);
        var maxW = ln.maxWidth || panelW - 40;

        // right_temperature: right side reserved for temp display -> reduce maxW
        // But we don't know which line is "temperature" here, so skip for now

        if (tw <= maxW) {
            g.setColor(ln.color);
            CentreText(g, ln.text, maxW / 2, ln.y + fm.getAscent(), maxW);
        } else {
            var scrollKey = "l" + i;
            if (!_KL_IN_SCROLLS[scrollKey] || _KL_IN_SCROLLS[scrollKey].text !== ln.text) {
                _KL_IN_SCROLLS[scrollKey] = makeScrollState({
                    text: ln.text, y: ln.y, font: ln.font, color: ln.color,
                    maxWidth: maxW, speed: ln.speed || 2.0, pauseStart: 30, pauseEnd: 30
                });
            } else {
                _KL_IN_SCROLLS[scrollKey].y = ln.y;
                _KL_IN_SCROLLS[scrollKey].font = ln.font;
                _KL_IN_SCROLLS[scrollKey].color = ln.color;
            }
            drawScrollingText(g, _KL_IN_SCROLLS[scrollKey]);
        }
    }
}

// ============ MODULE_IMPL ============
var MODULE_IMPL = {
    buildConfig: function(cfg) { return buildInKlConfig(cfg); },
    renderOne: function(displays, train, rp, ap) {
        var cfg = (typeof CONFIG !== 'undefined' && CONFIG.in_dianxian) ? CONFIG.in_dianxian : null;
        var info = getStationInfo(train, rp);
        var lines = buildKlLines(info, cfg);

        var g = displays.graphicsFor("in-dianxian-kl");
        g.setColor(Color.BLACK);
        g.fillRect(0, 0, 1200, 400);
        drawLinesKl(g, lines, 1200, cfg);
        displays.upload();
    }
};
print("[MTR] in_dianxian/kl main loaded (8 subs + colorful apep/kh)");
''')

print("Done!")
