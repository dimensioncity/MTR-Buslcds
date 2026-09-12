// dianxian_util.js — shared for in/out dianxian BW & KL
importPackage(java.awt);

// [DX] 诊断日志开关
var _DX_LOG = false;

// ============ 字体加载 (参考固牌 safeGetFont, 带系统兜底) ============
function safeGetFont(pathStr, systemName, fallbackName, fallbackSize) {
    function _hasCjk(f) {
        if (!f) return false;
        try {
            // Java Font.canDisplay(char): 检查字体是否有某个 Unicode 字符的字形
            // '路' U+8DEF 是常用汉字, 能 display 说明字体有 CJK 支持
            if (f.canDisplay != null && f.canDisplay('路')) return true;
            // fallback: 试 measure
            var g2d = java.awt.GraphicsEnvironment.getLocalGraphicsEnvironment();
            var allFonts = g2d.getAllFonts();
            // 简单测试: deriveFont(12) 后测 width
            var f12 = f.deriveFont(Font.PLAIN, 12);
            if (f12 != null) return true; // 能 derive 就算了
        } catch(e_test) {}
        return false;
    }
    try {
        var f = Resources.readFont(Resources.id(pathStr));
        if (f != null && _hasCjk(f)) return f;
        // f != null 但不支持中文 → 继续尝试下面的 fallback
    } catch (e) {}
    try {
        var f2 = Resources.getSystemFont(systemName);
        if (f2 != null) return f2;
    } catch (e) {}
    return new Font(fallbackName, Font.PLAIN, fallbackSize);
}

// ============ FONTS ============
var KL_LED_FONT = safeGetFont("mtr:buslcds/font/kl/led.ttf", "Noto Serif", "Serif", 72);
var BW_LED_FONT = safeGetFont("mtr:buslcds/font/bw/led/cn.ttf", "Noto Serif", "Serif", 72);
// 巴士二公司数字/英文专用字体 (bashi: true 时用, 箭头除外)
var BASHI_NUM_FONT = null;
try {
    BASHI_NUM_FONT = safeGetFont("mtr:buslcds/font/bashinum.ttf", "Noto Sans", "SansSerif", 72);
} catch(e) {
    try {
        BASHI_NUM_FONT = safeGetFont("mtr:buslcds/font/kl/cepainum.otf", "Noto Sans", "SansSerif", 72);
    } catch(e2) {
        BASHI_NUM_FONT = BW_LED_FONT;
    }
}

// ============ BASHI 混合字体字符分离绘制 ============
// ASCII 字母/数字/空格/标点 → BASHI_NUM_FONT
// 汉字 / 箭头符号 / UTF-8 中文 → mainFont
// filterAtIfNeeded: 去除英文站名里的 "@" 和 "at" 单词
// @ 符号: 始终过滤 (来自线路图原始 enName 里的占位符)
// "at" 单词: 仅在 bashi 模式下过滤 (公交车英文站名里的 "at" 前缀/中缀)
function filterAtIfNeeded(text, cfg) {
    if (text == null) { if (_DX_LOG) print("[DX-FILTER] SKIP text=null"); return null; }
    var s = String(text);
    var _orig = s;
    // bw 可以在顶层 CONFIG.bw 或 子配置 cfg.bw, 两者都查
    var _bw = false;
    try { if (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.bw === true) _bw = true; } catch(e) {}
    try { if (cfg && cfg.bw === true) _bw = true; } catch(e2) {}
    if (_DX_LOG) print("[DX-FILTER] IN  bw=" + _bw + "  orig=\"" + _orig + "\"");
    // 1. 始终过滤 @
    if (s.indexOf('@') >= 0) {
        s = s.replace(/^\s*[@]\s*/, '');
        s = s.replace(/\s*[@]\s*/g, ' ');
    }
    // 2. 过滤 "at" 单词 (不区分大小写)
    if (_bw) {
        s = s.replace(/^\s*[Aa][Tt]\s+/, "");        // 开头 "At " 或 "at "
        s = s.replace(/\s+[Aa][Tt]\s+/g, " ");       // 中间 " at "
    }
    // 过滤效果诊断日志
    if (s !== _orig) {
        if (_DX_LOG) print("[DX-FILTER] OUT changed!  bw=" + _bw + "  @filtered=" + (_orig.indexOf('@') >= 0) + "  orig=\"" + _orig + "\"  →  filtered=\"" + s.trim() + "\"");
    } else {
        if (_DX_LOG) print("[DX-FILTER] OUT unchanged  bw=" + _bw + "  → keep=\"" + s.trim() + "\"");
    }
    return s.trim();
}

function _isBashiNum(ch) {
    var code = ch.charCodeAt(0);
    // 中文/全角字符一律不走 bashinum.ttf
    if (code >= 0x4E00 && code <= 0x9FFF) return false;
    if (code >= 0x3400 && code <= 0x4DBF) return false;
    if (code >= 0xF900 && code <= 0xFAFF) return false;
    if (code >= 0x3000 && code <= 0x303F) return false;
    if (code >= 0xFF00 && code <= 0xFFEF) return false;
    if (code >= 0x30 && code <= 0x39) return true;  // 0-9
    if (code >= 0x41 && code <= 0x5A) return true;  // A-Z
    if (code >= 0x61 && code <= 0x7A) return true;  // a-z
    if (code === 0x20 || code === 0x2E || code === 0x2C || code === 0x3A) return true;
    if (code === 0xB0 || code === 0x21 || code === 0x3F) return true;  // ° ! ?
    return false;
}
function _bashiFontFor(mainFont) {
    if (!BASHI_NUM_FONT) return mainFont;
    return BASHI_NUM_FONT.deriveFont(Font.PLAIN, mainFont.getSize2D());
}
// 从 startX 开始绘制, 返回实际绘制宽度
function drawMixedFontText(g, text, startX, baselineY, mainFont, useBashi) {
    if (!useBashi || !BASHI_NUM_FONT) {
        g.setFont(mainFont);
        g.drawString(text, Math.round(startX), Math.round(baselineY));
        return g.getFontMetrics().stringWidth(text);
    }
    var fMain = mainFont;
    var fBashi = _bashiFontFor(mainFont);
    var curX = startX;
    var buf = ""; var bufIsNum = false;
    var flush = function() {
        if (buf.length > 0) {
            g.setFont(bufIsNum ? fBashi : fMain);
            var fm = g.getFontMetrics();
            g.drawString(buf, Math.round(curX), Math.round(baselineY));
            curX += fm.stringWidth(buf);
            buf = "";
        }
    };
    for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        var isNum = _isBashiNum(ch);
        if (buf.length === 0) { buf = ch; bufIsNum = isNum; }
        else if (bufIsNum === isNum) { buf += ch; }
        else { flush(); buf = ch; bufIsNum = isNum; }
    }
    flush();
    return curX - startX;
}
// 混合字体宽度测量 (不绘制)
function measureMixedFontText(g, text, mainFont, useBashi) {
    if (!useBashi || !BASHI_NUM_FONT) {
        g.setFont(mainFont);
        return g.getFontMetrics().stringWidth(text);
    }
    var fMain = mainFont;
    var fBashi = _bashiFontFor(mainFont);
    var total = 0; var curFont = null; var curBuf = '';
    for (var i = 0; i < text.length; i++) {
        var f = _isBashiNum(text.charAt(i)) ? fBashi : fMain;
        if (curFont === null) { curFont = f; curBuf = text.charAt(i); }
        else if (curFont === f) { curBuf += text.charAt(i); }
        else {
            g.setFont(curFont);
            total += g.getFontMetrics().stringWidth(curBuf);
            curFont = f; curBuf = text.charAt(i);
        }
    }
    if (curBuf.length > 0) {
        g.setFont(curFont);
        total += g.getFontMetrics().stringWidth(curBuf);
    }
    return total;
}

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
        pauseStart: config.pauseStart || 0,
        pauseEnd: config.pauseEnd || 0,
        x: 0,
        state: 'pauseStart',
        frame: 0,
        width: 0,
        bashi: (config.bashi === true),
        forceScroll: (config.forceScroll === true)
    };
}

// Call once per render frame with graphics context g
function drawScrollingText(g, ss) {
    var useBashi = (ss.bashi === true);
    if (!useBashi) {
        g.setFont(ss.font);
        var fm = g.getFontMetrics();
        ss.width = fm.stringWidth(ss.text);
    } else {
        ss.width = measureMixedFontText(g, ss.text, ss.font, true);
    }
    var needsScroll = ss.width > ss.maxWidth || ss.forceScroll === true;

    g.setColor(ss.color);
    var baseline = ss.y + g.getFontMetrics(ss.font).getAscent();

    if (!needsScroll) {
        // Static centered
        var cx = (ss.maxWidth - ss.width) / 2;
        if (useBashi) {
            drawMixedFontText(g, ss.text, cx, baseline, ss.font, true);
        } else {
            g.drawString(ss.text, Math.round(cx), Math.round(baseline));
        }
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

    if (useBashi) {
        drawMixedFontText(g, ss.text, ss.x, baseline, ss.font, true);
    } else {
        g.setFont(ss.font);
        g.drawString(ss.text, Math.round(ss.x), Math.round(baseline));
    }
}
// ============================================================
// ScrollBlock — KR-Dimension-City 风格滚动逻辑移植
// 时间驱动 (Date.now) 而非帧计数，帧率无关
// 短文本自动居中，长文本一次滚完返回 true 供上层切换
// state: 上层传入的状态对象 (如 state.dxScroll), 或者传 null 用全局 _DX_SCROLL
// lines: [{text, font, color, y}] 多行同时滚动
// areaX: 滚动区左边界
// areaW: 滚动区宽度
// speed: 像素/秒 (default 180)
// clipH: 可选裁剪高度
// drawFn: 可选自定义绘制 (Bashi 混排时传进去), 签名 (g, line, x, baselineY, useBashi)
// ============================================================
function ScrollBlock(g, state, key, lines, areaX, areaW, speed, clipH, drawFn, useBashi, forceScroll) {
    if (speed == null || speed == undefined) speed = 280;

    var linesSig = key;
    for (var _li = 0; _li < lines.length; _li++) {
        linesSig += "|" + (lines[_li].text || "");
    }

    // 状态存储：优先用 state.dxScroll, 否则全局 _DX_SCROLL
    var store;
    if (state) {
        if (!state.dxScroll) state.dxScroll = {};
        store = state.dxScroll;
    } else {
        if (typeof _DX_SCROLL === "undefined") _DX_SCROLL = {};
        store = _DX_SCROLL;
    }

    var now = Date.now();
    var s = store[key];
    if (s == null) {
        s = { progress: 0, lastTs: now, blockW: -1, linesW: null, sig: "" };
        store[key] = s;
    }
    var dt = (now - s.lastTs) / 1000;
    s.lastTs = now;
    if (dt > 0.5 || dt < 0) dt = 0; // 原版: 卡帧时不推进 // 打断/卡帧: 默认 16ms, 避免跳帧后瞬间飞

    // 消息未变 → 复用缓存尺寸
    if (s.blockW < 0 || s.sig !== linesSig) {
        var blockW = 0;
        var linesW = [];
        for (var i = 0; i < lines.length; i++) {
            var ln = lines[i];
            g.setFont(ln.font);
            var w;
            if (drawFn) {
                w = measureMixedFontText(g, ln.text, ln.font, useBashi === true);
            } else {
                w = g.getFontMetrics().stringWidth(ln.text || "");
            }
            linesW.push(w);
            if (w > blockW) blockW = w;
        }
        s.blockW = blockW;
        s.linesW = linesW;
        s.sig = linesSig;
    } else {
        var blockW = s.blockW;
        var linesW = s.linesW;
    }

    // 短文本: 居中静态显示 4 秒 (forceScroll=true 时强制滚动)
    if (blockW <= areaW && !forceScroll) {
        s.progress += dt;
        if (clipH) g.setClip(areaX, 0, areaW, clipH);
        else g.setClip(areaX, 0, areaW, 400);

        for (var j = 0; j < lines.length; j++) {
            var lnj = lines[j];
            g.setFont(lnj.font);
            g.setColor(lnj.color);
            var lw = linesW[j];
            var lx = areaX + (areaW - lw) / 2;
            var baselineY = lnj.y + g.getFontMetrics(lnj.font).getAscent();
            if (drawFn) {
                drawFn(g, lnj, lx, baselineY, useBashi === true);
            } else {
                g.drawString(lnj.text || "", Math.round(lx), Math.round(baselineY));
            }
        }
        g.setClip(null);
        var _shortFinished = (s.progress >= 4);
        if (_shortFinished) s.progress = 0; // 自动重置, 循环显示
        return _shortFinished;
    }

    // forceScroll=true 时, 短文本也走滚动路径
    if (forceScroll && blockW <= areaW) {
        blockW = areaW + 1;
    }

    // 长文本: 从右到左, 自动循环 (progress 单位: 像素, 永不停止累加)
    var startX = areaX + areaW;
    var totalDist = areaW + blockW;
    var _sp = speed || 280;
    var _cycle = totalDist + _sp;
    var _prevCycle = Math.floor(s.progress / _cycle);
    s.progress += dt * _sp;
    var _curCycle = Math.floor(s.progress / _cycle);
    var _justFinished = (_curCycle > _prevCycle);
    var _mod = s.progress % _cycle;
    var x;
    if (_mod >= totalDist) {
        x = -blockW - 10; // 暂停 1 秒: 文字在左侧外
    } else {
        x = startX - _mod;
    }

    if (clipH) g.setClip(areaX, 0, areaW, clipH);
    else g.setClip(areaX, 0, areaW, 400);

    for (var k = 0; k < lines.length; k++) {
        var lnk = lines[k];
        g.setFont(lnk.font);
        g.setColor(lnk.color);
        var baselineY2 = lnk.y + g.getFontMetrics(lnk.font).getAscent();
        if (drawFn) {
            drawFn(g, lnk, x, baselineY2, useBashi === true);
        } else {
            g.drawString(lnk.text || '', Math.round(x), Math.round(baselineY2));
        }
    }
    g.setClip(null);
    return _justFinished;
}

// 清除某个 key 的滚动状态 (切站/切模式时调)
function ScrollReset(state, key) {
    if (state && state.dxScroll) {
        if (key) delete state.dxScroll[key];
        else state.dxScroll = {};
    }
    if (typeof _DX_SCROLL !== "undefined") {
        if (key) delete _DX_SCROLL[key];
        else _DX_SCROLL = {};
    }
}


// ============ 到站状态锁存 (解决 arrive/depart 切换时机) ============
// 按 train 实例隔离, 多辆车不会互相污染
// key = train 唯一标识, value = { doorOpened: bool }
var _DX_LOCK = {};
function _dxLockKey(train) {
    try { if (train && train.id != null) return "t" + train.id; } catch(e) {}
    try { if (train) return "h" + java.lang.System.identityHashCode(train); } catch(e2) {}
    return "default";
}

// ============ FARE TYPE 解析 (参照线路图 format.js parseRouteAttributes + parseFare) ============
// route.name 格式: "1127路||上行||蓝斯||#direction:up||fare=1"
// fare=1 → 单一票价 → "上车请主动投币"
// fare=1-10 或 fare=2~5 → 多级票价 → "上车请主动买票"
// 无 fare 属性 → 默认多级票价 → "上车请主动买票"
// 返回值: "single" | "multi"
function parseFareType(routeName) {
    if (!routeName) return "multi";
    var s = String(routeName);
    // 找 ||fare= 或 ||#fare= 段
    var fareVal = null;
    var idx = s.indexOf("||");
    if (idx >= 0) {
        var attrPart = s.substring(idx + 2);
        var segments = attrPart.split("||");
        for (var i = 0; i < segments.length; i++) {
            var p = segments[i].trim();
            if (p.length == 0) continue;
            if (p.charAt(0) == "#") p = p.substring(1);
            var sepIdx = p.indexOf(":");
            if (sepIdx < 0) sepIdx = p.indexOf("=");
            if (sepIdx > 0) {
                var key = p.substring(0, sepIdx).trim();
                var val = p.substring(sepIdx + 1).trim();
                if (key.toLowerCase() === "fare") { fareVal = val; break; }
            }
        }
    }
    if (fareVal == null || fareVal.length == 0) return "multi";
    // 含 - 或 ~ → 多级票价
    if (fareVal.indexOf("-") >= 0 || fareVal.indexOf("~") >= 0) return "multi";
    // 0-9 纯数字 → 单一票价
    var n = parseInt(fareVal, 10);
    if (!isNaN(n) && n >= 0 && n <= 9) return "single";
    return "multi";
}

// ============ STATION STATE (参照 makilcd + tmz05lcd) ============
// 状态机框架: makilcd getTrainStatus (无onPlatformRail, 公交用distance对比)
// 到站检测: tmz05lcd onPlatformRail → 公交改用 railProgress vs distance 对比
// 站名映射: makilcd 用 nextIndex 获取站台, 到站时它就是当前站, 运行时是下一站
// Returns: { state: 'none'|'start'|'arrive'|'depart'|'running'|'terminal',
//            currentCN, currentEN, nextCN, nextEN, startCN, endCN, routeNum, fareType }
function getStationInfo(train, routePlats, cfg) {
    var info = { state: 'none', currentCN: '', currentEN: '', nextCN: '', nextEN: '',
                 startCN: '', endCN: '', startEN: '', endEN: '',
                 routeNum: '', routeCN: '', routeEN: '', fareType: 'multi' };
    if (!routePlats) return info;
    try { var _rsz = routePlats.length; if (_rsz == 0) return info; } catch(e) { return info; }

    function _splitCnEn(raw) {
        if (!raw) return { cn: '', en: '' };
        var s = String(raw).trim();
        var pi = s.indexOf('|');
        if (pi < 0) return { cn: s, en: s };
        return { cn: s.substring(0, pi).trim(), en: s.substring(pi + 1).trim() };
    }

    // Route name & fare type
    try {
        var _rn = '';
        if (train != null && train.route != null) _rn = String(train.route.name);
        else if (routePlats.length > 0) {
            var _p0 = routePlats.get ? routePlats.get(0) : routePlats[0];
            if (_p0 != null && _p0.route != null) _rn = String(_p0.route.name);
        }
        var _rnSplit = _splitCnEn(_rn);
        info.routeNum = _rnSplit.cn;
        info.routeCN = _rnSplit.cn;
        info.routeEN = filterAtIfNeeded(_rnSplit.en, cfg);
        info.fareType = parseFareType(_rn);
    } catch(e) {}

    // Terminals
    try {
        var _fp = routePlats.get ? routePlats.get(0) : routePlats[0];
        var _lp = routePlats.get ? routePlats.get(routePlats.length - 1) : routePlats[routePlats.length - 1];
        var _fn = _fp.station ? String(_fp.station.name) : '';
        var _ln = _lp.station ? String(_lp.station.name) : '';
        var _fs = _splitCnEn(_fn);
        var _ls = _splitCnEn(_ln);
        info.startCN = _fs.cn; info.startEN = filterAtIfNeeded(_fs.en, cfg);
        info.endCN = _ls.cn;   info.endEN = filterAtIfNeeded(_ls.en, cfg);
    } catch(e) {}

    // ===== makilcd 风格: 状态机 + nextIndex 获取站台 =====
    try {
        var _plats;
        try { _plats = train.getThisRoutePlatforms(); } catch(e_gap1) {
            try { _plats = train.getAllPlatforms(); } catch(e_gap2) { _plats = routePlats; }
        }
        var _psz = _plats.size ? _plats.size() : (_plats.length || 0);
        if (_psz == 0) { info.state = 'none'; return info; }

        // railProgress → 当前物理位置
        var _rp = Number(train.railProgress()) || 0;

        // ===== 到站检测: 先试 tmz05lcd 原版 onPlatformRail (dwellTime + savedRailBaseId) =====
        // 如果 dwellTime 全为 0 (公交模组无配置), fallback 到 distance 对比
        var _hitIdx = -1;
        var _closestGap = 999999;  // 调试: 记录 rp 最近的站台差值

        // --- 方案1: tmz05lcd 原版 ---
        // 车头/车尾所在轨道段: dwellTime != 0 且 savedRailBaseId == 下一个站台ID
        // 注意: getAllPlatformsNextIndex 返回的是全局站台索引, 和 getThisRoutePlatforms 的索引体系不同!
        // 所以命中后必须用站台物理 ID 去本线路站台列表里匹配, 不能直接用 _nextPlatIdx
        var _railHit = false;
        try {
            var _allPlats = train.getAllPlatforms();
            var _nextPlatIdx = train.getAllPlatformsNextIndex();
            if (_allPlats && _nextPlatIdx < _allPlats.size()) {
                var _nextPlatId = _allPlats.get(_nextPlatIdx).platform.id;
                var _path1 = train.path().get(train.getRailIndex(train.getRailProgress(0), false));
                var _path2 = train.path().get(train.getRailIndex(train.getRailProgress(train.trainCars() - 1), true));
                if ((_path1 && _path1.dwellTime != 0 && _path1.savedRailBaseId == _nextPlatId) ||
                    (_path2 && _path2.dwellTime != 0 && _path2.savedRailBaseId == _nextPlatId)) {
                    _railHit = true;
                    // 关键: 用站台物理 ID 去本线路列表里找对应索引
                    for (var _mi = 0; _mi < _psz; _mi++) {
                        var _mp = _plats.get ? _plats.get(_mi) : _plats[_mi];
                        var _mid = (_mp.platform && _mp.platform.id) || _mp.id;
                        if (_mid == _nextPlatId) { _hitIdx = _mi; break; }
                    }
                    // 如果 ID 匹配失败, fallback 到方案2 的 closestGap 逻辑
                    if (_hitIdx < 0) _railHit = false;
                }
            }
        } catch(e_rail) { /* 轨道检测失败 → fallback */ }

        // --- 方案2: distance 对比 (方案1失败时) ---
        // 先遍历找到 closestGap 最小的站台 (物理上最近的), 再检查是否在命中区间内
        // 避免多站台 distance-10 重叠时命中错误站台
        if (!_railHit) {
            var _bestIdx = -1, _bestAbsGap = 999999;
            for (var _i = 0; _i < _psz; _i++) {
                var _pd = Number(_plats.get ? _plats.get(_i).distance : _plats[_i].distance) || 0;
                var _gap = _rp - _pd;
                if (Math.abs(_gap) < _bestAbsGap) {
                    _bestAbsGap = Math.abs(_gap);
                    _closestGap = _gap;  // 保留 signed 值给日志用
                    _bestIdx = _i;
                }
            }
            // 检查最近的站台是否在命中区间 [distance-10, distance+0.1]
            if (_bestIdx >= 0) {
                var _bestPd = Number(_plats.get ? _plats.get(_bestIdx).distance : _plats[_bestIdx].distance) || 0;
                if (_rp >= _bestPd - 10 && _rp <= _bestPd + 0.1) {
                    _hitIdx = _bestIdx;
                }
            }
        }
        var _hasArrived = (_hitIdx >= 0);

        // ===== 站名映射 (makilcd 风格) =====
        // 到站中: current = 命中的站台, next = 下一个
        // 运行中: 找到 railProgress 刚过的那个站台作为 current, 下一个就是 next
        var _curIdx, _nextRealIdx;
        if (_hasArrived) {
            _curIdx = _hitIdx;
        } else {
            _curIdx = 0;
            for (var _j = 0; _j < _psz; _j++) {
                var _jd = Number(_plats.get ? _plats.get(_j).distance : _plats[_j].distance) || 0;
                if (_rp >= _jd) _curIdx = _j;
                else break;
            }
        }
        _nextRealIdx = Math.min(_curIdx + 1, _psz - 1);

        var _getStName = function(idx) {
            if (idx < 0 || idx >= _psz) return '';
            var p = _plats.get ? _plats.get(idx) : _plats[idx];
            return p && p.station ? String(p.station.name || '') : '';
        };
        var _curSplit = _splitCnEn(_getStName(_curIdx));
        var _nextSplit = _splitCnEn(_getStName(_nextRealIdx));
        info.currentCN = _curSplit.cn;
        info.currentEN = filterAtIfNeeded(_curSplit.en, cfg);   // 配置入口最顶端: 源头过滤 EN 站名
        info.nextCN = _nextSplit.cn;
        info.nextEN = filterAtIfNeeded(_nextSplit.en, cfg);     // 中文维持现状, 英文先过过滤器

        // ===== 状态判定 (tmz05lcd getTrainStatus 框架) =====
        var _isOnRoute = true;
        try { _isOnRoute = train.isOnRoute(); } catch(e_ior) {}

        // 到站状态锁存 (按 train 隔离, 防止多辆车互相污染)
        var _lk = _dxLockKey(train);
        if (!_DX_LOCK[_lk]) _DX_LOCK[_lk] = { doorOpened: false };
        // 离开站台区间 → 重置锁存, 下次进站重新计时
        if (!_hasArrived) _DX_LOCK[_lk].doorOpened = false;

        var _atStart = false;
        var _atTerminal = false;
        if (!_isOnRoute) {
            _atStart = true;
        } else if (_hasArrived) {
            if (_hitIdx == 0) _atStart = true;
            else if (_hitIdx >= _psz - 1) _atTerminal = true;
        }

        if (_atStart) {
            info.state = 'start';
        } else if (_atTerminal) {
            info.state = 'terminal';
        } else if (_hasArrived) {
            // 命中站台 → 先显示 arrive ("xx站到了"), 不管门开没开
            // 门开过 + 门关上 → depart ("下一站xx")
            var _doorNow = false;
            try { _doorNow = train.isDoorOpening(); } catch(e_door) {}
            if (_doorNow) _DX_LOCK[_lk].doorOpened = true;
            if (_DX_LOCK[_lk].doorOpened && !_doorNow) {
                info.state = 'depart';  // 门开过且已关 → depart
            } else {
                info.state = 'arrive';  // 刚进站 或 门正在开 → arrive
            }
        } else {
            info.state = 'running';
        }

        // ===== 诊断日志 (节流: 每秒最多一次, 或状态变化时) =====
        try {
            var _DX_LAST_STATE = (typeof _DX_LAST_STATE !== 'undefined') ? _DX_LAST_STATE : '';
            var _DX_LAST_TIME = (typeof _DX_LAST_TIME !== 'undefined') ? _DX_LAST_TIME : 0;
            var _DX_NOW = java.lang.System.currentTimeMillis();
            var _DX_NEED_LOG = (_DX_NOW - _DX_LAST_TIME > 1000) || (info.state !== _DX_LAST_STATE);
            if (_DX_NEED_LOG) {
                _DX_LAST_TIME = _DX_NOW;
                _DX_LAST_STATE = info.state;
                var _log = "";
                if (_DX_LOG) {
                _log = "[DX] state=" + info.state
                    + " rp=" + Math.round(_rp * 10) / 10
                    + " railHit=" + _railHit
                    + " hit=" + (_hitIdx >= 0 ? (_hitIdx + "/" + _psz + " cn=" + info.currentCN) : "none")
                    + " closestGap=" + Math.round(_closestGap)
                    + " onRoute=" + _isOnRoute;
                if (info.state === 'arrive' || info.state === 'depart') {
                    _log += " door=" + (train.isDoorOpening ? (function(){ try { return train.isDoorOpening(); } catch(e){ return '?'; } })() : '?');
                }
                _log += " next=" + info.nextCN + "/" + _nextRealIdx;
                _log += " [" + _psz + " plats]";
                for (var _di = 0; _di < Math.min(_psz, 5); _di++) {
                    var _dd = Number(_plats.get ? _plats.get(_di).distance : _plats[_di].distance) || 0;
                    _log += " d" + _di + "=" + Math.round(_dd) + "(±" + Math.round(_rp - _dd) + ")";
                }
                if (_psz > 5) _log += " ...";
                print(_log);
                }
                // 同时存一份快照给屏幕 overlay 用 (_DX_LOG=false 时为空串, overlay 显示 CONFIG._debug 控制)
                _DX_LAST_LOG = _log;
            }
            // 存屏幕 overlay 快照 (始终更新, 不管节流)
            _DX_LAST_SNAP = {
                state: info.state,
                rp: _rp,
                railHit: _railHit,
                hitIdx: _hitIdx,
                closestGap: _closestGap,
                curCN: info.currentCN,
                nextCN: info.nextCN,
                door: (info.state === 'arrive' || info.state === 'depart') ? (function(){ try { return train.isDoorOpening(); } catch(e){ return false; } })() : false,
                doorOpened: _DX_LOCK[_lk] ? _DX_LOCK[_lk].doorOpened : false
            };
        } catch(e_log) {}
    } catch(e2) { info.state = 'none'; }

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
// 温度缓存（全局，所有 variant 共享，避免每帧重算）
var _TEMP_CACHE = { value: 0, lastUpdate: 0 };

// ===== 上海温度：按月份给基础温度，每 5 分钟随机浮动一次（参照 KR-Dimension-City tmz05lcd2 方案） =====
// 冬季(1-2月)冷，夏季(7-8月)热，春秋过渡。每 5 分钟在基础温度 ±2 范围内随机浮动
function getTemperature() {
    var now = java.lang.System.currentTimeMillis();
    if (_TEMP_CACHE.value === 0 || now - _TEMP_CACHE.lastUpdate >= 300000) {
        var baseTemp = 22;
        try {
            importClass(java.util.Calendar);
            var month = Calendar.getInstance().get(Calendar.MONTH) + 1;
            if (month >= 1 && month <= 2) baseTemp = 6;
            else if (month >= 3 && month <= 4) baseTemp = 16;
            else if (month >= 5 && month <= 6) baseTemp = 24;
            else if (month >= 7 && month <= 8) baseTemp = 30;
            else if (month >= 9 && month <= 10) baseTemp = 23;
            else baseTemp = 10;
        } catch(e) {}
        var noise = Math.floor(Math.random() * 5) - 2;
        _TEMP_CACHE.value = baseTemp + noise;
        _TEMP_CACHE.lastUpdate = now;
    }
    return _TEMP_CACHE.value;
}

// Beijing time
function getBeijingTime() {
    var now = new Date();
    var dow = ['日','一','二','三','四','五','六'][now.getDay()];
    return java.lang.String.format("%02d月%02d日星期%s %02d时%02d分",
        java.lang.Integer(now.getMonth()+1), java.lang.Integer(now.getDate()), dow, java.lang.Integer(now.getHours()), java.lang.Integer(now.getMinutes()));
}

if (_MTR_LOG) print("[MTR] dianxian_util loaded");

// ============ 车辆状态检测（out_dianxian 专用） ============
// 返回: { state: "normal"|"brake"|"left"|"right", brakeBlink: bool, turnPhase: 0|1 }
// 刹车: train.speed() 减速幅度 > 0.5 时触发
// 转向: 自动检测 — 位置差算运动方向, 侧向位移 > 0.5 时触发
//   优先级: 转向 > 刹车 (同时发生时优先显示转向)
//
//   朝向     左转前进方向    右转前进方向
//   朝南(Z+)  Z++X-(西南)   Z++X+(东南)
//   朝北(Z-)  Z-+X+(东北)   Z-+X-(西北)
//   朝东(X+)  X++Z+(东南)   X++Z-(东北)
//   朝西(X-)  X-+Z-(西北)   X-+Z+(西南)
//
// CONFIG.vehicle 可强制覆盖: { state: "left"|"right"|"brake"|"normal", turnSide: "left"|"right" }
//
// 注意: MTR 模组多辆车共享同一个 JS context, 状态必须按 train.id 隔离
var _VEH_STATES = {};  // key = trainId, value = state obj

function _getVehState(train) {
    var _tid = _dxLockKey(train);  // 复用 dianxian_util 的列车隔离 key
    if (!_VEH_STATES[_tid]) {
        _VEH_STATES[_tid] = {
            state: "normal", brakeFrame: 0, turnFrame: 0, turnSide: "",
            lastSpeed: -1,
            // 固定时间窗口 (1秒) 刹车检测
            winSp: -1, winTime: 0,
            brakeLatch: 0,
            // yaw 转向检测: 朝向角变化累计
            lastYaw: 0, hasLastYaw: false,
            yawAccum: 0,   // 累计 yaw 变化 (度)
            yawWinStart: 0
        };
    }
    return _VEH_STATES[_tid];
}

// 多策略获取列车 yaw (朝向角, 度)
function _getTrainYaw(train) {
    try {
        if (!train) return null;
        // ★ MTR TrainWrapper: lastCarRotation (Vector3f[]) — 每节车厢旋转
        //   Vector3f 是 LWJGL 类, 值为**弧度**! 需要转角度 (×180/π)
        if (train.lastCarRotation && train.lastCarRotation.length > 0) {
            var _midRot = Math.floor(train.lastCarRotation.length / 2);
            var _rv = train.lastCarRotation[_midRot];
            if (_rv) {
                var _raw = null;
                if (typeof _rv.y === 'number') _raw = Number(_rv.y);
                else if (typeof _rv.y === 'function') _raw = Number(_rv.y());
                else if (typeof _rv.getY === 'function') _raw = Number(_rv.getY());
                else if (typeof _rv.rotY === 'number') _raw = Number(_rv.rotY);
                else if (typeof _rv.rotationY === 'number') _raw = Number(_rv.rotationY);
                // 兜底反射
                if (_raw == null) {
                    try {
                        var _clsV = _rv.getClass();
                        var _fldsV = _clsV.getDeclaredFields();
                        var _bestAbs = -1;
                        for (var _k = 0; _k < _fldsV.length; _k++) {
                            try {
                                _fldsV[_k].setAccessible(true);
                                var _vv = _fldsV[_k].get(_rv);
                                var _nv = Number(_vv);
                                if (!isNaN(_nv) && Math.abs(_nv) > _bestAbs && Math.abs(_nv) < 360) {
                                    _bestAbs = Math.abs(_nv);
                                    _raw = _nv;
                                }
                            } catch(_ee) {}
                        }
                    } catch(_ex) {}
                }
                if (_raw != null) {
                    // Vector3f 值是弧度 → 转角度 (弧度 × 180/π ≈ 弧度 × 57.2958)
                    return _raw * 57.29577951308232;
                }
            }
        }
        // 兜底策略 (这些可能已经是角度了, Minecraft rotationYaw 就是角度)
        var _fb = null;
        if (train.rotationYaw !== undefined && train.rotationYaw !== null) _fb = Number(train.rotationYaw);
        else if (typeof train.getRotationYaw === 'function') _fb = Number(train.getRotationYaw());
        else if (typeof train.yaw === 'function') _fb = Number(train.yaw());
        else if (train.yaw !== undefined) _fb = Number(train.yaw);
        if (_fb != null) return _fb;
    } catch(e) {}
    return null;
}

// 归一化 yaw 差到 (-180, 180]
function _yawDelta(cur, last) {
    var d = cur - last;
    while (d > 180) d -= 360;
    while (d <= -180) d += 360;
    return d;
}

// 多策略获取列车当前中心位置 (x, z) —— 多策略兜底
function _getTrainPos(train) {
    try {
        if (!train) return null;
        // 策略1: lastCarPosition (Vec3[]) —— 取中心车厢
        //   Vec3 是 Java 对象, 必须用方法调用 .x()/.z() 或 .getX()/.getZ()
        if (train.lastCarPosition && train.lastCarPosition.length > 0) {
            var _mid = Math.floor(train.lastCarPosition.length / 2);
            var v = train.lastCarPosition[_mid];
            if (v) {
                // 1a: .x() / .z() 方法调用 (MTR lwjgl Vec3 风格)
                if (typeof v.x === 'function') return { x: Number(v.x()), z: Number(v.z()) };
                // 1b: .getX() / .getZ() 方法调用
                if (typeof v.getX === 'function') return { x: Number(v.getX()), z: Number(v.getZ()) };
                // 1c: .x / .z 属性 (Rhino 反射包装后的 Java field)
                if (typeof v.x === 'number') return { x: v.x, z: v.z };
            }
        }
        // 策略2: train 自身属性或方法
        if (typeof train.x === 'function') return { x: Number(train.x()), z: Number(train.z()) };
        if (typeof train.x === 'number') return { x: train.x, z: train.z };
        // 策略3: train.pos
        if (train.pos) {
            if (typeof train.pos.x === 'function') return { x: Number(train.pos.x()), z: Number(train.pos.z()) };
            if (typeof train.pos.x === 'number') return { x: train.pos.x, z: train.pos.z };
        }
        // 策略4: mtrTrain().getX() / getZ()
        if (typeof train.mtrTrain === 'function') {
            var mt = train.mtrTrain();
            if (mt) {
                if (typeof mt.getX === 'function') return { x: Number(mt.getX()), z: Number(mt.getZ()) };
                if (typeof mt.x === 'function') return { x: Number(mt.x()), z: Number(mt.z()) };
            }
        }
    } catch(e) {}
    return null;
}

function getVehicleState(train) {
    var _S = _getVehState(train);

    // ===== 1. CONFIG 强制覆盖 =====
    var _cfgForce = false;
    var _cfgForceState = null;
    try {
        if (typeof CONFIG !== 'undefined' && CONFIG) {
            if (CONFIG.vehicle && CONFIG.vehicle.state
                && (CONFIG.vehicle.state === "left" || CONFIG.vehicle.state === "right" || CONFIG.vehicle.state === "normal" || CONFIG.vehicle.state === "brake")) {
                _cfgForce = true;
                _cfgForceState = String(CONFIG.vehicle.state);
                _S.turnSide = CONFIG.vehicle.turnSide || "";
            }
        }
    } catch(e) {}

    // ===== 2. 获取当前速度 =====
    var _sp = 0;
    try {
        if (train && typeof train.speed === 'function') _sp = Math.abs(Number(train.speed()) || 0);
        else if (train && train.speed !== undefined) _sp = Math.abs(Number(train.speed) || 0);
    } catch(e) {}

    // ===== 3. 刹车检测: 1秒窗口速度降幅 =====
    // 帧间差 ~0.005 太小, 用固定时间窗口累计降幅
    var _nowMs = java.lang.System.currentTimeMillis();
    var _brakeDrop = 0;   // 当前窗口内速度降幅
    if (_S.winSp < 0) {
        // 首次采样
        _S.winSp = _sp;
        _S.winTime = _nowMs;
    } else if (_nowMs - _S.winTime >= 1000) {
        // 窗口到期 (>=1秒), 计算降幅, 重置窗口
        _brakeDrop = _S.winSp - _sp;
        _S.winSp = _sp;
        _S.winTime = _nowMs;

        // 窗口触发时判断刹车, 锁存 40 帧 (4秒 @ 10fps, 覆盖1-2秒检测窗口+3秒缓冲)
        if (_brakeDrop > 0.005 && _sp > 0.005) {
            _S.brakeLatch = 40;
        } else if (_brakeDrop < -0.005) {
            // 窗口内速度净增 = 加速, 释放刹车锁存
            _S.brakeLatch = 0;
        }
    }

    // 锁存递减, 速度为 0 时立刻解锁 (停车不是刹车)
    if (_S.brakeLatch > 0) {
        if (_sp < 0.005) _S.brakeLatch = 0;
        else _S.brakeLatch--;
    }

    var _isBrakingNow = (_S.brakeLatch > 0);  // 由锁存决定, 不是瞬时 _brakeDrop

    if (!_cfgForce && _S.state !== "left" && _S.state !== "right") {
        if (_isBrakingNow) {
            if (_S.state !== "brake") _S.brakeFrame = 0;  // 只在切入 brake 时归零
            _S.state = "brake";
        } else {
            if (_S.state === "brake") _S.brakeFrame = 0;  // 只在切出 brake 时归零
            _S.state = "normal";
        }
        _S.lastSpeed = _sp;
    }

    // ===== DBG: 每2秒打一次, 在刹车检测后 (CONFIG.debug 总开关) =====
    if (typeof CONFIG !== "undefined" && CONFIG && CONFIG.debug === true) {
    var _dbgNow = java.lang.System.currentTimeMillis();
    if (!_S._dbgLast || _dbgNow - _S._dbgLast > 2000) {
        _S._dbgLast = _dbgNow;
        var _dbgYaw = _getTrainYaw(train);
        print("[VEH-DBG] state=" + _S.state + " sp=" + _sp.toFixed(2)
            + " winSp=" + _S.winSp.toFixed(2) + " drop=" + _brakeDrop.toFixed(2)
            + " latch=" + _S.brakeLatch + " brakeNow=" + _isBrakingNow
            + " yaw=" + (_dbgYaw != null ? _dbgYaw.toFixed(1) : "null")
            + " yawAccum=" + _S.yawAccum.toFixed(1));
        // 每10秒打 Vector3f 三轴原始值, 确认哪个是 yaw
        if (!_S._dbgVecLast || _dbgNow - _S._dbgVecLast > 10000) {
            _S._dbgVecLast = _dbgNow;
            try {
                if (train.lastCarRotation && train.lastCarRotation.length > 0) {
                    var _rv = train.lastCarRotation[Math.floor(train.lastCarRotation.length/2)];
                    if (_rv) {
                        var _vx = (typeof _rv.x === 'number') ? _rv.x : (typeof _rv.x === 'function' ? _rv.x() : '?');
                        var _vy = (typeof _rv.y === 'number') ? _rv.y : (typeof _rv.y === 'function' ? _rv.y() : '?');
                        var _vz = (typeof _rv.z === 'number') ? _rv.z : (typeof _rv.z === 'function' ? _rv.z() : '?');
                        print("[VEH-DBG] Vector3f raw: x=" + _vx + " y=" + _vy + " z=" + _vz + " (x,y,z in radians)");
                    }
                }
            } catch(_ee) {}
        }
        // 一次性枚举 train 对象, 找出 yaw/rotation 相关属性
        if (!_S._dbgEnum) {
            _S._dbgEnum = true;
            try {
                var _cls = train.getClass();
                print("[VEH-DBG] train class=" + _cls.getName());
                // 枚举 field
                var _flds = _cls.getDeclaredFields();
                var _fnames = [];
                for (var _i = 0; _i < _flds.length; _i++) {
                    var _n = _flds[_i].getName().toLowerCase();
                    if (_n.indexOf("yaw") >= 0 || _n.indexOf("rot") >= 0 || _n.indexOf("head") >= 0 || _n.indexOf("dir") >= 0 || _n.indexOf("angle") >= 0) {
                        _fnames.push(_flds[_i].getName() + "(" + _flds[_i].getType().getSimpleName() + ")");
                    }
                }
                print("[VEH-DBG] fields(yaw/rot/head/dir/angle): " + (_fnames.length ? _fnames.join(", ") : "(none)"));
                // 枚举 method
                var _mths = _cls.getMethods();
                var _mnames = [];
                for (var _j = 0; _j < _mths.length; _j++) {
                    var _mn = _mths[_j].getName().toLowerCase();
                    if ((_mn.indexOf("yaw") >= 0 || _mn.indexOf("rot") >= 0 || _mn.indexOf("head") >= 0) && _mths[_j].getParameterCount() === 0) {
                        _mnames.push(_mths[_j].getName() + "():" + _mths[_j].getReturnType().getSimpleName());
                    }
                }
                print("[VEH-DBG] no-arg methods(yaw/rot/head): " + (_mnames.length ? _mnames.join(", ") : "(none)"));
            } catch(_ex) { print("[VEH-DBG] enum err: " + _ex); }
        }
    }
    }

    // ===== 4. 自动转向检测: yaw 单帧即时触发 + yawAccum 零值即时退出 =====
    // 触发: |_yd| > 0.05° 立即进入转向态
    // 退出: 转向态下 yawAccum=0 (yaw 停止变化) 立即转回 normal, 不等待超时
    if (!_cfgForce && _sp > 0.005) {
        var _yaw = _getTrainYaw(train);
        if (_yaw != null) {
            if (!_S.hasLastYaw) {
                _S.lastYaw = _yaw;
                _S.hasLastYaw = true;
                _S.yawAccum = 0;
            } else {
                var _yd = _yawDelta(_yaw, _S.lastYaw);
                _S.lastYaw = _yaw;

                if (_S.state === "left" || _S.state === "right") {
                    // 转向态: 持续同方向 yaw → 刷新累计
                    // 注意: 不再重置 turnFrame, 保持其为纯状态持续时间计数器, 驱动 turnPhase 每2秒交替
                    if (_yd !== 0 && ((_S.yawAccum > 0 && _yd > 0) || (_S.yawAccum < 0 && _yd < 0))) {
                        _S.yawAccum += _yd;
                    } else if (_yd === 0 || ((_S.yawAccum > 0 && _yd < 0) || (_S.yawAccum < 0 && _yd > 0))) {
                        // yaw 停了 or 方向反转 → 累计归零 → 立即退出转向态
                        _S.yawAccum = 0;
                        _S.state = "normal";
                        _S.turnFrame = 0;
                    }
                } else {
                    // normal 态: 累计同方向 yaw 变化, 反向/超 300ms → 重置
                    if (_yd !== 0 && ((_S.yawAccum > 0 && _yd > 0) || (_S.yawAccum < 0 && _yd < 0) || _S.yawAccum === 0)) {
                        _S.yawAccum += _yd;
                    } else {
                        _S.yawAccum = _yd;   // 方向反转 → 从当前 delta 重新开始累计
                    }

                    if (Math.abs(_yd) > 0.05) {
                        _S.state = (_yd < 0) ? "right" : "left";
                        _S.turnSide = _S.state;
                        _S.turnFrame = 0;
                        _S.yawAccum = _yd;   // 进入转向态时从本次 delta 开始累计
                    }
                }
            }
        }
    }

    // CONFIG 强制最终覆盖
    if (_cfgForce && _cfgForceState) {
        _S.state = _cfgForceState;
    }

    // ===== 5. 状态帧计数 (自动超时回到 normal) =====
    if (_S.state === "brake") {
        _S.brakeFrame++;
        if (_S.brakeFrame > 100) { _S.state = "normal"; _S.brakeFrame = 0; }   // 10秒兜底超时
    } else {
        _S.brakeFrame = 0;
    }

    if (_S.state === "left" || _S.state === "right") {
        _S.turnFrame++;
        if (_S.turnFrame >= 80) {   // 8秒超时 (10fps: 80帧=8秒)
            _S.state = "normal";
            _S.turnFrame = 0;
        }
    } else {
        _S.turnFrame = 0;
    }

    return {
        state: _S.state,
        brakeBlink: (_S.brakeFrame % 20) < 10,   // 1秒亮 1秒灭 闪烁 (10fps: 10帧亮/10帧灭, RateLimit=0.1s)
        turnPhase: (_S.turnFrame / 10) % 2 < 1 ? 0 : 1,   // 2秒切换一次 (10fps: 10帧=1秒, 20帧=2秒)
        turnSide: _S.turnSide
    };
}

// ============ 雪花绘制 (引用固牌 DrawSnowflake 算法) ============
// 来源: out/gupai/bus-signs/formatting.js → DrawSnowflake(g, cx, cy, size)
// 6 根主臂 + 每臂 2 处分叉树枝 + 中心小圆点
// 参数: g=Graphics, cx=中心x, cy=中心y, size=雪花外接正方形边长, color=Color (可选)
function drawSnowflake(g, cx, cy, size, color) {
    if (color) g.setColor(color);
    var armLen = size / 2;
    var armThick = Math.max(3, size * 0.04);
    var branchThick = Math.max(2, size * 0.025);
    g.setStroke(new BasicStroke(armThick, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
    for (var i = 0; i < 6; i++) {
        var angle = Math.PI / 3 * i - Math.PI / 2;
        var ex = Math.round(cx + armLen * Math.cos(angle)) | 0;
        var ey = Math.round(cy + armLen * Math.sin(angle)) | 0;
        g.drawLine(cx | 0, cy | 0, ex, ey);
        for (var b = 1; b <= 2; b++) {
            var t = b / 3;
            var bx = cx + armLen * t * Math.cos(angle);
            var by = cy + armLen * t * Math.sin(angle);
            for (var s = -1; s <= 1; s += 2) {
                var branchAngle = angle + s * Math.PI / 3;
                var bLen = armLen * 0.28;
                var bex = Math.round(bx + bLen * Math.cos(branchAngle)) | 0;
                var bey = Math.round(by + bLen * Math.sin(branchAngle)) | 0;
                g.setStroke(new BasicStroke(branchThick, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                g.drawLine(Math.round(bx) | 0, Math.round(by) | 0, bex, bey);
            }
            if (b == 2) g.setStroke(new BasicStroke(armThick, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        }
    }
    var dotR = Math.max(2, size * 0.04);
    g.fillOval((cx - dotR) | 0, (cy - dotR) | 0, (dotR * 2) | 0, (dotR * 2) | 0);
}

if (_MTR_LOG) print("[MTR] dianxian_util v2: 车辆状态 + 雪花绘制")
