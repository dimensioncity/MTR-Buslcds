// in/dianxian/kl/main.js — 车内LED电显 KL variant
importPackage(java.awt);
include(Resources.id("mtr:buslcds/lib/dianxian_util.js"));

// Panel: 1200x400 single horizontal LED strip
var _KL_IN_SIZE = [2266, 200];  // 单行物理 LED 面板

// ======== KL color helpers ========
function getKlLedColor(cfg) {
    // 优先读传入的 cfg, 否则读全局 CONFIG.in_dianxian
    var _c = cfg;
    if (!_c) { try { _c = (typeof CONFIG !== 'undefined') ? CONFIG.in_dianxian : null; } catch(e) {} }
    if (_c && _c.colorful === true) return new Color(16763452);  // 黄色
    return new Color(16727080);  // 红色默认
}


function _getStatus(info) {
    if (!info || !info.routeNum) return "none";
    if (info.state === "terminal") return "terminal";
    if (info.state === "start") return "start";
    if (info.state === "arrive" || info.state === "depart") return "arrive";
    if (info.state === "running") return "running";
    return "running";
}
function _klLine(text, forceColor) {
    // 直接读全局 CONFIG, colorful=true→黄, 否则红; forceColor 可强制覆盖
    if (forceColor) {
        return { text: text, y: 0, font: KL_LED_FONT.deriveFont(Font.PLAIN, 72), color: forceColor, maxWidth: 1160, speed: 2.0 };
    }
    var _c = (typeof CONFIG !== 'undefined') ? CONFIG.in_dianxian : null;
    var _col;
    if (_c && _c.colorful === true) {
        // colorful=true: "欢迎乘坐"类文本用红色, 其他用黄色
        // 排除: "欢迎乘坐本公司公交车" (td车载语循环, 应保持黄色)
        var _isWelcome = (text && text.indexOf("欢迎") >= 0 && text.indexOf("本公司") < 0);
        _col = _isWelcome ? new Color(16727080) : new Color(16763452);
    } else {
        _col = new Color(16727080);
    }
    return { text: text, y: 0, font: KL_LED_FONT.deriveFont(Font.PLAIN, 72), color: _col, maxWidth: 1160, speed: 2.0 };
}
// 温度行颜色: colorful=true 时绿色, colorful=false 时跟主色 (红)
function _klTempLine(text) {
    var _c = (typeof CONFIG !== 'undefined') ? CONFIG.in_dianxian : null;
    if (_c && _c.colorful === true) return _klLine(text, new Color(3399014));  // 绿
    return _klLine(text);  // 红
}
function _klTemp(cfg) {
    // colorful=true 优先级最高: 不管 right_temperature 是什么, 温度都走滚动行
    // 只有 colorful=false && right_temperature=true 时才返回 null (改走右侧固定)
    if (cfg && cfg.right_temperature === true && !(cfg.colorful === true)) return null;
    return "当前温度：" + getTemperature() + "\u00b0C";
}
// 右侧固定温度绘制: colorful=false && right_temperature=true 时生效 (colorful=true 优先级更高)
function _klDrawRightTemp(g, panelW, panelH, cfg) {
    var useRightTemp = (cfg && cfg.right_temperature === true
                        && !(cfg.colorful === true));
    if (!useRightTemp) return;
    var tempStr = getTemperature() + "\u00b0C";
    var tempFont = KL_LED_FONT.deriveFont(Font.PLAIN, 72);
    g.setFont(tempFont);
    var fm = g.getFontMetrics();
    // colorful=true 时绿色, colorful=false 时跟主色 (红)
    var tempColor = (cfg && cfg.colorful === true) ? new Color(3399014) : new Color(16727080);
    g.setColor(tempColor);
    // 在 350px 右侧固定区内水平垂直居中
    var rightTempW = 350;
    var tw = fm.stringWidth(tempStr);
    // 水平: 右侧固定区中心 = panelW - rightTempW/2, 减去文字宽度一半
    var tx = panelW - rightTempW / 2 - tw / 2;
    // 垂直: 面板中心, drawString 基线对齐需加上 ascent/2
    var ty = panelH / 2 + fm.getAscent() / 2 - fm.getDescent() / 2;
    g.drawString(tempStr, Math.round(tx), Math.round(ty));
}
// 票价类型 → 提示语 (参照线路图 parseFareType: single=投币, multi=买票)
function _klBuyText(info) {
    if (info && info.fareType === "single") return "上车请主动投币";
    return "上车请主动买票";
}
function _klApepColorful(cn1, en, temp, cn1Color) {
    var R = new Color(16727080), W = new Color(16777215), BL = new Color(65535), G = new Color(3399014), Y = new Color(16763452);
    var f = KL_LED_FONT.deriveFont(Font.PLAIN, 72);
    // "欢迎乘坐"类文本用红色, 其他默认白色; 排除 "本公司" 车载语
    var _isWelcome = (cn1 && cn1.indexOf("欢迎") >= 0 && cn1.indexOf("本公司") < 0);
    var _cn1C = cn1Color || (_isWelcome ? R : W);
    var arr = [];
    arr.push({ text: cn1, y:0, font:f, color:_cn1C, maxWidth:1160, speed:2.0 });
    if (en) arr.push({ text: en, y:0, font:f, color:BL, maxWidth:1160, speed:2.0 });
    if (temp) arr.push({ text: temp, y:0, font:f, color:G, maxWidth:1160, speed:2.0 });
    return arr;
}
function _klKhColorful(prefix, station, suffix, en, temp) {
    var R = new Color(16727080), Y = new Color(16763452), G = new Color(3399014);
    var f = KL_LED_FONT.deriveFont(Font.PLAIN, 72);
    var arr = [];
    var prefixT = prefix ? (prefix + " ") : "";
    var suffixT = suffix ? (" " + suffix) : "";
    // "欢迎乘坐"类: 主色用红, 其他主色用黄; 排除 "本公司" 车载语
    var _isWelcome2 = (station && station.indexOf("欢迎") >= 0 && station.indexOf("本公司") < 0);
    var _mainC = _isWelcome2 ? R : Y;
    arr.push({ prefixText: prefixT, mainText: station, suffixText: suffixT, prefixColor:R, mainColor:_mainC, suffixColor:G, font:f, y:0, maxWidth:1160, speed:2.0 });
    if (en) arr.push({ text: en, y:0, font:f, color:Y, maxWidth:1160, speed:2.0 });
    if (temp) arr.push({ text: temp, y:0, font:f, color:G, maxWidth:1160, speed:2.0 });
    return arr;
}

function buildKlQsLines(info, cfg) {
    var lines = [], st = _getStatus(info), t = _klTemp(cfg);
    if (st === "none") { lines.push(_klLine("欢迎乘坐！")); if (t) lines.push(_klTempLine(t)); }
    else if (st === "start") { lines.push(_klLine("欢迎乘坐" + info.routeCN + "公交车,方向" + info.endCN)); }
    else if (st === "running") {
        lines.push(_klLine("下一站 " + info.nextCN));
        lines.push(_klLine("Next stop is " + filterAtIfNeeded(info.nextEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    } else {
        lines.push(_klLine(info.currentCN + "  到了"));
        lines.push(_klLine("We are arriving at " + filterAtIfNeeded(info.currentEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    }
    return lines;
}

var _KL_TD_CAR = ["请保管好随身携带的财物", "欢迎乘坐本公司公交车", "请站稳扶好"];
var _KL_TD_LAST_STATE = null;
var _KL_TD_EVENT_PLAYED = false;
function buildKlTdLines(info, cfg) {
    var st = _getStatus(info), buy = _klBuyText(info);
    // 状态切换 → 重置事件标记
    if (st !== _KL_TD_LAST_STATE) { _KL_TD_LAST_STATE = st; _KL_TD_EVENT_PLAYED = false; }
    var lines = [];
    if (st === "none") { lines.push(_klLine("欢迎乘坐")); }
    else if (st === "start") {
        // "您现在乘坐的是..." 只播一遍 (start 态独有事件行)
        if (!_KL_TD_EVENT_PLAYED) { var _s = _klLine("乘客们，你们好！您现在乘坐的是" + info.routeCN + "公交车，方向" + info.endCN + "。" + buy + "。文明规范乘车从你我做起。"); _s._tdEvent = true; lines.push(_s); }
        for (var i=0;i<_KL_TD_CAR.length;i++) lines.push(_klLine(_KL_TD_CAR[i]));
    } else if (st === "running") {
        if (!_KL_TD_EVENT_PLAYED) { var _e = _klLine("下一站：" + info.nextCN); _e._tdEvent = true; lines.push(_e); }
        for (var i=0;i<_KL_TD_CAR.length;i++) lines.push(_klLine(_KL_TD_CAR[i]));
    } else if (st === "arrive") {
        if (!_KL_TD_EVENT_PLAYED) { var _e2 = _klLine(info.currentCN + "到了"); _e2._tdEvent = true; lines.push(_e2); }
        for (var i=0;i<_KL_TD_CAR.length;i++) lines.push(_klLine(_KL_TD_CAR[i]));
    } else if (st === "terminal") {
        if (!_KL_TD_EVENT_PLAYED) { var _e3 = _klLine("下车时请检查随身携带的物品，请不要遗忘在车厢内。欢迎您再次乘坐" + info.routeCN + "公交车，并提出宝贵意见。"); _e3._tdEvent = true; lines.push(_e3); }
        for (var i=0;i<_KL_TD_CAR.length;i++) lines.push(_klLine(_KL_TD_CAR[i]));
    } else {
        lines.push(_klLine("乘客们，你们好！您现在乘坐的是" + info.routeCN + "公交车，方向" + info.endCN + "。"));
        for (var i=0;i<_KL_TD_CAR.length;i++) lines.push(_klLine(_KL_TD_CAR[i]));
    }
    return lines;
}

function buildKlApepLines(info, cfg) {
    var st = _getStatus(info), colorful = (cfg && cfg.colorful === true);
    if (colorful) {
        var tLine = _klTemp(cfg);
        if (st === "none" || st === "start") return _klApepColorful("欢迎乘坐！", null, tLine);
        else if (st === "running") return _klApepColorful("下一站 " + info.nextCN, "Next stop is " + filterAtIfNeeded(info.nextEN, cfg), tLine);
        else return _klApepColorful(info.currentCN + "  到了", "We are now arriving at " + filterAtIfNeeded(info.currentEN, cfg), tLine);
    }
    var lines = [], t = _klTemp(cfg);
    if (st === "none") { lines.push(_klLine("欢迎乘坐！")); if (t) lines.push(_klTempLine(t)); }
    else if (st === "start") {
        lines.push(_klLine("乘客们，你们好，欢迎您乘坐" + info.routeCN + "公交车，方向" + info.endCN + "。"));
        if (t) lines.push(_klTempLine(t));
    } else if (st === "running") {
        lines.push(_klLine("下一站 " + info.nextCN));
        lines.push(_klLine("Next stop is " + filterAtIfNeeded(info.nextEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    } else {
        lines.push(_klLine(info.currentCN + "  到了"));
        lines.push(_klLine("We are now arriving at " + filterAtIfNeeded(info.currentEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    }
    return lines;
}

function buildKlKhLines(info, cfg) {
    var st = _getStatus(info), colorful = (cfg && cfg.colorful === true);
    if (colorful) {
        var tLine = _klTemp(cfg);
        if (st === "none" || st === "start" || st === "terminal") {
        var R = new Color(16727080), G = new Color(3399014);
        var f = KL_LED_FONT.deriveFont(Font.PLAIN, 72);
        var _khArr = [];
        _khArr.push({ text: "欢迎乘坐本次班车", y:0, font:f, color:R, maxWidth:1160, speed:2.0 });
        if (tLine) _khArr.push({ text: tLine, y:0, font:f, color:G, maxWidth:1160, speed:2.0 });
        return _khArr;
    }
        else if (st === "running") return _klKhColorful("下一站", info.nextCN, null, "The next stop is: " + filterAtIfNeeded(info.nextEN, cfg), tLine);
        else return _klKhColorful(null, info.currentCN, "到了", "We are now at: " + filterAtIfNeeded(info.currentEN, cfg), tLine);
    }
    var lines = [], t = _klTemp(cfg);
    if (st === "none") { lines.push(_klLine("欢迎乘坐本次班车")); if (t) lines.push(_klTempLine(t)); }
    else if (st === "start" || st === "terminal") { lines.push(_klLine("欢迎乘坐本次班车")); if (t) lines.push(_klTempLine(t)); }
    else if (st === "running") {
        lines.push(_klLine("下一站：" + info.nextCN));
        lines.push(_klLine("The next stop is: " + filterAtIfNeeded(info.nextEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    } else {
        lines.push(_klLine(info.currentCN + "  到了"));
        lines.push(_klLine("We are now at: " + filterAtIfNeeded(info.currentEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    }
    return lines;
}

function buildKlZaLines(info, cfg) {
    var lines = [], st = _getStatus(info), t = _klTemp(cfg), buy = _klBuyText(info);
    if (st === "none") { lines.push(_klLine("欢迎乘坐")); if (t) lines.push(_klTempLine(t)); }
    else if (st === "start" || st === "terminal") {
        lines.push(_klLine("乘客们，你们好！您现在乘坐的是" + info.routeCN + "公交车，方向" + info.endCN + "。" + buy + "。文明规范乘车从你我做起。"));
        if (t) lines.push(_klTempLine(t));
    } else if (st === "running") {
        lines.push(_klLine("下一站" + info.nextCN + "。"));
        lines.push(_klLine("Next stop is " + filterAtIfNeeded(info.nextEN, cfg)));
        if (t) lines.push(_klTempLine(t));
        lines.push(_klLine(info.routeCN + "公交车，方向" + info.endCN + "。"));
    } else {
        lines.push(_klLine(info.currentCN + "到了。"));
        lines.push(_klLine("We are arriving at " + filterAtIfNeeded(info.currentEN, cfg) + "."));
        if (t) lines.push(_klTempLine(t));
        lines.push(_klLine(info.routeCN + "公交车，方向" + info.endCN + "。"));
    }
    return lines;
}

function buildKlKlLines(info, cfg) {
    var lines = [], st = _getStatus(info), t = _klTemp(cfg), buy = _klBuyText(info);
    if (st === "none") { lines.push(_klLine("欢迎乘坐")); if (t) lines.push(_klTempLine(t)); }
    else if (st === "start") {
        lines.push(_klLine("乘客们，你们好！您现在乘坐的是" + info.routeCN + "公交车，方向" + info.endCN + "。" + buy + "。文明规范乘车从你我做起。"));
        if (t) lines.push(_klTempLine(t));
    } else if (st === "running" || st === "depart") {
        lines.push(_klLine("下一站 " + info.nextCN));
        lines.push(_klLine("Next stop is " + filterAtIfNeeded(info.nextEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    } else if (st === "arrive") {
        lines.push(_klLine(info.currentCN + " 到了"));
        lines.push(_klLine(filterAtIfNeeded(info.currentEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    } else {
        lines.push(_klLine("下车时请检查随身携带的物品，请不要遗忘在车厢内。欢迎您再次乘坐" + info.routeCN + "公交车，并提出宝贵意见。"));
        if (t) lines.push(_klTempLine(t));
    }
    return lines;
}

function buildKlRmLines(info, cfg) {
    var lines = [], st = _getStatus(info), bj = getBeijingTime(), t = _klTemp(cfg);
    if (st === "none") { lines.push(_klLine("欢迎乘坐")); if (t) lines.push(_klTempLine(t)); }
    else if (st === "start" || st === "terminal") {
        lines.push(_klLine((info.currentCN || info.routeCN)));
        lines.push(_klLine("北京时间：" + bj));
        if (t) lines.push(_klTempLine(t));
    } else if (st === "running") {
        lines.push(_klLine("下一站：" + info.nextCN));
        lines.push(_klLine("北京时间：" + bj));
        if (t) lines.push(_klTempLine(t));
    } else {
        lines.push(_klLine(info.currentCN + "  到了"));
        lines.push(_klLine("北京时间：" + bj));
        if (t) lines.push(_klTempLine(t));
    }
    return lines;
}

function buildKlLsLines(info, cfg) {
    var lines = [], st = _getStatus(info), t = _klTemp(cfg);
    if (st === "none") { lines.push(_klLine("欢迎乘坐")); if (t) lines.push(_klTempLine(t)); }
    else if (st === "start" || st === "terminal") {
        lines.push(_klLine((info.currentCN || info.routeCN)));
        lines.push(_klLine(filterAtIfNeeded(info.currentEN || info.routeEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    } else if (st === "running") {
        lines.push(_klLine("下一站：" + info.nextCN));
        lines.push(_klLine("The next stop is  " + filterAtIfNeeded(info.nextEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    } else {
        lines.push(_klLine(info.currentCN + "  到了"));
        lines.push(_klLine("We are arriving at  " + filterAtIfNeeded(info.currentEN, cfg)));
        if (t) lines.push(_klTempLine(t));
    }
    return lines;
}

function buildKlBwLines(info, cfg) { return buildKlKlLines(info, cfg); }


// ============ KL 单行轮播 (每行=Excel一行) ============
// drawColorfulLine: 多色行绘制 (prefix + main + suffix, 水平+垂直居中)
// panelW/panelH > 0 时居中, 否则 x=20, y=ln.y
function drawColorfulLine(g, ln, panelW, panelH) {
    g.setFont(ln.font);
    var fm = g.getFontMetrics();
    // 水平居中
    var totalW = 0;
    if (ln.prefixText) totalW += fm.stringWidth(ln.prefixText);
    if (ln.mainText)   totalW += fm.stringWidth(ln.mainText);
    if (ln.suffixText) totalW += fm.stringWidth(ln.suffixText);
    var x = (panelW && panelW > 0) ? ((panelW - totalW) / 2) : 20;
    // 垂直居中: drawString 的 y 是 baseline, 所以 panelH/2 + ascent/2
    var y;
    if (panelH && panelH > 0) {
        y = panelH / 2 + fm.getAscent() / 2;
    } else {
        y = ln.y || 0;
    }
    if (ln.prefixText) {
        g.setColor(ln.prefixColor || new Color(16727080));
        g.drawString(ln.prefixText, x, y);
        x += fm.stringWidth(ln.prefixText);
    }
    if (ln.mainText) {
        g.setColor(ln.mainColor || new Color(16763452));
        g.drawString(ln.mainText, x, y);
        x += fm.stringWidth(ln.mainText);
    }
    if (ln.suffixText) {
        g.setColor(ln.suffixColor || new Color(3399014));
        g.drawString(ln.suffixText, x, y);
    }
}

function drawLinesKl(g, lines, panelW, cfg) {
    // 存本次显示内容给诊断 overlay
    try {
        var _dl = [];
        for (var _di = 0; _di < lines.length; _di++) {
            var _l = lines[_di];
            if (_l.prefixText !== undefined) {
                _dl.push("[" + (_l.prefixText || "") + "] [" + (_l.mainText || "") + "] [" + (_l.suffixText || "") + "]");
            } else {
                _dl.push(String(_l.text || ""));
            }
        }
        _DX_LAST_DISPLAY = _dl;
    } catch(e_dx_disp) {}

    var key = "in-kl";
    var sig = "";
    for (var k = 0; k < lines.length; k++) sig += "|" + (lines[k].text || "") + "|" + (lines[k].prefixText || "");

    if (typeof _KL_LINE_IDX === "undefined") _KL_LINE_IDX = 0;
    if (typeof _KL_LINES_SIG === "undefined") _KL_LINES_SIG = "";

    if (sig !== _KL_LINES_SIG) {
        _KL_LINES_SIG = sig;
        _KL_LINE_IDX = 0;
        ScrollReset(null, key + "-0");
    }

    if (lines.length === 0) return;

    var ln = lines[_KL_LINE_IDX];
    if (!ln.text && !ln.prefixText && !ln.mainText) {
        if (ln._tdEvent) _KL_TD_EVENT_PLAYED = true;
        _KL_LINE_IDX = (_KL_LINE_IDX + 1) % lines.length;
        ScrollReset(null, key + "-0");
        return;
    }

    var panelH = 200;
    var bashi = (cfg && cfg.bashi === true);

    // ===== right_temperature: 右侧固定温度区 (colorful=true 优先级更高) =====
    // 只有 colorful=false && right_temperature=true 时, 启用右侧固定温度 + 缩短左边滚动区
    var useRightTemp = (cfg && cfg.right_temperature === true
                        && !(cfg.colorful === true));
    var rightTempW = 350;
    // 滚动区域 maxW: 有右侧温度时预留 rightTempW
    var maxW = useRightTemp ? (panelW - 40 - rightTempW) : (panelW - 40);

    // 有 colorful prefix/suffix 的走 drawColorfulLine (多色特殊处理, 水平+垂直居中)
    if (ln.prefixText || ln.suffixText) {
        drawColorfulLine(g, ln, panelW, panelH);

        // 用 ScrollBlock 的进度机制但不实际滚 (多色特殊处理)
        var sbK = key + "-color-" + _KL_LINE_IDX;
        var sbStoreK = sbK;
        if (typeof _DX_SCROLL === "undefined") _DX_SCROLL = {};
        var store = _DX_SCROLL;
        var now = Date.now();
        if (!store[sbStoreK]) store[sbStoreK] = { progress: 0, lastTs: now };
        var s = store[sbStoreK];
        var dt = (now - s.lastTs) / 1000;
        s.lastTs = now;
        if (dt > 0.5) dt = 0;
        s.progress += dt;
        if (s.progress >= 5) {
            if (ln._tdEvent) _KL_TD_EVENT_PLAYED = true;
            _KL_LINE_IDX = (_KL_LINE_IDX + 1) % lines.length;
            ScrollReset(null, sbK);
        }
        // 右侧固定温度 (colorful 分支)
        _klDrawRightTemp(g, panelW, panelH, cfg);
        return;
    }

    // 普通单文本 → 标准 ScrollBlock
    var speed = 400;

    g.setFont(ln.font);
    var fm2 = g.getFontMetrics();
    var baselineY = panelH / 2 + fm2.getAscent() / 2;
    var sbLines = [{ text: ln.text, font: ln.font, color: ln.color, y: baselineY - fm2.getAscent() }];

    var finished = ScrollBlock(g, null, key + "-" + _KL_LINE_IDX, sbLines, 20, maxW, speed, null, null, bashi);
    if (finished) {
        if (ln._tdEvent) _KL_TD_EVENT_PLAYED = true;
        _KL_LINE_IDX = (_KL_LINE_IDX + 1) % lines.length;
        ScrollReset(null, key + "-" + _KL_LINE_IDX);
    }
    // 右侧固定温度 (普通分支)
    _klDrawRightTemp(g, panelW, panelH, cfg);

    // ===== 诊断屏幕 overlay (右下角, 黑色半透明背景) =====
    try {
        var _snap = (typeof _DX_LAST_SNAP !== 'undefined') ? _DX_LAST_SNAP : null;
        if (_snap && cfg && cfg._debug === true) {
            var df = BW_LED_FONT.deriveFont(Font.PLAIN, 24);
            g.setFont(df);
            var dfm = g.getFontMetrics();
            var dy = panelH - 4;
            var dx = panelW - 4;
            var lines = [
                "state=" + _snap.state + "  rp=" + Math.round(_snap.rp * 10) / 10,
                "hitIdx=" + _snap.hitIdx + "  railHit=" + _snap.railHit + "  gap=" + Math.round(_snap.closestGap),
                "cur=" + (_snap.curCN || "-") + "  next=" + (_snap.nextCN || "-"),
                "door=" + _snap.door + "  doorOpened=" + _snap.doorOpened,
                "--- display (" + ((typeof _DX_LAST_DISPLAY !== 'undefined') ? _DX_LAST_DISPLAY.length : 0) + " lines) ---"
            ];
            // 追加屏幕实际显示内容 (最多 6 行, 防止溢出)
            if (typeof _DX_LAST_DISPLAY !== 'undefined') {
                for (var _di2 = 0; _di2 < Math.min(6, _DX_LAST_DISPLAY.length); _di2++) {
                    lines.push("  [" + _di2 + "] " + _DX_LAST_DISPLAY[_di2]);
                }
            }
            // 背景
            var bgW = 0, bgH = dfm.getHeight() * lines.length + 4;
            for (var li = 0; li < lines.length; li++) { var w = dfm.stringWidth(lines[li]); if (w > bgW) bgW = w; }
            bgW += 8;
            g.setColor(new Color(0, 0, 0, 200));
            g.fillRect(dx - bgW, dy - bgH, bgW, bgH);
            // 诊断信息 (浅红色)
            g.setColor(new Color(255, 200, 200));
            for (var li2 = 0; li2 < 5; li2++) {
                g.drawString(lines[li2], dx - bgW + 4, dy - bgH + dfm.getHeight() * (li2 + 1));
            }
            // 屏幕显示内容 (浅绿色, 区分诊断和实际内容)
            g.setColor(new Color(200, 255, 200));
            for (var li3 = 5; li3 < lines.length; li3++) {
                g.drawString(lines[li3], dx - bgW + 4, dy - bgH + dfm.getHeight() * (li3 + 1));
            }
        }
    } catch(e_db) {}
}

// ============ Sub 路由 ============
function buildKlSubLinesBySub(info, cfg) {
    var sub = (cfg && cfg.sub) || 'kl';
    if (sub === 'qs') return buildKlQsLines(info, cfg);
    if (sub === 'td') return buildKlTdLines(info, cfg);
    if (sub === 'apep') return buildKlApepLines(info, cfg);
    if (sub === 'kh') return buildKlKhLines(info, cfg);
    if (sub === 'za') return buildKlZaLines(info, cfg);
    if (sub === 'rm') return buildKlRmLines(info, cfg);
    if (sub === 'ls') return buildKlLsLines(info, cfg);
    return buildKlKlLines(info, cfg);
}

// buildInKlConfig: 和 BW 版同结构, 但用 KL 常量 + 不同 slot name
function buildInKlConfig(cfg) {
    var pos = (cfg && cfg.pos) ? cfg.pos : [];
    var sp = (pos.length > 0) ? pos : [[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]];
    return {
        version: 1,
        texSize: _KL_IN_SIZE,
        slots: [{
            name: "in-dianxian-kl",
            texArea: [0, 0, 2266, 200],
            pos: sp, offsets: [[0,0,0]],
            width: 2266, height: 200
        }]
    };
}

// ============ MODULE_IMPL ============
MODULE_IMPL = {
    buildConfig: function(cfg) { return buildInKlConfig(cfg); },
    renderOne: function(displays, train, rp, ap) {
        var cfg = (typeof CONFIG !== 'undefined' && CONFIG.in_dianxian) ? CONFIG.in_dianxian : null;
        var info = getStationInfo(train, rp, cfg);
        var lines = buildKlSubLinesBySub(info, cfg);
        var g = displays.graphicsFor('in-dianxian-kl');
        g.setColor(Color.BLACK);
        g.fillRect(0, 0, 2266, 200);
        drawLinesKl(g, lines, 2266, cfg);
        displays.upload();
    }
};
if (_MTR_LOG) print('[MTR] in_dianxian/kl main loaded (Excel row = carousel)');
