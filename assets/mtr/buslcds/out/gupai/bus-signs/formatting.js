// MTR模组三块路牌共享排版工具 v2.1
// 2026年-当前 仙芳佳全域通达铁路、乐文彩雨 版权所有
// 使用时请遵守MIT开源协议

// 导入Java资源
importPackage(java.awt);
importPackage(java.awt.geom);
importPackage(java.util);

// 导入Minecraft客户端资源用于获取游戏时间
try {
    importPackage(net.minecraft.client);
    importPackage(net.minecraft.world);
} catch (e) {}

/*【 字 体 加 载 （三 重 兜 底）】*/
function safeGetFont(pathStr, systemName, fallbackName, fallbackSize) {
    try {
        var f = Resources.readFont(Resources.id(pathStr));
        if (f != null) return f;
    } catch (e) {}
    try {
        var f2 = Resources.getSystemFont(systemName);
        if (f2 != null) return f2;
    } catch (e) {}
    return new Font(fallbackName, Font.PLAIN, fallbackSize);
}

var CN_FONT = safeGetFont("mtr:buslcds/font/gupai/cn.ttf", "Noto Serif", "Serif", 200);
var EN_FONT = safeGetFont("mtr:buslcds/font/gupai/en.ttf", "Noto Sans", "SansSerif", 200);

/*【 颜 色 常 量 】*/
// 注意：Color.decode("#RRGGBB") 返回的是 Color，内部 RGB 是 int，直接 new Color(r, g, b) 没问题
var DAY_COLOR = Color.decode("#00C800");
var NIGHT_COLOR = Color.decode("#FF4500");
var BG_COLOR = Color.decode("#0A0A0A");

/*【 安 全 建 造 Color —— 避 免 Rhino 类 型 歧 义 】*/
// 不用 new Color(r, g, b) —— Rhino 会把 double 匹配到 Color(double,double,double)
// 改用单 int 构造函数 Color(int) —— 把 RGB 打包成 0xAARRGGBB 一个整数，绝无歧义
function toByte(v) {
    var c = Math.max(0, Math.min(255, Math.round(v)));
    return c | 0;   // JS 位运算 → 32 位 int
}

function safeColor(r, g, b) {
    var ri = toByte(r);
    var gi = toByte(g);
    var bi = toByte(b);
    // 打包成 0xAARRGGBB，alpha 填 FF（不透明）
    var rgb = (0xFF << 24) | (ri << 16) | (gi << 8) | bi;
    return new Color(rgb | 0, true);  // Color(int rgb, boolean hasAlpha) — 单参数 RGB
}

/*【 游 戏 时 间 获 取 —— NTE 官 方 API 】*/
// MinecraftClientUtil 是 NTE 暴露给 JS 的工具类
// 内部实现：Minecraft.getInstance().level.getDayTime()
function getGameTime() {
    try {
        var time = MinecraftClientUtil.worldDayTime();
        if (time != null && time >= 0) {
            return time % 24000;
        }
    } catch (e) {}

    // 兜底：白天
    return 6000;
}

/*【 昼 夜 渐 变 颜 色 】*/
function getDayNightColor() {
    var time = getGameTime();
    var ratio = 0;

    if (time >= 14000 && time < 22000) {
        ratio = 1;
    } else if (time >= 12000 && time < 14000) {
        ratio = (time - 12000) / 2000;
    } else if (time >= 22000) {
        ratio = 1 - (time - 22000) / 4000;
        ratio = Math.max(0, ratio);
    } else if (time < 2000) {
        ratio = 0.5 - (time / 2000) * 0.5;
        ratio = Math.max(0, ratio);
    }

    var r = DAY_COLOR.getRed()   + (NIGHT_COLOR.getRed()   - DAY_COLOR.getRed())   * ratio;
    var g = DAY_COLOR.getGreen() + (NIGHT_COLOR.getGreen() - DAY_COLOR.getGreen()) * ratio;
    var b = DAY_COLOR.getBlue()  + (NIGHT_COLOR.getBlue()  - DAY_COLOR.getBlue())  * ratio;

    return safeColor(r, g, b);
}

/* ======== GUPAI 诊断日志 ======== */
var GUPAI_LOG = false;
function GLOG(msg) {
    if (GUPAI_LOG) { try { java.lang.System.out.println("[GUPAI] " + msg); } catch (e) {} }
}
function gupai_platName(plat) {
    if (plat == null) return "";
    try { var s = plat.station; if (s != null && s.name != null) return String(s.name).trim(); } catch (e) {}
    try { var n2 = plat.getName(); if (n2 != null) return String(n2).trim(); } catch (e) {}
    return "";
}

/*【 线 路 名 称 获 取 —— 官 方 API 版 】*/
// 根据 NTE 官方文档 (docs/js-train.md)：
//   platformInfo.route.name  ← 路线名称（MTR Dashboard 里显示的那个）
// 但 Rhino 访问 Java 对象属性可能需要：
//   - route.name           （Rhino 自动 bean 映射 → getName()）
//   - route.getName()      （显式 getter 方法）
function getRouteName(routePlats) {
    GLOG("========== getRouteName START ==========");
    if (routePlats == null || routePlats.size() == 0) { GLOG("  routePlats null/empty → return ''"); return ""; }
    try {
        var plat = routePlats.get(0);
        if (plat == null) { GLOG("  plat null → return ''"); return ""; }

        GLOG("  routePlats.size() = " + routePlats.size());
        GLOG("  plat.station.name = " + gupai_platName(plat));

        var routeObj = null;
        try { routeObj = plat.route; } catch (e) {}
        if (routeObj == null) { GLOG("  plat.route null → return ''"); return ""; }

        GLOG("  routeObj.class = " + (routeObj != null ? routeObj.getClass() : "null"));

        var raw = null;

        // 方式 1：直接字段访问（Rhino 会自动映射 Java bean 属性）
        try {
            var v1 = routeObj.name;
            if (v1 != null && String(v1).trim().length > 0) raw = String(v1).trim();
        } catch (e) {}

        // 方式 2：显式 getter 方法
        if (raw == null) {
            try {
                var v2 = routeObj.getName();
                if (v2 != null && String(v2).trim().length > 0) raw = String(v2).trim();
            } catch (e) {}
        }

        // 方式 3：遍历所有可能的属性名（带 getter 兜底）
        if (raw == null) {
            var candidates = [
                ["name", "getName"],
                ["routeName", "getRouteName"],
                ["displayName", "getDisplayName"],
                ["lineName", "getLineName"],
                ["lightRailRouteNumber", null],
                ["number", "getNumber"],
                ["routeNumber", "getRouteNumber"]
            ];
            for (var i = 0; i < candidates.length && raw == null; i++) {
                var pair = candidates[i];
                // 先试 getter
                if (pair[1] != null) {
                    try {
                        var getter = routeObj[pair[1]];
                        if (typeof getter == "function") {
                            var v = getter.call(routeObj);
                            if (v != null && String(v).trim().length > 0) {
                                raw = String(v).trim();
                                break;
                            }
                        }
                    } catch (e) {}
                }
                // 再试字段
                if (raw == null) {
                    try {
                        var fv = routeObj[pair[0]];
                        if (fv != null && String(fv).trim().length > 0) {
                            raw = String(fv).trim();
                            break;
                        }
                    } catch (e) {}
                }
            }
        }

        if (raw == null || raw.length == 0) { GLOG("  raw still null → return ''"); return ""; }

        GLOG("  raw route.name = '" + raw + "'");

        // 清理方向标记（||#direction=up/dn 等）
        var cleaned = cleanRouteName(raw);
        GLOG("  cleaned (after cleanRouteName) = '" + cleaned + "'");
        // 过滤路线号（去掉多余的"路/线"后缀等）
        var filtered = filterRouteNumber(cleaned);
        GLOG("  filtered (after filterRouteNumber) = '" + filtered + "'");
        // 如果过滤后为空，直接用清理后的原始名
        if (filtered == null || filtered.length == 0) filtered = cleaned;
        GLOG("  FINAL routeNum = '" + (filtered != null ? filtered : "") + "'");
        GLOG("========== getRouteName END ==========");
        return (filtered != null ? filtered : "");
    } catch (e) {
        return "";
    }
}

/*【 线 路 名 过 滤 —— 增 强 版 】*/
// 规则：
//   纯数字开头（如 986路区间）：先去运营类型后缀，再去"路/线"
//     986路区间   → 986区间    （去"路"，保留"区间"）
//     941路跨线定班 → 941      （先去"跨线定班"，再去"路"）
//     224路大站车  → 224       （先去"大站车"，再去"路"）
//     952路B线    → 952B      （去"路"，去"线"）
//   非纯数字开头（如 松江10路区间）：保持原样
function filterRouteNumber(rawName) {
    if (rawName == null || rawName.length == 0) return "";
    var name = rawName.trim();
    var match = name.match(/^(\d+)(.*)/);
    if (match) {
        var num = match[1];
        var rest = match[2];

        // 【先】去运营类型后缀（含"跨线"这种带"线"的）
        // 用单条正则一次性匹配，长词在前优先
        rest = rest.replace(
            /大站快车|大站车|跨线定班|高峰快线|夜班车|跨线|快线|定班|直达|特快|支线|专线|夜班/g,
            ""
        );

        // 【再】去"路"/"线"（全局替换，不是只去末尾）
        rest = rest.replace(/路/g, "");
        rest = rest.replace(/线/g, "");

        return num + rest;
    }
    // 非纯数字开头 → 保持原样
    return name;
}

/*【 路 线 名 清 理 】*/
function cleanRouteName(routeName) {
    if (routeName == null) return "";
    var idx = routeName.indexOf("||");
    if (idx >= 0) return routeName.substring(0, idx).trim();
    return routeName.trim();
}

/*【 C J K 字 符 判 定 】*/
function isCjkChar(code) {
    return (
        (code >= 0x4E00 && code <= 0x9FFF) ||    // CJK Unified
        (code >= 0x3400 && code <= 0x4DBF) ||    // CJK Ext A
        (code >= 0x20000 && code <= 0x2A6DF) ||  // CJK Ext B
        (code >= 0x2A700 && code <= 0x2B73F) ||  // CJK Ext C
        (code >= 0x2B740 && code <= 0x2B81F) ||  // CJK Ext D
        (code >= 0x2B820 && code <= 0x2CEAF) ||  // CJK Ext E
        (code >= 0xF900 && code <= 0xFAFF) ||    // CJK Compatibility
        (code >= 0x3040 && code <= 0x30FF) ||    // 假名
        (code >= 0xAC00 && code <= 0xD7AF)       // 谚文
    );
}

/*【 纯 中 文 提 取 （增 强 版）】*/
// MTR 站名常见格式："软件园 Runjuan" / "软件园|Runjuan" / "软件园(Runjuan)" / "软件园/Runjuan"
// 先用分隔符切分法取第一个 CJK 段，失败再逐字符过滤
function extractCjk(text) {
    if (text == null) return "";
    text = String(text).trim();
    if (text.length == 0) return "";

    // 先尝试用常见分隔符切分，取第一个 CJK 段
    var parts = text.split(/[\s|\|\/\(\)（）\[\]【】\-]+/);
    for (var i = 0; i < parts.length; i++) {
        var seg = parts[i].trim();
        if (seg.length > 0 && isCjkChar(seg.charCodeAt(0))) {
            // 这个段以 CJK 开头，再检查是否全是 CJK 或以 CJK 结尾
            // （如 "浦东53" 也是合法的中文站名/路线名）
            return seg;
        }
    }

    // 兜底：逐字符只保留 CJK
    var result = [];
    for (var j = 0; j < text.length; j++) {
        if (isCjkChar(text.charCodeAt(j))) {
            result.push(text.charAt(j));
        }
    }
    var out = result.join("").trim();
    return out.length > 0 ? out : text;
}

/*【 中 英 混 排 分 段 】*/
// 把 "浦东53路" 切成 ["浦东" (CJK), "53" (数字), "路" (CJK)]
// 把 "952B" 切成 ["952B" (非CJK)]
function splitByScript(text) {
    var segments = [];
    if (text == null || text.length == 0) return segments;

    var curText = "";
    var curIsCjk = isCjkChar(text.charCodeAt(0));

    for (var i = 0; i < text.length; i++) {
        var isCjk = isCjkChar(text.charCodeAt(i));
        if (isCjk !== curIsCjk) {
            segments.push({ text: curText, isCjk: curIsCjk });
            curText = "";
            curIsCjk = isCjk;
        }
        curText += text.charAt(i);
    }
    if (curText.length > 0) {
        segments.push({ text: curText, isCjk: curIsCjk });
    }
    return segments;
}

/*【 中 英 混 排 宽 度 测 量 】*/
// DrawMixedText 的宽度计算版本，用于布局前总宽度
function MeasureMixedTextWidth(g, text, baseFont) {
    var segments = splitByScript(text);
    var totalWidth = 0;
    var style = baseFont != null ? baseFont.getStyle() : Font.PLAIN;
    var size = baseFont != null ? baseFont.getSize() : 200;
    for (var i = 0; i < segments.length; i++) {
        var f = segments[i].isCjk ? CN_FONT : EN_FONT;
        g.setFont(f.deriveFont(style, size));
        totalWidth += g.getFontMetrics().stringWidth(segments[i].text);
    }
    return totalWidth;
}

/*【 中 英 混 排 居 中 绘 制 】*/
// 自动按字符分段切字体，整体水平居中
// g: Graphics2D, text: 原文字, x: 中心X, y: 基线Y, xLimit: 最大宽度
function DrawMixedText(g, text, x, y, xLimit) {
    var segments = splitByScript(text);
    if (segments.length == 0) return;

    // 先计算每段宽度和总宽度
    var sizes = [];
    var totalWidth = 0;
    for (var i = 0; i < segments.length; i++) {
        var f = segments[i].isCjk ? CN_FONT : EN_FONT;
        var curFont = g.getFont();
        // 保持当前字号，只替换字体族
        var newFont = f.deriveFont(curFont.getStyle(), curFont.getSize());
        g.setFont(newFont);
        var w = g.getFontMetrics().stringWidth(segments[i].text);
        sizes.push(w);
        totalWidth += w;
    }

    // 如果超宽，整体缩放
    var needScale = (xLimit > 0 && totalWidth > xLimit);
    var transform0 = null;
    var scaleFactor = 1;
    var drawX = x;

    if (needScale) {
        transform0 = g.getTransform();
        scaleFactor = xLimit / totalWidth;
        g.scale(scaleFactor, 1);
        drawX = x / scaleFactor;
    }

    // 居中起点
    var cursorX = drawX - totalWidth / 2;
    for (var j = 0; j < segments.length; j++) {
        var f2 = segments[j].isCjk ? CN_FONT : EN_FONT;
        var curFont2 = g.getFont();
        var newFont2 = f2.deriveFont(curFont2.getStyle(), curFont2.getSize());
        g.setFont(newFont2);
        g.drawString(segments[j].text, cursorX, y);
        cursorX += sizes[j];
    }

    if (needScale) {
        g.setTransform(transform0);
    }
}

/*【 固 定 起 终 点 站 —— v2.2（永远上行方向）】*/
// 永远返回上行方向的起终点站，不随车辆实际方向翻转！
//
// 上行起点 = getAllPlatforms[0]（物理序列永远上行在前）
// 上行终点 = 
//   - routePlats 是上行方向 → routePlats 末站
//   - routePlats 是下行方向 → getAllPlatforms 掉头点（最后连续相同站）
//   - 兜底 → destinationStation API
//
// 方向判断：routePlats 第一个站 == getAllPlatforms[0] → 上行方向
function getFixedTerminals(train, direction, routePlats, _apSrc) {
    GLOG("========== getFixedTerminals START ==========");
    if (train == null) { GLOG("  train null → return null"); return null; }
    try {
        var allPlats = (_apSrc != null && _apSrc.size && _apSrc.size() > 0) ? _apSrc : train.getAllPlatforms();
        if (allPlats == null || allPlats.size() == 0) { GLOG("  allPlats null/empty → return null"); return null; }

        var names = [];
        for (var i = 0; i < allPlats.size(); i++) {
            var p = allPlats.get(i);
            var n = gupai_platName(p);
            if (n.length > 0) names.push(n);
        }
        if (names.length < 2) { GLOG("  names < 2 → return null"); return null; }
        GLOG("  getAllPlatforms raw (" + names.length + " 站):");
        for (var i = 0; i < names.length; i++) GLOG("    [" + i + "] " + names[i]);

        // ★ 跳过末尾重复的终点站 (MTR 绕路时会把终点站复制一份在末尾)
        var firstUnique = names[0];
        var lastUniqueIdx = names.length - 1;
        while (lastUniqueIdx > 0 && names[lastUniqueIdx] == firstUnique) {
            lastUniqueIdx--;
        }
        var lastUnique = names[lastUniqueIdx];
        GLOG("  unique range: [0]=" + firstUnique + " to [" + lastUniqueIdx + "]=" + lastUnique + " (raw last=" + (names.length-1) + ")");

        var startStation = firstUnique;
        GLOG("  startStation = '" + startStation + "'");

        // 兜底：如果 names 为空，用 platName 从 getAllPlatforms 取
        if (names.length < 2) {
            GLOG("  names too small, direct extract from allPlats");
            var directNames = [];
            for (var di = 0; di < allPlats.size(); di++) {
                var dn = gupai_platName(allPlats.get(di));
                if (dn.length > 0) directNames.push(dn);
            }
            GLOG("  direct names (" + directNames.length + "): " + directNames);
            if (directNames.length >= 2) {
                names = directNames;
                startStation = names[0];
                GLOG("  fallback startStation = '" + startStation + "'");
            }
        }

        // routePlats 原始序列
        GLOG("  routePlats 原始:");
        if (routePlats != null && routePlats.size() > 0) {
            var rsz = routePlats.size();
            for (var rpi = 0; rpi < rsz; rpi++) {
                GLOG("    rp[" + rpi + "] = " + gupai_platName(routePlats.get(rpi)));
            }
        } else {
            GLOG("    routePlats null/empty");
        }

        // 判断 routePlats 是上行还是下行方向
        var isUp = true;
        var rpFirst = "";
        if (routePlats != null && routePlats.size() > 0) {
            rpFirst = gupai_platName(routePlats.get(0));
            if (rpFirst != names[0]) isUp = false;
        }
        GLOG("  rpFirst = '" + rpFirst + "' vs names[0] = '" + names[0] + "' → isUp = " + isUp);

        var endStation = null;
        // ★ 只在 routePlats 足够大且首尾不同时才信任 routePlats.last
        var rpTrustable = (routePlats != null && routePlats.size() >= 3);
        if (rpTrustable) {
            var rpLast = gupai_platName(routePlats.get(routePlats.size() - 1));
            if (rpLast == rpFirst) {
                GLOG("  [警告] routePlats.first==last (both='" + rpFirst + "'), 不信任 routePlats");
                rpTrustable = false;
            }
        }
        if (isUp && rpTrustable) {
            var lastPlat = routePlats.get(routePlats.size() - 1);
            if (lastPlat != null && lastPlat.station != null && lastPlat.station.name != null) {
                endStation = lastPlat.station.name.trim();
                GLOG("  [命中1] 上行+routePlats可信 → endStation = routePlats.last = '" + endStation + "'");
            }
        } else {
            GLOG("  [跳过] isUp=" + isUp + " rpTrustable=" + rpTrustable + " routePlats.size()=" + (routePlats ? routePlats.size() : 0));
        }

        // 兜底：找掉头点（连续相同站）
        if (endStation == null) {
            for (var j = 0; j < names.length - 1; j++) {
                if (names[j] == names[j + 1]) { endStation = names[j]; GLOG("  [命中2] 掉头点 names[" + j + "]=" + names[j]); break; }
            }
        }

        // 再兜底：destinationStation
        if (endStation == null) {
            for (var k = 0; k < allPlats.size(); k++) {
                var p2 = allPlats.get(k);
                if (p2 != null && p2.station != null && p2.destinationStation != null
                    && p2.station.name != null
                    && p2.station.name == p2.destinationStation.name) {
                    endStation = p2.station.name.trim(); GLOG("  [命中3] destinationStation names[" + k + "]=" + endStation); break;
                }
            }
        }

        // ★ 最后兜底：用 names[] 里跳过重复后的真正末站
        if (endStation == null) {
            endStation = lastUnique;
            GLOG("  [命中4] names[]末站 (跳过重复后) = '" + endStation + "'");
        }

        GLOG("  FINAL: start = '" + startStation + "', end = '" + endStation + "'");
        if (startStation != null && endStation != null) {
            GLOG("========== getFixedTerminals END ==========");
            return { start: startStation, end: endStation };
        }
    } catch (e) { GLOG("  EXCEPTION: " + e); }
    GLOG("========== getFixedTerminals END (null) ==========");
    return null;
}
/*【 中 心 排 版 】*/
function CentreText(g, text, x, y, xLimit) {
    var widthNow = g.getFontMetrics().stringWidth(text);
    var needScale = (xLimit > 0 && widthNow > xLimit);

    if (needScale) {
        var transform0 = g.getTransform();
        var scaleFactor = xLimit / widthNow;
        g.scale(scaleFactor, 1);
        x = x / scaleFactor;
    }

    var widthNew = g.getFontMetrics().stringWidth(text);
    g.drawString(text, x - widthNew / 2, y);

    if (needScale) g.setTransform(transform0);
}

/*【 雪 花 绘 制 —— 精 细 六 角 版 】*/
// 6 根主臂 + 每根臂 2 处分叉 + 中心小圆
function DrawSnowflake(g, cx, cy, size) {
    var armLen = size / 2;
    var armThick = Math.max(3, size * 0.04);       // 主臂线宽（更细）
    var branchThick = Math.max(2, size * 0.025);   // 分叉线宽（更细）

    g.setStroke(new BasicStroke(armThick, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));

    // 6 根主臂
    for (var i = 0; i < 6; i++) {
        var angle = Math.PI / 3 * i - Math.PI / 2;
        var ex = Math.round(cx + armLen * Math.cos(angle)) | 0;
        var ey = Math.round(cy + armLen * Math.sin(angle)) | 0;
        g.drawLine(cx | 0, cy | 0, ex, ey);

        // 在主臂上画 2 处分叉（树枝状）
        for (var b = 1; b <= 2; b++) {
            var t = b / 3;   // 分叉位置：1/3 和 2/3 处
            var bx = cx + armLen * t * Math.cos(angle);
            var by = cy + armLen * t * Math.sin(angle);

            // 分叉向左右两侧，角度 ±60°
            for (var s = -1; s <= 1; s += 2) {
                var branchAngle = angle + s * Math.PI / 3;
                var bLen = armLen * 0.28;  // 分叉长度约为主臂 28%
                var bex = Math.round(bx + bLen * Math.cos(branchAngle)) | 0;
                var bey = Math.round(by + bLen * Math.sin(branchAngle)) | 0;
                g.setStroke(new BasicStroke(branchThick, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                g.drawLine(Math.round(bx) | 0, Math.round(by) | 0, bex, bey);
            }
            // 画完分叉后恢复主臂线宽，继续画下一根主臂
            if (b == 2) g.setStroke(new BasicStroke(armThick, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        }
    }

    // 中心小圆点
    var dotR = Math.max(2, size * 0.04);
    g.fillOval((cx - dotR) | 0, (cy - dotR) | 0, (dotR * 2) | 0, (dotR * 2) | 0);
}

/*【 双 向 箭 头 绘 制 —— 双 横 线 · 上 右 下 左 】*/
// 上横线：右端三角箭头 → ，左端无箭头
// 下横线：左端三角箭头 ← ，右端无箭头
// 两条线端点对齐、等长、水平平行
function DrawBidirectionalArrow(g, x1, x2, cy, thickness) {
    var headSize = thickness * 3;
    var offsetY = headSize * 0.5;

    var topY = cy - offsetY;
    var botY = cy + offsetY;

    var leftX = (x1 + headSize) | 0;
    var rightX = (x2 - headSize) | 0;

    g.setStroke(new BasicStroke(thickness, BasicStroke.CAP_ROUND, BasicStroke.JOIN_MITER));

    // 上横线
    g.drawLine(leftX, topY | 0, rightX, topY | 0);
    // 下横线
    g.drawLine(leftX, botY | 0, rightX, botY | 0);

    // 上横线右箭头 → （在 topY 水平线上）
    var topRightArrow = new Polygon();
    topRightArrow.addPoint(x2 | 0, topY | 0);
    topRightArrow.addPoint(rightX, (topY - headSize * 0.7) | 0);
    topRightArrow.addPoint(rightX, (topY + headSize * 0.7) | 0);
    g.fillPolygon(topRightArrow);

    // 下横线左箭头 ← （在 botY 水平线上）
    var botLeftArrow = new Polygon();
    botLeftArrow.addPoint(x1 | 0, botY | 0);
    botLeftArrow.addPoint(leftX, (botY - headSize * 0.7) | 0);
    botLeftArrow.addPoint(leftX, (botY + headSize * 0.7) | 0);
    g.fillPolygon(botLeftArrow);
}

