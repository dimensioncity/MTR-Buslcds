// out/dianxian/bw/main.js — 车外电显 BW variant
importPackage(java.awt);
include(Resources.id("mtr:buslcds/lib/dianxian_util.js"));

// texSize: 3 panels stacked vertically: 3*200 = 600 tall, 1600 wide
var _BW_OUT_SIZE = [1600, 762];
var _BW_OUT_PANEL_H = 200;

function buildOutBwConfig(cfg) {
    var pos = (cfg && cfg.pos) ? cfg.pos : [];
    var slots = [];
    var roles = ["front", "", "tail"];  // 0=头显, 1=中间, 2=尾显
    for (var i = 0; i < 3; i++) {
        var sp = (pos.length > i) ? pos[i] : [[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]];
        slots.push({
            name: "out-dianxian-bw-" + i,
            texArea: [0, i * _BW_OUT_PANEL_H, 1600, _BW_OUT_PANEL_H],
            pos: sp, offsets: [[0,0,0]],
            width: 1600, height: _BW_OUT_PANEL_H,
            role: roles[i]
        });
    }
    return { version: 1, texSize: _BW_OUT_SIZE, slots: slots };
}


function drawOutBw(g, cfg, info, panelW, panelH) {
    var LED = new Color(16762940);
    g.setColor(Color.BLACK);
    g.fillRect(0, 0, panelW, panelH);
    if (!info || !info.routeNum) {
        CentreText(g, "机 动 车", panelW / 2, panelH / 2 + 24, panelW - 40);
        return;
    }

    var arrow = "→";

    var cnText;
    if (cfg && cfg.start) {
        cnText = info.routeNum + "  " + info.startCN + " " + arrow + " " + info.endCN;
    } else {
        cnText = info.routeNum + "  " + arrow + " " + info.endCN;
    }

    var enText = "";
    if (info.endEN && info.endEN !== info.endCN) {
        if (cfg && cfg.start && info.startEN && info.startEN !== info.startCN) {
            enText = filterAtIfNeeded(info.startEN) + " " + arrow + " " + filterAtIfNeeded(info.endEN);
        } else {
            enText = filterAtIfNeeded(info.endEN);
        }
    }

    var _STORE = (typeof _DX_SCROLL !== 'undefined') ? _DX_SCROLL : (_DX_SCROLL = {});
    var _LANG_KEY = "out-bw-lang";
    if (!_STORE[_LANG_KEY]) _STORE[_LANG_KEY] = { cur: "cn" };
    var _langState = _STORE[_LANG_KEY];

    var mainText;
    var showSnow = true;
    if (enText) {
        if (_langState.cur === "en") {
            mainText = enText;
            showSnow = false;
        } else {
            mainText = cnText;
        }
    } else {
        mainText = cnText;
    }

    var fontSize = panelH - 6;
    var font = BW_LED_FONT.deriveFont(Font.PLAIN, fontSize);
    var useBashi = !(cfg && cfg.bashi === false);
    var snowSize = Math.floor(fontSize * 0.5);
    var snowGap = Math.floor(fontSize * 0.15);
    var snowWithGap = snowSize + snowGap;
    var cy = panelH / 2;
    g.setFont(font);
    var fm = g.getFontMetrics();
    var _ftDescent = fm.getDescent();
    var _ftAscent = fm.getAscent();
    var _ftBaseY = panelH / 2 + _ftAscent / 2 - _ftDescent / 2;
    var _ftLnY = _ftBaseY - _ftAscent;
    var wMain = measureMixedFontText(g, mainText, font, useBashi);
    var totalW = (showSnow ? snowWithGap : 0) + wMain;
    g.setColor(LED);

    var sbKey = "out-bw-" + (_langState.cur || "cn");
    var sbX, sbW;
    if (showSnow) drawSnowflake(g, 40 + snowSize / 2, cy, snowSize, LED);
    sbX = showSnow ? 40 + snowWithGap : 40;
    sbW = panelW - 80 - (showSnow ? snowWithGap : 0);

    var finished = ScrollBlock(g, _STORE, sbKey,
        [{ text: mainText, font: font, color: LED, y: _ftLnY }],
        sbX, sbW, 340, panelH,
        function(g, line, x, by, ub) { drawMixedFontText(g, line.text, x, by, line.font, ub); },
        useBashi);

    if (finished && enText) {
        _langState.cur = (_langState.cur === "en") ? "cn" : "en";
    }
}

function drawOutBwFrontTail(g, cfg, info, veh, panelW, panelH, role) {
    var LED = new Color(16762940);
    g.setColor(Color.BLACK);
    g.fillRect(0, 0, panelW, panelH);
    if (!info || !info.routeNum) { CentreText(g, "机 动 车", panelW / 2, panelH / 2 + 24, panelW - 40); return; }

    // ========== 字体大小 = 面板高度 - 20, 雪花等比放大 ==========
    var fontSize = panelH - 10;
    var font = BW_LED_FONT.deriveFont(Font.PLAIN, fontSize);
    var cy = panelH / 2;
    // 雪花和文字同高
    var snowSize = Math.floor(fontSize * 0.9);
    var snowGap = Math.floor(fontSize * 0.15);
    var useBashi = !(cfg && cfg.bashi === false);
    var isFront = (role === "front");

    // ========== 状态决定显示内容 ==========
    var snowPos = "prefix";
    var prefixText = "";
    var mainText = "";
    var suffixText = "";

    if (isFront || !veh || veh.state === "normal") {
        // 头显: 永远雪花+线路名中文 (无箭头无终点站)
        // 尾显正常态: 同上
        mainText = info.routeNum;
        snowPos = "prefix";

    } else if (veh.state === "brake") {
        // 尾显刹车: 1s 闪烁 "注意 [雪花]线路名 刹车"
        // 灭阶段也保持 snowPos=middle + 完整画幅, 仅隐藏 prefix/suffix 文字
        mainText = info.routeNum;
        snowPos = "middle";
        if (veh.brakeBlink) {
            prefixText = "注意 ";
            suffixText = " 刹车";
        }
        // brakeBlink=false 时 prefixText/suffixText 保持 "", 但画幅仍按亮阶段完整串算

    } else if (veh.state === "left") {
        // 左转: ←变道 ↔ 雪花+线路名 每2s交替 (先显示变道)
        if (veh.turnPhase === 0) {
            mainText = "\u2190 变道";
            snowPos = "none";
        } else {
            mainText = info.routeNum;
            snowPos = "prefix";
        }

    } else if (veh.state === "right") {
        // 右转: 变道→ ↔ 雪花+线路名 每2s交替 (先显示变道)
        if (veh.turnPhase === 0) {
            mainText = "变道 \u2192";
            snowPos = "none";
        } else {
            mainText = info.routeNum;
            snowPos = "prefix";
        }
    }


    g.setFont(font);
    // brake 灭阶段: prefix/suffix 置空但画幅仍按亮阶段完整串计算, 确保居中位置不变
    var wPre, wSuf;
    if (snowPos === "middle") {
        if (veh && veh.state === "brake" && !veh.brakeBlink) {
            wPre = measureMixedFontText(g, "注意 ", font, useBashi);
            wSuf = measureMixedFontText(g, " 刹车", font, useBashi);
        } else {
            wPre = measureMixedFontText(g, prefixText, font, useBashi);
            wSuf = measureMixedFontText(g, suffixText, font, useBashi);
        }
    } else {
        wPre = 0; wSuf = 0;
    }
    var wMain = measureMixedFontText(g, mainText, font, useBashi);
    var snowWithGap = snowSize + snowGap;

    var totalW;
    if (snowPos === "prefix") {
        totalW = snowWithGap + wMain;
    } else if (snowPos === "middle") {
        totalW = wPre + snowWithGap + wMain + wSuf;
    } else {
        totalW = wMain;
    }

        var fm = g.getFontMetrics();
    var _ftDescent = fm.getDescent();
    var _ftAscent = fm.getAscent();
    var _ftBaseY = panelH / 2 + _ftAscent / 2 - _ftDescent / 2;
    var _ftLnY = _ftBaseY - _ftAscent;
    var baselineY = cy + fm.getAscent() / 2 - fm.getDescent() / 2;

    g.setColor(LED);

    if (totalW <= panelW - 40) {
        // ---------- 静态居中 ----------
        var leftX = (panelW - totalW) / 2;
        var cx = leftX;

        if (snowPos === "prefix") {
            drawSnowflake(g, cx + snowSize / 2, cy, snowSize, LED);
            cx += snowWithGap;
            drawMixedFontText(g, mainText, cx, baselineY, font, useBashi);
        } else if (snowPos === "middle") {
            drawMixedFontText(g, prefixText, cx, baselineY, font, useBashi);
            cx += wPre;
            drawSnowflake(g, cx + snowSize / 2, cy, snowSize, LED);
            cx += snowWithGap;
            drawMixedFontText(g, mainText, cx, baselineY, font, useBashi);
            cx += wMain;
            drawMixedFontText(g, suffixText, cx, baselineY, font, useBashi);
        } else {
            drawMixedFontText(g, mainText, cx, baselineY, font, useBashi);
        }

    } else {
        // ---------- 溢出: ScrollBlock 滚动 ----------
        var sbKey = "ft-bw-" + role + "-" + snowPos;
        var sbX, sbW, sbText, sbY;

        if (snowPos === "prefix") {
            drawSnowflake(g, 40 + snowSize / 2, cy, snowSize, LED);
            sbX = 40 + snowWithGap;
            sbW = panelW - 80 - snowWithGap;
            sbText = mainText;
        } else if (snowPos === "middle") {
            // prefix 固定左, suffix 固定右, 中间只滚 mainText
            drawMixedFontText(g, prefixText, 40, baselineY, font, useBashi);
            drawSnowflake(g, 40 + wPre + snowSize / 2, cy, snowSize, LED);
            drawMixedFontText(g, suffixText, panelW - 40 - wSuf, baselineY, font, useBashi);
            sbX = 40 + wPre + snowWithGap;
            sbW = panelW - 80 - wPre - snowWithGap - wSuf;
            sbText = mainText;
        } else {
            sbX = 40;
            sbW = panelW - 80;
            sbText = mainText;
        }

        ScrollBlock(g, null, sbKey,
            [{ text: sbText, font: font, color: LED, y: _ftLnY }],
            sbX, sbW, 340, panelH,
            function(g, line, x, by, ub) { drawMixedFontText(g, line.text, x, by, line.font, ub); },
            useBashi);
    }
}





MODULE_IMPL = {
    buildConfig: function(cfg) { return buildOutBwConfig(cfg); },
    renderOne: function(displays, train, rp, ap) {
        var cfg = (typeof CONFIG !== 'undefined' && CONFIG.out_dianxian) ? CONFIG.out_dianxian : null;
        var info = getStationInfo(train, rp);
        var roles = ["front", "", "tail"];
        var veh = getVehicleState(train);
        if (veh && (veh.state === "left" || veh.state === "right" || veh.state === "brake")
            && typeof CONFIG !== "undefined" && CONFIG && CONFIG.debug === true) {
            print("[OUT-DBG] veh.state=" + veh.state + " turnPhase=" + veh.turnPhase + " turnSide=" + veh.turnSide + " brakeBlink=" + veh.brakeBlink);
        }
        for (var i = 0; i < 3; i++) {
            var slotName = "out-dianxian-bw-" + i;
            var g = displays.graphicsFor(slotName);
            var role = roles[i];
            if (role === "front" || role === "tail") {
                drawOutBwFrontTail(g, cfg, info, veh, 1600, 200, role);
            } else {
                drawOutBw(g, cfg, info, 1600, 200);
            }
        }
        displays.upload();
    }
};
if (_MTR_LOG) print("[MTR] out_dianxian/bw main loaded");
