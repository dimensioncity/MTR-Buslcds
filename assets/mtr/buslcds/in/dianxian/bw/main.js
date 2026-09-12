// in/dianxian/bw/main.js — 车内LED电显 BW variant
importPackage(java.awt);
include(Resources.id("mtr:buslcds/lib/dianxian_util.js"));

var _BW_IN_SIZE = [2266, 200];

function bwTemp() {
    return getTemperature() + " 度";
}

function buildInBwConfig(cfg) {
    var pos = (cfg && cfg.pos) ? cfg.pos : [];
    var sp = (pos.length > 0) ? pos : [[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]];
    return {
        version: 1,
        texSize: _BW_IN_SIZE,
        slots: [{
            name: "in-dianxian-bw",
            texArea: [0, 0, 2266, 200],
            pos: sp, offsets: [[0,0,0]],
            width: 2266, height: 200
        }]
    };
}


function _getStatus(info) {
    if (!info || !info.routeNum) return "none";
    if (info.state === "terminal") return "terminal";
    if (info.state === "start") return "start";
    if (info.state === "arrive" || info.state === "depart") return "arrive";
    if (info.state === "running") return "running";
    return "running";
}
function _bwLine(text) {
    return { text: text, y: 0, font: BW_LED_FONT.deriveFont(Font.PLAIN, 72), color: new Color(16729650), maxWidth: 1160, speed: 0.6 };
}
function _bwTemp() { return "当前温度 " + bwTemp(); }

// 票价类型 → 提示语 (参照线路图 parseFareType: single=投币, multi=买票)
function _buyText(info) {
    if (info && info.fareType === "single") return "上车请主动投币";
    return "上车请主动买票";
}

function buildQsLines(info, cfg) {
    var lines = [], st = _getStatus(info);
    if (st === "none") { lines.push(_bwLine("欢迎乘坐！")); lines.push(_bwLine(_bwTemp())); }
    else if (st === "start") { lines.push(_bwLine("欢迎乘坐" + info.routeCN + "公交车,方向" + info.endCN)); }
    else if (st === "running") {
        lines.push(_bwLine("下一站 " + info.nextCN));
        lines.push(_bwLine("Next stop is " + filterAtIfNeeded(info.nextEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    } else {
        lines.push(_bwLine(info.currentCN + "  到了"));
        lines.push(_bwLine("We are arriving at " + filterAtIfNeeded(info.currentEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    }
    return lines;
}

var _TD_CAR = ["请保管好随身携带的财物", "欢迎乘坐本公司公交车", "请站稳扶好"];
var _TD_LAST_STATE = null;
var _TD_EVENT_PLAYED = false;
function buildTdLines(info, cfg) {
    var st = _getStatus(info), buy = _buyText(info);
    // 状态切换 → 重置事件标记, 允许事件行再播一次
    if (st !== _TD_LAST_STATE) { _TD_LAST_STATE = st; _TD_EVENT_PLAYED = false; }
    var lines = [];
    if (st === "none") { lines.push(_bwLine("欢迎乘坐")); }
    else if (st === "start") {
        lines.push(_bwLine("乘客们，你们好！您现在乘坐的是" + info.routeCN + "公交车，方向" + info.endCN + "。" + buy + "。文明规范乘车从你我做起。"));
        for (var i=0;i<_TD_CAR.length;i++) lines.push(_bwLine(_TD_CAR[i]));
    } else if (st === "running") {
        if (!_TD_EVENT_PLAYED) { var _e = _bwLine("下一站：" + info.nextCN); _e._tdEvent = true; lines.push(_e); }
        for (var i=0;i<_TD_CAR.length;i++) lines.push(_bwLine(_TD_CAR[i]));
    } else if (st === "arrive") {
        if (!_TD_EVENT_PLAYED) { var _e2 = _bwLine(info.currentCN + "到了"); _e2._tdEvent = true; lines.push(_e2); }
        for (var i=0;i<_TD_CAR.length;i++) lines.push(_bwLine(_TD_CAR[i]));
    } else if (st === "terminal") {
        if (!_TD_EVENT_PLAYED) { var _e3 = _bwLine("下车时请检查随身携带的物品，请不要遗忘在车厢内。欢迎您再次乘坐" + info.routeCN + "公交车，并提出宝贵意见。"); _e3._tdEvent = true; lines.push(_e3); }
        for (var i=0;i<_TD_CAR.length;i++) lines.push(_bwLine(_TD_CAR[i]));
    } else {
        lines.push(_bwLine("乘客们，你们好！您现在乘坐的是" + info.routeCN + "公交车，方向" + info.endCN + "。"));
        for (var i=0;i<_TD_CAR.length;i++) lines.push(_bwLine(_TD_CAR[i]));
    }
    return lines;
}

function buildApepLines(info, cfg) {
    var lines = [], st = _getStatus(info);
    if (st === "none") { lines.push(_bwLine("欢迎乘坐！")); lines.push(_bwLine(_bwTemp())); }
    else if (st === "start") {
        lines.push(_bwLine("乘客们，你们好，欢迎您乘坐" + info.routeCN + "公交车，方向" + info.endCN + "。"));
        lines.push(_bwLine(_bwTemp()));
    } else if (st === "running") {
        lines.push(_bwLine("下一站 " + info.nextCN));
        lines.push(_bwLine("Next stop is " + filterAtIfNeeded(info.nextEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    } else {
        lines.push(_bwLine(info.currentCN + "  到了"));
        lines.push(_bwLine("We are now arriving at " + filterAtIfNeeded(info.currentEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    }
    return lines;
}

function buildKhLines(info, cfg) {
    var lines = [], st = _getStatus(info);
    if (st === "none") { lines.push(_bwLine("欢迎乘坐本次班车")); lines.push(_bwLine(_bwTemp())); }
    else if (st === "start" || st === "terminal") { lines.push(_bwLine("欢迎乘坐本次班车")); lines.push(_bwLine(_bwTemp())); }
    else if (st === "running") {
        lines.push(_bwLine("下一站：" + info.nextCN));
        lines.push(_bwLine("The next stop is: " + filterAtIfNeeded(info.nextEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    } else {
        lines.push(_bwLine(info.currentCN + "  到了"));
        lines.push(_bwLine("We are now at: " + filterAtIfNeeded(info.currentEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    }
    return lines;
}

function buildZaLines(info, cfg) {
    var lines = [], st = _getStatus(info), buy = _buyText(info);
    if (st === "none") { lines.push(_bwLine("欢迎乘坐")); lines.push(_bwLine(_bwTemp())); }
    else if (st === "start" || st === "terminal") {
        lines.push(_bwLine("乘客们，你们好！您现在乘坐的是" + info.routeCN + "公交车，方向" + info.endCN + "。" + buy + "。文明规范乘车从你我做起。"));
        lines.push(_bwLine(_bwTemp()));
    } else if (st === "running") {
        lines.push(_bwLine("下一站" + info.nextCN + "。"));
        lines.push(_bwLine("Next stop is " + filterAtIfNeeded(info.nextEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
        lines.push(_bwLine(info.routeCN + "公交车，方向" + info.endCN + "。"));
    } else {
        lines.push(_bwLine(info.currentCN + "到了。"));
        lines.push(_bwLine("We are arriving at " + filterAtIfNeeded(info.currentEN, cfg) + "."));
        lines.push(_bwLine(_bwTemp()));
        lines.push(_bwLine(info.routeCN + "公交车，方向" + info.endCN + "。"));
    }
    return lines;
}

function buildKlSubLines(info, cfg) {
    var lines = [], st = _getStatus(info), buy = _buyText(info);
    if (st === "none") { lines.push(_bwLine("欢迎乘坐")); lines.push(_bwLine(_bwTemp())); }
    else if (st === "start") {
        lines.push(_bwLine("乘客们，你们好！您现在乘坐的是" + info.routeCN + "公交车，方向" + info.endCN + "。" + buy + "。文明规范乘车从你我做起。"));
        lines.push(_bwLine(_bwTemp()));
    } else if (st === "running" || st === "depart") {
        lines.push(_bwLine("下一站 " + info.nextCN));
        lines.push(_bwLine("Next stop is " + filterAtIfNeeded(info.nextEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    } else if (st === "arrive") {
        lines.push(_bwLine("到站：" + info.currentCN));
        lines.push(_bwLine(filterAtIfNeeded(info.currentEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    } else {
        lines.push(_bwLine("下车时请检查随身携带的物品，请不要遗忘在车厢内。欢迎您再次乘坐" + info.routeCN + "公交车，并提出宝贵意见。"));
        lines.push(_bwLine(_bwTemp()));
    }
    return lines;
}

function buildRmLines(info, cfg) {
    var lines = [], st = _getStatus(info), bj = getBeijingTime();
    if (st === "none") { lines.push(_bwLine("欢迎乘坐")); lines.push(_bwLine(_bwTemp())); }
    else if (st === "start" || st === "terminal") {
        lines.push(_bwLine((info.currentCN || info.routeCN)));
        lines.push(_bwLine("北京时间：" + bj));
        lines.push(_bwLine(_bwTemp()));
    } else if (st === "running") {
        lines.push(_bwLine("下一站：" + info.nextCN));
        lines.push(_bwLine("北京时间：" + bj));
        lines.push(_bwLine(_bwTemp()));
    } else {
        lines.push(_bwLine(info.currentCN + "  到了"));
        lines.push(_bwLine("北京时间：" + bj));
        lines.push(_bwLine(_bwTemp()));
    }
    return lines;
}

function buildLsLines(info, cfg) {
    var lines = [], st = _getStatus(info);
    if (st === "none") { lines.push(_bwLine("欢迎乘坐")); lines.push(_bwLine(_bwTemp())); }
    else if (st === "start" || st === "terminal") {
        lines.push(_bwLine((info.currentCN || info.routeCN)));
        lines.push(_bwLine(filterAtIfNeeded(info.currentEN || info.routeEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    } else if (st === "running") {
        lines.push(_bwLine("下一站：" + info.nextCN));
        lines.push(_bwLine("The next stop is  " + filterAtIfNeeded(info.nextEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    } else {
        lines.push(_bwLine(info.currentCN + "  到了"));
        lines.push(_bwLine("We are arriving at  " + filterAtIfNeeded(info.currentEN, cfg)));
        lines.push(_bwLine(_bwTemp()));
    }
    return lines;
}


function drawLinesBw(g, lines, panelW, cfg) {
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

    var key = "in-bw";
    var sig = "";
    for (var k = 0; k < lines.length; k++) sig += "|" + (lines[k].text || "");

    if (typeof _BW_LINE_IDX === "undefined") _BW_LINE_IDX = 0;
    if (typeof _BW_LINES_SIG === "undefined") _BW_LINES_SIG = "";

    // 内容变了 → 从头开始, 清滚动状态
    if (sig !== _BW_LINES_SIG) {
        _BW_LINES_SIG = sig;
        _BW_LINE_IDX = 0;
        ScrollReset(null, key + "-0");
    }

    if (lines.length === 0) return;

    var ln = lines[_BW_LINE_IDX];
    if (!ln.text) {
        _BW_LINE_IDX = (_BW_LINE_IDX + 1) % lines.length;
        ScrollReset(null, key + "-0");
        return;
    }

    var panelH = 200;
    var maxW = panelW - 40;
    var bashi = (cfg && cfg.bashi === true);
    var speed = 340; // 旧 speed 是像素/帧(20fps), 转像素/秒

    // 构造 ScrollBlock 需要的 lines 数组
    g.setFont(ln.font);
    var fm = g.getFontMetrics();
    var baselineY = panelH / 2 + fm.getAscent() / 2; // 面板垂直居中

    // 温度行: 静态居中显示, 不滚动, 停留 2 秒后切下一行
    var isTempLine = (ln.text && String(ln.text).indexOf("温度") >= 0);
    if (isTempLine) {
        var tw = fm.stringWidth(ln.text);
        var tx = Math.round((panelW - tw) / 2);
        g.setColor(ln.color);
        g.drawString(ln.text, tx, baselineY);
        // 停留计时 (用 _BW_TEMP_HOLD 帧计数, 2秒=40帧@20fps)
        if (typeof _BW_TEMP_HOLD === 'undefined') _BW_TEMP_HOLD = 0;
        _BW_TEMP_HOLD++;
        if (_BW_TEMP_HOLD > 40) {
            _BW_TEMP_HOLD = 0;
            if (ln._tdEvent) _TD_EVENT_PLAYED = true;
            _BW_LINE_IDX = (_BW_LINE_IDX + 1) % lines.length;
            ScrollReset(null, key + "-" + _BW_LINE_IDX);
        }
    } else {
        _BW_TEMP_HOLD = 0;
        var sbLines = [{ text: ln.text, font: ln.font, color: ln.color, y: baselineY - fm.getAscent() }];
        var finished = ScrollBlock(g, null, key + "-" + _BW_LINE_IDX, sbLines, 20, maxW, speed, null, null, bashi, true);
        if (finished) {
            if (ln._tdEvent) _TD_EVENT_PLAYED = true;
            _BW_LINE_IDX = (_BW_LINE_IDX + 1) % lines.length;
            ScrollReset(null, key + "-" + _BW_LINE_IDX);
        }
    }

    // ===== 诊断屏幕 overlay (右下角, 黑色半透明背景) =====
    try {
        var _snap = (typeof _DX_LAST_SNAP !== 'undefined') ? _DX_LAST_SNAP : null;
        if (_snap && cfg && cfg._debug === true) {
            var df = BW_LED_FONT.deriveFont(Font.PLAIN, 24);
            g.setFont(df);
            var dfm = g.getFontMetrics();
            var dy = panelH - 4;
            var dx = panelW - 4;
            var lines2 = [
                "state=" + _snap.state + "  rp=" + Math.round(_snap.rp * 10) / 10,
                "hitIdx=" + _snap.hitIdx + "  railHit=" + _snap.railHit + "  gap=" + Math.round(_snap.closestGap),
                "cur=" + (_snap.curCN || "-") + "  next=" + (_snap.nextCN || "-"),
                "door=" + _snap.door + "  doorOpened=" + _snap.doorOpened,
                "--- display (" + ((typeof _DX_LAST_DISPLAY !== 'undefined') ? _DX_LAST_DISPLAY.length : 0) + " lines) ---"
            ];
            // 追加屏幕实际显示内容 (最多 6 行)
            if (typeof _DX_LAST_DISPLAY !== 'undefined') {
                for (var _di2 = 0; _di2 < Math.min(6, _DX_LAST_DISPLAY.length); _di2++) {
                    lines2.push("  [" + _di2 + "] " + _DX_LAST_DISPLAY[_di2]);
                }
            }
            var bgW = 0, bgH = dfm.getHeight() * lines2.length + 4;
            for (var li = 0; li < lines2.length; li++) { var w = dfm.stringWidth(lines2[li]); if (w > bgW) bgW = w; }
            bgW += 8;
            g.setColor(new Color(0, 0, 0, 200));
            g.fillRect(dx - bgW, dy - bgH, bgW, bgH);
            // 诊断信息 (浅红色)
            g.setColor(new Color(255, 200, 200));
            for (var li2 = 0; li2 < 5; li2++) {
                g.drawString(lines2[li2], dx - bgW + 4, dy - bgH + dfm.getHeight() * (li2 + 1));
            }
            // 屏幕显示内容 (浅绿色)
            g.setColor(new Color(200, 255, 200));
            for (var li3 = 5; li3 < lines2.length; li3++) {
                g.drawString(lines2[li3], dx - bgW + 4, dy - bgH + dfm.getHeight() * (li3 + 1));
            }
        }
    } catch(e_db2) {}
}

function buildBwSubLines(info, cfg) {
    var sub = (cfg && cfg.sub) || 'bw';
    if (sub === 'qs') return buildQsLines(info, cfg);
    if (sub === 'td') return buildTdLines(info, cfg);
    if (sub === 'apep') return buildApepLines(info, cfg);
    if (sub === 'kh') return buildKhLines(info, cfg);
    if (sub === 'za') return buildZaLines(info, cfg);
    if (sub === 'kl') return buildKlSubLines(info, cfg);
    if (sub === 'rm') return buildRmLines(info, cfg);
    if (sub === 'ls') return buildLsLines(info, cfg);
    return buildKlSubLines(info, cfg);
}

MODULE_IMPL = {
    buildConfig: function(cfg) { return buildInBwConfig(cfg); },
    renderOne: function(displays, train, rp, ap) {
        var cfg = (typeof CONFIG !== 'undefined' && CONFIG.in_dianxian) ? CONFIG.in_dianxian : null;
        var info = getStationInfo(train, rp, cfg);
        var lines = buildBwSubLines(info, cfg);
        var g = displays.graphicsFor('in-dianxian-bw');
        g.setColor(Color.BLACK);
        g.fillRect(0, 0, 2266, 200);
        drawLinesBw(g, lines, 2266, cfg);
        displays.upload();
    }
};
if (_MTR_LOG) print('[MTR] in_dianxian/bw main loaded (Excel row = carousel)');
