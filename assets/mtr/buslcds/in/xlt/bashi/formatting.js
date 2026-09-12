// MTR模组公交车内线路图 v2.0
importPackage(java.awt);
importPackage(java.awt.geom);
importPackage(javax.imageio);
importPackage(java.io);

var WIDTH1 = 2000, HEIGHT1 = 400;

/* 字体 */
function safeGetFont(pathStr, systemName, fallbackName, fallbackSize) {
    try { var f = Resources.readFont(Resources.id(pathStr)); if (f != null) return f; } catch (e) {}
    try { var f2 = Resources.getSystemFont(systemName); if (f2 != null) return f2; } catch (e) {}
    return new Font(fallbackName, Font.PLAIN, fallbackSize);
}
var SERIF = safeGetFont("mtr:buslcds/font/xltcn.ttf", "Noto Serif", "Serif", 200);
var COMPANY_FONT = safeGetFont("mtr:buslcds/font/company.ttf", "Microsoft YaHei", "SansSerif", 200);

/* ===== sub → 公司信息映射 =====
 * 优先级:
 *   1. dispatcher.js 传入的全局 COMPANY_LOGO / COMPANY_NAME (CONFIG.company)
 *   2. CONFIG.in_xlt.sub (车型入口直接配 sub)
 *   3. 默认值 (巴士二公司 bashi.png)
 */
var _BSL_SUB_MAP = {
    "js": { name: "金山巴士",   logo: "mtr:buslcds/image/kl/logo/jsbs.png", hotline: "57941773" },
    "fx": { name: "奉贤巴士公交", logo: "mtr:buslcds/image/kl/logo/fxbs.png", hotline: "57513065" },
    "bs": { name: "巴士集团",   logo: "mtr:buslcds/image/kl/logo/bashi.png", hotline: "50828400" }
};

var _BSL_COMPANY_NAME = "巴士二公司";
var _BSL_LOGO_PATH = "mtr:buslcds/image/kl/logo/bashi.png";
var _BSL_HOTLINE = "64925849";  // 默认 (巴士二公司)

// --- 解析 sub ---
var _BSL_SUB = null;
try { if (typeof CONFIG !== "undefined" && CONFIG && CONFIG.in_xlt && CONFIG.in_xlt.sub) { _BSL_SUB = String(CONFIG.in_xlt.sub); } } catch (_e) {}
if (_BSL_SUB && _BSL_SUB_MAP[_BSL_SUB]) {
    _BSL_COMPANY_NAME = _BSL_SUB_MAP[_BSL_SUB].name;
    _BSL_LOGO_PATH = _BSL_SUB_MAP[_BSL_SUB].logo;
    if (_BSL_SUB_MAP[_BSL_SUB].hotline) _BSL_HOTLINE = _BSL_SUB_MAP[_BSL_SUB].hotline;
    print("[BSL] sub=" + _BSL_SUB + " → " + _BSL_COMPANY_NAME + " / " + _BSL_LOGO_PATH + " / hotline=" + _BSL_HOTLINE);
}
// --- dispatcher.js 顶层 company 覆盖 (最高优先级) ---
try {
    if (typeof COMPANY_LOGO !== "undefined" && COMPANY_LOGO && COMPANY_LOGO.length > 0) {
        _BSL_LOGO_PATH = String(COMPANY_LOGO);
    }
    if (typeof COMPANY_NAME !== "undefined" && COMPANY_NAME && COMPANY_NAME.length > 0) {
        _BSL_COMPANY_NAME = String(COMPANY_NAME);
    }
} catch (_e2) {}

/* Logo 图片缓存 (路径由 _BSL_LOGO_PATH 决定) */
var _bashiLogoCache = null;
function loadPudongLogo() {
    if (_bashiLogoCache != null) return _bashiLogoCache;
    try {
        _bashiLogoCache = Resources.readBufferedImage(Resources.id(_BSL_LOGO_PATH));
        if (_bashiLogoCache != null) {
            print("[BSL] logo readBufferedImage OK " + _bashiLogoCache.getWidth() + "x" + _bashiLogoCache.getHeight() + " path=" + _BSL_LOGO_PATH);
        }
    } catch (e) { print("[BSL] logo readBufferedImage err: " + e); }
    if (_bashiLogoCache == null) {
        try {
            var is = Resources.readStream(Resources.id(_BSL_LOGO_PATH));
            if (is != null) {
                _bashiLogoCache = ImageIO.read(is);
                print("[BSL] logo readStream+ImageIO OK " + _bashiLogoCache.getWidth() + "x" + _bashiLogoCache.getHeight());
            }
        } catch (e2) { print("[BSL] logo readStream err: " + e2); }
    }
    if (_bashiLogoCache == null) {
        // 最后兜底: 默认 bashi.png
        try {
            _bashiLogoCache = Resources.readBufferedImage(Resources.id("mtr:buslcds/image/kl/logo/bashi.png"));
            print("[BSL] logo fallback default bashi.png OK");
        } catch (e3) { print("[BSL] logo fallback default bashi.png also fail: " + e3); }
    }
    return _bashiLogoCache;
}

/* 颜色 (巴士二公司 绿色系) */
var WHITE = Color.decode("#f0f0f0"), DARK_GREY = Color.decode("#404040"), BLACK = Color.decode("#202020");
/* 顶栏 / 底栏 */
var MAP_TOP_BG = Color.decode("#FFFFFF");
var MAP_BOTTOM_BG = Color.decode("#006644");
/* 线路图主区 */
var MAP_LINE_GREEN = Color.decode("#00AA55");
var MAP_LINE_BLUE = Color.decode("#00AA55");
var MAP_STATION_BLACK = Color.decode("#1A1A1A");
var MAP_WHITE = Color.decode("#FFFFFF");
/* 站点圆点 */
var MAP_DOT_GREEN = Color.decode("#00AA55");
var MAP_DOT_UP = Color.decode("#E60012");
var MAP_DOT_DN = Color.decode("#1E90FF");
var MAP_DOT_BLUE = Color.decode("#00AA55");
/* 单向站颜色 */
var MAP_UP_ONLY_RED = Color.decode("#E60012");
var MAP_DN_ONLY_BLUE = Color.decode("#1E90FF");
var MAP_DN_ONLY_GREEN = Color.decode("#00AA55");
/* 兼容旧版左右分栏变量 */
var MAP_LEFT_BG = Color.decode("#FFFFFF");
var MAP_LEFT_WHITE = Color.decode("#006644");
var MAP_RIGHT_BG = Color.decode("#F5F5F5");

/* 顶部栏/底部栏高度 */
var MAP_TOPBAR_H = 60;
var MAP_BOTTOMBAR_H = 60;
var MAP_LINEAREA_TOP = MAP_TOPBAR_H;       // 60
var MAP_LINEAREA_BOTTOM = 400 - MAP_BOTTOMBAR_H;  // 340

/* 运营商配置 (由 _BSL_COMPANY_NAME 解析结果决定) */
var MAP_OPERATOR_NAME = _BSL_COMPANY_NAME;
var MAP_DEFAULT_FIRST_LAST_UP = "06:00-22:00";
var MAP_DEFAULT_FIRST_LAST_DN = "06:00-22:00";

/* ======= PlatformInfo 安全访问辅助函数 ======= */
function platName(plat) {
    if (plat == null) return "";
    try { var s = plat.station; if (s != null) { var n = s.name; if (n != null) return String(n).trim(); } } catch (e) {}
    try { var n2 = plat.getName(); if (n2 != null) return String(n2).trim(); } catch (e) {}
    try { var n3 = String(plat); if (n3 != null && n3.length > 0 && n3.indexOf('@') < 0) return n3.trim(); } catch (e) {}
    return "";
}
function listSize(list) {
    if (list == null) return 0;
    try { return list.size(); } catch (e) {}
    try { return list.length; } catch (e) {}
    return 0;
}

/* 路线属性解析 */
function parseRouteAttributes(routeName) {
    var attrs = {};
    if (routeName == null) return attrs;
    var name = String(routeName).trim();
    var idx = name.indexOf("||");
    if (idx < 0) return attrs;
    // ★ MTR 用 || 分隔属性段, 不是逗号!
    var attrPart = name.substring(idx + 2);
    var segments = attrPart.split("||");
    for (var i = 0; i < segments.length; i++) {
        var p = segments[i].trim();
        if (p.length == 0) continue;
        if (p.charAt(0) == "#") p = p.substring(1);
        // 支持 : 和 = 两种分隔符 (MTR 两种都出现过)
        var sepIdx = p.indexOf(":");
        if (sepIdx < 0) sepIdx = p.indexOf("=");
        if (sepIdx > 0) {
            var key = p.substring(0, sepIdx).trim();
            var val = p.substring(sepIdx + 1).trim();
            attrs[key] = val;
        }
        // 没有 key:value 格式的段 (如运营商名"奉贤巴士") 跳过
    }
    return attrs;
}
function cleanRouteName(routeName) {
    if (routeName == null) return "";
    var idx = routeName.indexOf("||");
    if (idx >= 0) return routeName.substring(0, idx).trim();
    return routeName.trim();
}
/* 车内线路图专用：完整线路名，不作任何过滤 */
function getRouteName(routePlats) {
    if (routePlats == null || listSize(routePlats) == 0) return "";
    try {
        var firstPlat = routePlats.get(0);
        if (firstPlat != null && firstPlat.route != null && firstPlat.route.name != null) {
            return cleanRouteName(firstPlat.route.name);
        }
    } catch (e) {}
    return "";
}
var NUM_TO_CN = ["零","壹","贰","叁","肆","伍","陆","柒","捌","玖"];
function numToCn(n) { n = Math.round(n); if (n >= 0 && n <= 9) return NUM_TO_CN[n]; return String(n); }
function parseFare(fareStr) {
    var result = { type: "multi", label: "本线 空调多级售票" };
    if (fareStr == null || fareStr.length == 0) return result;
    var s = String(fareStr).trim();
    if (s.indexOf("-") >= 0 || s.indexOf("~") >= 0) return result;
    var n = parseInt(s, 10);
    if (!isNaN(n) && n >= 0 && n <= 9) { result.type = "single"; result.label = "本线 空调单一票价 " + numToCn(n) + "元"; return result; }
    return result;
}
function parseDirection(attrs) {
    if (attrs && attrs["direction"]) {
        var d = String(attrs["direction"]).toLowerCase();
        if (d == "dn" || d == "down" || d == "下行") return "dn";
    }
    return "up";
}

/* 起终点站获取（Java List API） */
function getFixedTerminals(train, direction) {
    var result = { start: "", end: "" };
    try {
        var allPlats = train.getAllPlatforms();
        var sz = listSize(allPlats);
        if (sz == 0) return result;
        var firstName = platName(allPlats.get(0));
        var lastName = platName(allPlats.get(sz - 1));
        if (direction == "dn") {
            result.start = lastName;
            result.end = firstName;
        } else {
            result.start = firstName;
            result.end = lastName;
        }
        print("[BlueLCD] terminals start='" + result.start + "' end='" + result.end + "'");
    } catch (e) { print("[BlueLCD] getFixedTerminals err: " + e); }
    return result;
}

/* CJK 判定 */
function isCjkChar(code) {
    return (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) || (code >= 0x20000 && code <= 0x2A6DF) || (code >= 0xF900 && code <= 0xFAFF) || (code >= 0x3040 && code <= 0x30FF) || (code >= 0xAC00 && code <= 0xD7AF);
}
function extractCjk(text) {
    if (text == null) return "";
    text = String(text).trim();
    if (text.length == 0) return "";
    var result = [];
    for (var j = 0; j < text.length; j++) { if (isCjkChar(text.charCodeAt(j))) result.push(text.charAt(j)); }
    var out = result.join("").trim();
    return out.length > 0 ? out : text;
}

/* 文字排版工具 */
function CentreText(g, text, x, y, xLimit) {
    var widthNow = g.getFontMetrics().stringWidth(text);
    var needScale = (xLimit > 0 && widthNow > xLimit);
    if (needScale) { var transform0 = g.getTransform(); var scaleFactor = xLimit / widthNow; g.scale(scaleFactor, 1); x = x / scaleFactor; }
    var widthNew = g.getFontMetrics().stringWidth(text);
    g.drawString(text, x - widthNew / 2, y);
    if (needScale) { g.setTransform(transform0); }
}
function LeftText(g, text, x, y, xLimit) {
    if (xLimit > 0) { var widthNow = g.getFontMetrics().stringWidth(text); if (widthNow > xLimit) { var transform0 = g.getTransform(); var sf = xLimit / widthNow; g.scale(sf, 1); x = x / sf; g.drawString(text, x, y); g.setTransform(transform0); return; } }
    g.drawString(text, x, y);
}
function RightText(g, text, x, y, xLimit) {
    var widthNow = g.getFontMetrics().stringWidth(text);
    if (xLimit > 0 && widthNow > xLimit) { var transform0 = g.getTransform(); var sf = xLimit / widthNow; g.scale(sf, 1); x = x / sf; var widthNew = g.getFontMetrics().stringWidth(text); g.drawString(text, x - widthNew, y); g.setTransform(transform0); return; }
    g.drawString(text, x - widthNow, y);
}
