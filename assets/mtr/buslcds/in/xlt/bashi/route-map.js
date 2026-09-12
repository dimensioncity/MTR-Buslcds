// 公交车内线路图 v3.2 (V9)
// 核心变化: 单向站分块排列 (UP块 → DN块)，不交错
//   双向站作为锚点, 每对相邻双向站之间:
//     [curDir 单向站块] → [otherDir 单向站块]
//   起终点站强制双向
importPackage(java.awt);
importPackage(java.awt.geom);

var MAP_LEFT_W = 340;
var MAP_RIGHT_X = MAP_LEFT_W;
var MAP_RIGHT_W = 2000 - MAP_LEFT_W;
var MAP_DOT_R = 10;

function DrawVerticalText(g, text, topX, topY, maxChars) {
    g.drawString(text.charAt(0), topX, topY);
    for (var i = 1; i < text.length; i++) {
        g.drawString(text.charAt(i), topX, topY + i * g.getFontMetrics().getHeight());
    }
}

var DIAG = false;
var _LOG_CTX = null;
function LOG(msg) {
    try { print("[BSL] " + msg); } catch (e) {}
}

/* ===== 辅助函数 ===== */

function _safeGet(obj, key) {
    try { if (obj != null) return obj[key]; } catch(e) {}
    return null;
}
function _safeCall(obj, method) {
    try { if (obj != null && typeof obj[method] == "function") return obj[method](); } catch(e) {}
    return null;
}

/**
 * 从 Platform 对象提取 station 唯一 ID
 * 尝试 MTR Station 的逻辑 ID, 每个尝试都打日志
 */
var _platIdLogged = false;   // 只在第一个 platform 打详细日志
function platStationId(p) {
    if (p == null) return "null_station";
    var st = p.station;
        if (st != null) {
            var fallback = String(st);   // 总是先算好 fallback
            var details = [];
            var tryId = null;
            var tryMethods = ["getId", "getStationId", "getUid", "getUUID"];
            var tryFields = ["id", "stationId", "uid", "uuid", "identifier", "key"];
            for (var mi = 0; mi < tryMethods.length; mi++) {
                var mname = tryMethods[mi];
                try {
                    if (typeof st[mname] === "function") {
                        var r = st[mname]();
                        if (r != null && String(r).length > 0 && String(r) != "null") {
                            tryId = r;
                            details.push(mname + "()=" + String(r));
                        } else {
                            details.push(mname + "()=null");
                        }
                    } else {
                        details.push(mname + "=NF");
                    }
                } catch(e) { details.push(mname + "()=ERR"); }
            }
            for (var fi = 0; fi < tryFields.length; fi++) {
                var fname = tryFields[fi];
                try {
                    if (st[fname] != null) {
                        details.push(fname + "=" + String(st[fname]));
                        if (tryId == null) tryId = st[fname];
                    }
                } catch(e) {}
            }
            if (!_platIdLogged) {
                _platIdLogged = true;
//                 LOG("  === platStationId 探测 (第一个 platform) ===");
//                 for (var di = 0; di < details.length; di++) LOG("    " + details[di]);
//                 LOG("    toString()=" + fallback);
//                 LOG("    className=" + st.getClass().getName());
                // 打印所有 public 方法
                var methods = st.getClass().getMethods();
                    var methNames = [];
                    for (var mi = 0; mi < methods.length; mi++) {
                        var mn = methods[mi].getName();
                        if (mn.indexOf("Id") >= 0 || mn.indexOf("id") >= 0 ||
                            mn.indexOf("Uuid") >= 0 || mn.indexOf("Key") >= 0 ||
                            mn.indexOf("Name") >= 0 || mn.indexOf("Station") >= 0) {
                            methNames.push(mn);
                        }
                    }
//                     LOG("    ID相关方法: " + methNames.join(", "));
                    // 打印所有字段
                    var fields = st.getClass().getDeclaredFields();
                    var fieldNames = [];
                    for (var fi = 0; fi < fields.length; fi++) {
                        fieldNames.push(fields[fi].getName());
                    }
//                     LOG("    所有字段: " + fieldNames.join(", "));
//                 } catch(e7) { LOG("    reflect ERR: " + e7); }
            }
            if (tryId != null) {
                var s = String(tryId);
                if (s.length > 0 && s != "null") return s;
            }
            return fallback;
        }
//     } catch (e) { if (!_platIdLogged) { _platIdLogged = true; LOG("  platStationId ERR: " + e); } }
    try { return String(p); } catch (e) {}
    return "unknown_" + Math.random();
}

/** 从 Platform 对象提取方向 (up / dn / ?) */
function platDirection(p) {
    if (p == null) return "?";
    try {
        var rn = p.route ? String(p.route.name) : "";
        var dMatch = rn.match(/(?:n|direction)[:=](up|dn|down)/);
        if (dMatch) return (dMatch[1] == "down") ? "dn" : dMatch[1];
    } catch (e) {}
    try {
        var rn2 = String(p);
        var dMatch2 = rn2.match(/direction[:=](up|dn|down)/);
        if (dMatch2) return (dMatch2[1] == "down") ? "dn" : dMatch2[1];
    } catch (e2) {}
    return "?";
}

/** 从 MTR Platform 对象提取站名 (处理 "中文|English" 格式) */
function platName(p) {
    if (p == null) return "";
    var raw = "";
    try {
        var st = p.station;
        if (st != null && st.name != null) raw = String(st.name);
        if (raw.length == 0 && p.destinationName != null) raw = String(p.destinationName);
        if (raw.length == 0 && p.name != null) raw = String(p.name);
    } catch (e) {}
    if (raw.length == 0) return "";
    var pipeIdx = raw.indexOf('|');
    if (pipeIdx > 0) raw = raw.substring(0, pipeIdx);
    return raw.trim();
}

function sortKey(name) {
    if (name == null) return "";
    name = String(name).trim();
    var chars = [];
    for (var i = 0; i < name.length; i++) {
        var c = name.charCodeAt(i);
        if (c >= 0x4E00 && c <= 0x9FFF) chars.push(name.charAt(i));
    }
    if (chars.length == 0) return name;
    chars.sort();
    return chars.join("");
}

function seqKey(name) {
    if (name == null) return "";
    var chars = [];
    var s = String(name).trim();
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c >= 0x4E00 && c <= 0x9FFF) chars.push(s.charAt(i));
    }
    if (chars.length == 0) return s;
    return chars.join("");
}
var normKey = seqKey;

function buildKeyCount(allPlats) {
    var count = {};
    if (allPlats == null || listSize(allPlats) == 0) return count;
    var total = listSize(allPlats);
    for (var i = 0; i < total; i++) {
        var pn = platName(allPlats.get(i));
        if (pn.length == 0) continue;
        var nk = normKey(pn);
        count[nk] = (count[nk] == null ? 0 : count[nk]) + 1;
    }
    return count;
}

/**
 * V12 核心算法 — buildStationList
 *
 * 纯 stationId 方案:
 *   stationStats[stId] = { up:N, dn:N, upName, dnName }
 *   双向 = stationStats[stId].up > 0 && dn > 0
 *   单向 = stationStats[stId] 只有一个方向
 *
 * 关键前提: platStationId() 返回逻辑站 ID
 *   (双向站 up/dn 的 platform.station 应返回相同 ID)
 */
function buildStationList(train, routePlats, direction, allPlats) {
    var _routeName = "?";
    try {
        if (train != null && train.route != null) _routeName = String(train.route.name);
        else if (routePlats != null && listSize(routePlats) > 0) {
            var _p0 = routePlats.get ? routePlats.get(0) : routePlats[0];
            if (_p0 != null && _p0.route != null) _routeName = String(_p0.route.name);
        }
    } catch(e) {}
//     LOG("V12 dir=" + direction + " route=[" + _routeName.substring(0, 80) + "]");

//     if (routePlats == null || listSize(routePlats) == 0) { LOG("  routePlats empty"); return []; }

    var curDir = direction;
    var otherDir = (curDir == "up") ? "dn" : "up";

    // --- 1. getAllPlatforms ---
    var ap = null;
    try { ap = (allPlats != null && listSize(allPlats) > 0) ? allPlats : train.getAllPlatforms(); } catch (e) {}
//     LOG("  ap size=" + (ap ? listSize(ap) : "null"));

    // --- 2. 线路前缀 ---
    var _routePrefix = "";
    try {
        var _r0 = routePlats.get ? routePlats.get(0) : routePlats[0];
        if (_r0 != null && _r0.route != null) {
            var _m = String(_r0.route.name).match(/^(.*?路)/);
            if (_m) _routePrefix = _m[1];
        }
    } catch(e) {}
//     LOG("  _routePrefix=[" + _routePrefix + "]");

    // --- 3. stationStats[stId] 统计方向 ---
    //    stId → { up:N, dn:N, upName, dnName }
    var stationStats = {};
    if (ap != null && listSize(ap) > 0) {
        var asz = listSize(ap);
//         LOG("  === getAllPlatforms 详细 ===");
        for (var i = 0; i < asz; i++) {
            var p = ap.get ? ap.get(i) : ap[i];
            if (p == null) continue;
            var pStId = platStationId(p);
            var pName = platName(p);
            if (pName.length == 0) continue;
            var pDir = platDirection(p);
            var pRn = "";
            try { pRn = p.route ? String(p.route.name) : ""; } catch(e3) {}
            var matchRoute = (_routePrefix.length == 0 || pRn.indexOf(_routePrefix) == 0);

//             LOG("    [" + i + "] stId=" + pStId.substring(pStId.length - 12) + " " + pName +
//                 " dir=" + pDir + " matchRoute=" + matchRoute);

            if (!matchRoute) continue;

            if (!stationStats[pStId]) stationStats[pStId] = { up: 0, dn: 0, upName: "", dnName: "" };
            if (pDir == "up") {
                stationStats[pStId].up++;
                if (stationStats[pStId].upName == "") stationStats[pStId].upName = pName;
            } else if (pDir == "dn") {
                stationStats[pStId].dn++;
                if (stationStats[pStId].dnName == "") stationStats[pStId].dnName = pName;
            }
        }
    }
//     LOG("  stationStats=" + Object.keys(stationStats).length + " stIds");
    var _stIds = Object.keys(stationStats);
    for (var i = 0; i < _stIds.length; i++) {
        var _s = stationStats[_stIds[i]];
        var _mark = (_s.up > 0 && _s.dn > 0) ? "●双" : ((_s.up > 0) ? "↑上" : "↓下");
//         LOG("    " + _mark + " up=" + _s.up + " dn=" + _s.dn + " " + (_s.upName || _s.dnName));
    }

    // --- 4. curPlats: routePlats 按 stId 去重, 过滤反方向单向站 ---
    // 关键: getThisRoutePlatforms() 可能混了反方向的单向站 platform
    //   → 过滤掉: 单向 + 方向 != curDir → 放到 otherPlats
    var curPlats = [];
    var curSeenStId = {};
    var otherOnewaysFromRoute = [];  // 从 routePlats 过滤出来的反方向单向站
    var rsz = listSize(routePlats);
    for (var i = 0; i < rsz; i++) {
        var rp = routePlats.get ? routePlats.get(i) : routePlats[i];
        if (rp == null) continue;
        var rpStId = platStationId(rp);
        if (curSeenStId[rpStId]) continue;
        var rpDir = platDirection(rp);
        var rpName = platName(rp);
        var s = stationStats[rpStId];
        var isOnewayOtherDir = (s != null && s.up > 0 && s.dn == 0 && rpDir != curDir) ||
                               (s != null && s.up == 0 && s.dn > 0 && rpDir != curDir);
        if (isOnewayOtherDir) {
//             LOG("    SKIP curPlats[" + i + "]: 反方向单向 " + rpName + " dir=" + rpDir);
            otherOnewaysFromRoute.push({ stId: rpStId, name: rpName, oneType: rpDir });
            curSeenStId[rpStId] = true;  // 标记为已处理
            continue;
        }
        curSeenStId[rpStId] = true;
        curPlats.push({ stId: rpStId, name: rpName });
    }
//     LOG("  curPlats=" + curPlats.length + " (routePlats stId去重, 过滤反方向单向)");
    for (var i = 0; i < curPlats.length; i++) {
        var _s = stationStats[curPlats[i].stId];
        var _isBoth = (_s && _s.up > 0 && _s.dn > 0);
//         LOG("    [" + i + "] " + (_isBoth ? "●双" : "○单") + " " + curPlats[i].name +
            //" stId=" + curPlats[i].stId.substring(curPlats[i].stId.length - 12) +
            //" up=" + (_s ? _s.up : "?") + " dn=" + (_s ? _s.dn : "?"));
    }

    // --- 5. otherPlats: getAllPlatforms 反方向单向站 + 过滤出来的 ---
    var otherPlats = [];
    var otherSeenStId = {};
    // 先加从 routePlats 过滤出来的反方向单向站
    for (var i = 0; i < otherOnewaysFromRoute.length; i++) {
        var oo = otherOnewaysFromRoute[i];
        otherSeenStId[oo.stId] = true;
        otherPlats.push(oo);
    }
    // 再加 getAllPlatforms 里反方向单向站 (不在 curPlats)
    if (ap != null && listSize(ap) > 0) {
        var asz = listSize(ap);
        for (var i = 0; i < asz; i++) {
            var p = ap.get ? ap.get(i) : ap[i];
            if (p == null) continue;
            var pStId = platStationId(p);
            var pDir = platDirection(p);
            if (pDir != otherDir) continue;
            try {
                var pRn = p.route ? String(p.route.name) : "";
                if (_routePrefix.length > 0 && pRn.indexOf(_routePrefix) != 0) continue;
            } catch(e2) { continue; }
            if (curSeenStId[pStId]) continue;
            if (otherSeenStId[pStId]) continue;
            var ps = stationStats[pStId];
            // 只要单向站 (双向站 stId 相同, 已在 curPlats)
            if (ps && ps.up > 0 && ps.dn > 0) continue;
            otherSeenStId[pStId] = true;
            otherPlats.push({ stId: pStId, name: platName(p), oneType: pDir });
        }
    }
//     LOG("  otherPlats=" + otherPlats.length + " (反方向单向站)");
    for (var i = 0; i < otherPlats.length; i++) {
//         LOG("    [" + i + "] " + otherPlats[i].name + " stId=" + otherPlats[i].stId.substring(otherPlats[i].stId.length - 12));
    }

    // --- 6. 从 getAllPlatforms 构建完整方向序列 ---
    // upSeq: 所有 dir="up" platform, stId 去重, 保持 getAllPlatforms 原始顺序
    // dnSeq: 所有 dir="dn" platform, stId 去重
    // 然后需要确定方向对齐 curPlats...
    function isBoth(stId) {
        var s = stationStats[stId];
        return (s != null && s.up > 0 && s.dn > 0);
    }

    // 从 ap 里按 dir 提取 platform 序列
    function buildDirSeq(dir) {
        var seq = [];
        var seen = {};
        if (ap != null && listSize(ap) > 0) {
            var asz = listSize(ap);
            for (var i = 0; i < asz; i++) {
                var p = ap.get ? ap.get(i) : ap[i];
                if (p == null) continue;
                var pDir = platDirection(p);
                if (pDir != dir) continue;
                var pStId = platStationId(p);
                if (seen[pStId]) continue;
                var pName = platName(p);
                if (pName.length == 0) continue;
                seen[pStId] = true;
                seq.push({ stId: pStId, name: pName, isBoth: isBoth(pStId), dir: dir });
            }
        }
        return seq;
    }

    // 关键命名修复: 不管 curDir 是什么, 明确方向!
    // upSeq  = 所有 dir="up" 的 platform, 方向对齐 curPlats
    // dnSeq  = 所有 dir="dn" 的 platform, 方向对齐 curPlats (反转一次)
    var upSeqSeq = buildDirSeq("up");
    var dnSeqSeq = buildDirSeq("dn");
//     LOG("  upSeq (up dir)=" + upSeqSeq.length + " dnSeq (dn dir)=" + dnSeqSeq.length);
    for (var i = 0; i < upSeqSeq.length; i++) {
        var _m = upSeqSeq[i].isBoth ? "●双" : "○单";
//         LOG("    upSeq[" + i + "] " + _m + " " + upSeqSeq[i].name);
    }
    for (var i = 0; i < dnSeqSeq.length; i++) {
        var _m = dnSeqSeq[i].isBoth ? "●双" : "○单";
//         LOG("    dnSeq[" + i + "] " + _m + " " + dnSeqSeq[i].name);
    }

    // 规则: 无论 curDir 是什么, 线路图统一使用下行 (dn) 方向的布局
    // getAllPlatforms 里 dir=up 的原始顺序 = 终点站→起点站, 正好就是 P2 下行的样子
    // 所以 upSeq 永远不反转!
//     LOG("  线路图统一使用下行布局, upSeq 不反转");

    // dnSeq 和 upSeq 天然方向相反, 所以永远反转一次对齐
    dnSeqSeq.reverse();
//     LOG("  dnSeq 已反转 (与 upSeq 方向对齐)");

//     LOG("  upSeq 最终顺序:");
    for (var i = 0; i < upSeqSeq.length; i++) {
        var _m = upSeqSeq[i].isBoth ? "●双" : "○单";
//         LOG("    [" + i + "] " + _m + " " + upSeqSeq[i].name);
    }
//     LOG("  dnSeq 最终顺序:");
    for (var i = 0; i < dnSeqSeq.length; i++) {
        var _m = dnSeqSeq[i].isBoth ? "●双" : "○单";
//         LOG("    [" + i + "] " + _m + " " + dnSeqSeq[i].name);
    }

    // --- 7. 构建双向站锚点 (用 upSeq) ---
    var seq_both_idx = {};
    var cur_both_stIds = [];
    for (var i = 0; i < upSeqSeq.length; i++) {
        if (upSeqSeq[i].isBoth) {
            seq_both_idx[upSeqSeq[i].stId] = i;
            cur_both_stIds.push(upSeqSeq[i].stId);
        }
    }

    // --- 8. 收集头部/尾部单向站 (从 upSeq) ---
    var headOnes = [];
    for (var i = 0; i < upSeqSeq.length; i++) {
        if (upSeqSeq[i].isBoth) break;
        headOnes.push(upSeqSeq[i]);
    }
    var tailOnes = [];
    for (var i = upSeqSeq.length - 1; i >= 0; i--) {
        if (upSeqSeq[i].isBoth) break;
        tailOnes.unshift(upSeqSeq[i]);
    }
//     LOG("  头部单向站 (upSeq 第一个双向站前): " + headOnes.length + " " + headOnes.map(function(x){return x.name;}).join(","));
//     LOG("  尾部单向站 (upSeq 最后一个双向站后): " + tailOnes.length + " " + tailOnes.map(function(x){return x.name;}).join(","));

    // --- 9. 追加强制起终点站双向站 ---
    // 规则: 起终点站均为双向车站
    // 尾部最后一个单向站 = 终点站, 强制变双向
    // 头部第一个单向站 = 起点站, 强制变双向 (如果有)
    var forcedTerminal = null;   // 强制终点双向站 (stId)
    var forcedTerminalName = "";
    var forcedTerminalSeqIdx = -1;
    if (tailOnes.length > 0) {
        var lastOne = tailOnes[tailOnes.length - 1];
        forcedTerminal = lastOne.stId;
        forcedTerminalName = lastOne.name;
        tailOnes.pop();
        // 在 upSeq 里找到它, 设 isBoth = true
        for (var fi = 0; fi < upSeqSeq.length; fi++) {
            if (upSeqSeq[fi].stId == forcedTerminal) {
                upSeqSeq[fi].isBoth = true;
                forcedTerminalSeqIdx = fi;
                break;
            }
        }
//         LOG("  强制终点站(双向): " + forcedTerminalName + " stId=" + forcedTerminal.substring(forcedTerminal.length-8) +
            //" seqIdx=" + forcedTerminalSeqIdx);
        // 更新 seq_both_idx 和 cur_both_stIds
        if (forcedTerminalSeqIdx >= 0) {
            seq_both_idx[forcedTerminal] = forcedTerminalSeqIdx;
            cur_both_stIds.push(forcedTerminal);
        } else {
            cur_both_stIds.push(forcedTerminal);
            seq_both_idx[forcedTerminal] = upSeqSeq.length;
        }
    }

    var forcedOrigin = null;
    var forcedOriginName = "";
    var forcedOriginSeqIdx = -1;
    if (headOnes.length > 0) {
        var firstOne = headOnes[0];
        forcedOrigin = firstOne.stId;
        forcedOriginName = firstOne.name;
        headOnes.shift();
        for (var fi = 0; fi < upSeqSeq.length; fi++) {
            if (upSeqSeq[fi].stId == forcedOrigin) {
                upSeqSeq[fi].isBoth = true;
                forcedOriginSeqIdx = fi;
                break;
            }
        }
//         LOG("  强制起点站(双向): " + forcedOriginName + " stId=" + forcedOrigin.substring(forcedOrigin.length-8) +
            //" seqIdx=" + forcedOriginSeqIdx);
        cur_both_stIds.splice(0, 0, forcedOrigin);
        seq_both_idx[forcedOrigin] = forcedOriginSeqIdx >= 0 ? forcedOriginSeqIdx : 0;
    }

//     LOG("  cur_both_stIds=" + cur_both_stIds.length + " 个双向站锚点");
    for (var i = 0; i < cur_both_stIds.length; i++) {
        var _idx = seq_both_idx[cur_both_stIds[i]];
//         LOG("    [" + i + "] stId=" + cur_both_stIds[i].substring(cur_both_stIds[i].length-8) +
            //" seqIdx=" + _idx);
    }

    // --- 10. DN 块映射 (极简版) ---
    // 规则: DN 单向站夹在两个双向站之间 (按物理停靠位置)
    // 1. prevBoth = dnSeq 里 oi 前面最近的双向站
    // 2. nextBoth = dnSeq 里 oi 后面最近的双向站
    // 3. 如果 nextBoth 找不到 (比如强制终点站只有 dir=up 的 platform),
    //    用 cur_both_stIds 里 prevBoth 的下一个双向站!
    
    var dnBlockByRightStId = {};
    for (var i = 0; i < dnSeqSeq.length; i++) {
        var oi = dnSeqSeq[i];
        if (oi.isBoth) continue;
        // 找 prevBothStId (oi 前面最近的双向站)
        var prevBothStId = null;
        for (var j = i - 1; j >= 0; j--) {
            if (dnSeqSeq[j].isBoth) { prevBothStId = dnSeqSeq[j].stId; break; }
        }
        // 找 nextBothStId (oi 后面最近的双向站)
        var nextBothStId = null;
        for (var j = i + 1; j < dnSeqSeq.length; j++) {
            if (dnSeqSeq[j].isBoth) { nextBothStId = dnSeqSeq[j].stId; break; }
        }
        
        // 关键: 如果 dnSeq 里找不到 nextBoth (强制终点站), 从 cur_both_stIds 里找!
        if (!nextBothStId && prevBothStId) {
            var pbIdxInCur = cur_both_stIds.indexOf(prevBothStId);
            if (pbIdxInCur >= 0 && pbIdxInCur < cur_both_stIds.length - 1) {
                nextBothStId = cur_both_stIds[pbIdxInCur + 1];
            }
        }
        // 同样: 如果 dnSeq 里找不到 prevBoth (强制起点站), 从 cur_both_stIds 里找
        if (!prevBothStId && nextBothStId) {
            var nbIdxInCur = cur_both_stIds.indexOf(nextBothStId);
            if (nbIdxInCur > 0) {
                prevBothStId = cur_both_stIds[nbIdxInCur - 1];
            }
        }
        
        // rightStId = cur_both_stIds 里 prevBoth 和 nextBoth 中 idx 更大的那个
        var targetRightStId = null;
        var pbIdx = cur_both_stIds.indexOf(prevBothStId);
        var nbIdx = cur_both_stIds.indexOf(nextBothStId);
        if (pbIdx >= 0 && nbIdx >= 0) {
            targetRightStId = Math.max(pbIdx, nbIdx) === pbIdx ? prevBothStId : nextBothStId;
        } else if (pbIdx >= 0) {
            targetRightStId = prevBothStId;
        } else if (nbIdx >= 0) {
            targetRightStId = nextBothStId;
        } else {
            targetRightStId = cur_both_stIds[0] || prevBothStId;
        }
        
        if (!dnBlockByRightStId[targetRightStId]) dnBlockByRightStId[targetRightStId] = [];
        dnBlockByRightStId[targetRightStId].push(oi);
    }
    // dnSeq 反转过, DN 单向站收集顺序可能和 dn 方向自然顺序相反
    // 需要每个 dnBlock reverse() 回去
    var _dnKeys2 = Object.keys(dnBlockByRightStId);
    for (var i = 0; i < _dnKeys2.length; i++) {
        dnBlockByRightStId[_dnKeys2[i]].reverse();
    }
//     LOG("  DN块映射 (by rightStId):");
    var _dnKeys = Object.keys(dnBlockByRightStId);
    for (var i = 0; i < _dnKeys.length; i++) {
//         LOG("    right=" + _dnKeys[i].substring(_dnKeys[i].length - 8) + " → " + dnBlockByRightStId[_dnKeys[i]].length +
            //" (" + dnBlockByRightStId[_dnKeys[i]].map(function(x){return x.name;}).join(",") + ")");
    }

    // --- 11. 组装 stations ---
    var stations = [];
    var FIRST_MAP = 0;

    function pickBothName(stId) {
        var s = stationStats[stId];
        if (!s) return "";
        if (forcedTerminal && stId == forcedTerminal) return forcedTerminalName;
        if (forcedOrigin && stId == forcedOrigin) return forcedOriginName;
        if (curDir == "up") return s.upName || s.dnName || "";
        return s.dnName || s.upName || "";
    }
    function makeBoth(stId, _mk) {
        var n = pickBothName(stId);
        return { name: extractCjk(n), raw: n, stationId: stId, type: "both", _mapKey: _mk };
    }
    function makeOneway(seqItem, _mk) {
        return { name: extractCjk(seqItem.name), raw: seqItem.name,
            stationId: seqItem.stId, type: seqItem.dir || curDir, _mapKey: _mk };
    }

    var prevMap = FIRST_MAP;
    stations.push(makeBoth(cur_both_stIds[0], FIRST_MAP));

    for (var bi = 0; bi < cur_both_stIds.length - 1; bi++) {
        var leftStId = cur_both_stIds[bi];
        var rightStId = cur_both_stIds[bi + 1];
        var leftSeqIdx = seq_both_idx[leftStId];
        var rightSeqIdx = seq_both_idx[rightStId];

//         LOG("  配对 [" + bi + "] L=" + leftStId.substring(leftStId.length - 8) +
            //" R=" + rightStId.substring(rightStId.length - 8) +
            //" seqIdx [" + leftSeqIdx + "," + rightSeqIdx + "]");

        // UP 块: upSeq 里 leftSeqIdx..rightSeqIdx 之间的单向站
        var upBlock = [];
        if (leftSeqIdx >= 0 && rightSeqIdx >= 0 && rightSeqIdx <= upSeqSeq.length) {
            for (var k = leftSeqIdx + 1; k < rightSeqIdx; k++) {
                if (!upSeqSeq[k].isBoth) upBlock.push(upSeqSeq[k]);
            }
        }
        // 头部单向站 (没有强制起点时才需要手动加, 有强制起点时已在 upSeq 配对范围内)
        if (bi == 0 && headOnes.length > 0) {
            if (!forcedOrigin) {
                for (var k = 0; k < headOnes.length; k++) upBlock.push(headOnes[k]);
            }
            headOnes = [];
        }
        // 尾部单向站 (没有强制终点时才需要手动加, 有强制终点时已在 upSeq 配对范围内)
        if (bi == cur_both_stIds.length - 2 && tailOnes.length > 0) {
            if (!forcedTerminal) {
                for (var k = 0; k < tailOnes.length; k++) upBlock.push(tailOnes[k]);
            }
            tailOnes = [];
        }

        var dnBlock = dnBlockByRightStId[rightStId] || [];

//         LOG("    UP块=" + upBlock.length + " DN块=" + dnBlock.length);
//         for (var k = 0; k < upBlock.length; k++) LOG("      UP↑ " + upBlock[k].name);
//         for (var k = 0; k < dnBlock.length; k++) LOG("      DN↓ " + dnBlock[k].name);

        var rightMap = prevMap + 10;
        var span = rightMap - prevMap;

        for (var k = 0; k < upBlock.length; k++) {
            var key;
            if (upBlock.length == 1) key = prevMap + span * 0.25;
            else key = prevMap + span * 0.02 + (span * 0.46) * (k / (upBlock.length - 1));
            stations.push(makeOneway(upBlock[k], key));
        }
        for (var k = 0; k < dnBlock.length; k++) {
            var key;
            if (dnBlock.length == 1) key = prevMap + span * 0.75;
            else key = prevMap + span * 0.52 + (span * 0.46) * (k / (dnBlock.length - 1));
            stations.push(makeOneway(dnBlock[k], key));
        }

        stations.push(makeBoth(rightStId, rightMap));
        prevMap = rightMap;
    }

    // --- 12. 排序 + 首尾强制双向 ---
    stations.sort(function(a, b) { return a._mapKey - b._mapKey; });
//     LOG("  === 排序后 (" + stations.length + " 站) ===");
    for (var i = 0; i < stations.length; i++) {
        var t = stations[i].type;
        var mark = (t == "both") ? "●双" : ((t == "up") ? "↑上" : ((t == "dn") ? "↓下" : "○?"));
//         LOG("  [" + i + "] " + mark + " " + stations[i].raw + " key=" + stations[i]._mapKey.toFixed(2));
    }
//     if (stations.length > 0 && stations[0].type != "both") { LOG("  首站强制 both"); stations[0].type = "both"; }
    if (stations.length > 1 && stations[stations.length - 1].type != "both") {
//         LOG("  末站强制 both");
        stations[stations.length - 1].type = "both";
    }
    for (var i = 0; i < stations.length; i++) { delete stations[i]._mapKey; }
//     LOG("  === FINAL: " + stations.length + " stations ===");
    return stations;
}

/* ===== 绘制函数 (巴士二公司 顶栏布局) ===== */

/**
 * 顶部标题栏
 * 白色背景, 左上角logo + 公司名 (company.ttf), 中间线路名
 */
function DrawTopBar(g, routeName) {
    var H = MAP_TOPBAR_H;  // 60
    g.setColor(MAP_TOP_BG);
    g.fillRect(0, 0, 2000, H);

    // 左上角 logo + 公司名
    var logoImg = loadPudongLogo();
    var logoSize = 40;
    var logoX = 20, logoY = (H - logoSize) / 2;
    if (logoImg != null) {
        var logoH = Math.round(logoImg.getHeight() * logoSize / logoImg.getWidth());
        logoY = (H - logoH) / 2;
        g.drawImage(logoImg, logoX, logoY, logoSize, logoH, null);
    } else {
        print("[BSL] DrawTopBar: logo still null after fallback");
    }
    g.setColor(MAP_DOT_GREEN);
    g.setFont(COMPANY_FONT.deriveFont(Font.BOLD, 26));
    LeftText(g, MAP_OPERATOR_NAME, logoX + logoSize + 8, (H + 26 / 2) / 2 + 2, 300);

    // 中间: "XXX路站级示意图"
    var titleStr = String(routeName || "").trim() + "站级示意图";
    g.setColor(MAP_DOT_GREEN);
    g.setFont(SERIF.deriveFont(Font.BOLD, 36));
    CentreText(g, titleStr, 1000, (H + 36 / 2) / 2 + 2, 1200);
}

/**
 * 中间线路图区域 (白色背景)
 */
function DrawRightMap(g, stations) {
    var n = stations.length;
    if (n == null || isNaN(n) || n <= 0) n = 0;

    var areaTop = MAP_LINEAREA_TOP;     // 60
    var areaBottom = MAP_LINEAREA_BOTTOM; // 340
    var areaH = areaBottom - areaTop;     // 280

    // 白色背景
    g.setColor(Color.WHITE);
    g.fillRect(0, areaTop, 2000, areaH);

    if (n == 0) {
        g.setColor(MAP_STATION_BLACK);
        g.setFont(SERIF.deriveFont(Font.PLAIN, 32));
        CentreText(g, "暂无线路数据", 1000, areaTop + areaH / 2, 1600);
        return;
    }
    if (n == 1) {
        g.setColor(MAP_STATION_BLACK);
        g.setFont(SERIF.deriveFont(Font.PLAIN, 32));
        CentreText(g, stations[0].raw || stations[0].name || "单站", 1000, areaTop + areaH / 2, 1600);
        return;
    }

    var nameSize;
    if (n <= 4) nameSize = 26;
    else if (n <= 7) nameSize = 20;
    else if (n <= 12) nameSize = 16;
    else if (n <= 18) nameSize = 13;
    else nameSize = 11;

    var availW = 1960;
    var gap = availW / (n - 1);
    if (isNaN(gap) || !isFinite(gap) || gap <= 0) {
        g.setColor(Color.WHITE);
        g.fillRect(0, areaTop, 2000, areaH);
        if (stations[0]) {
            g.setFont(SERIF.deriveFont(Font.PLAIN, 32));
            CentreText(g, stations[0].raw || stations[0].name || "数据异常", 1000, areaTop + areaH / 2, 1600);
        }
        return;
    }
    if (gap < nameSize * 1.6) { nameSize = Math.max(9, Math.floor(gap / 1.6)); }
    if (gap > nameSize * 3 && n <= 8 && nameSize < 28) { nameSize = Math.min(28, nameSize + 3); }
    var noteCharSize = Math.max(7, Math.floor(nameSize * 0.7));

    // 横线位置: 在线路图区域内偏上, 给站名留出足够空间
    var LINE_Y = areaTop + 40;
    var leftX = 20;
    var rightX = 1980;

    // 绿色粗横线
    g.setColor(MAP_LINE_GREEN);
    g.setStroke(new BasicStroke(4));
    g.drawLine(leftX, LINE_Y, rightX, LINE_Y);
    g.setStroke(new BasicStroke(1));

    // 站点圆点 + 站名
    var dotR = 9;
    var nameTop = LINE_Y + dotR + Math.round(nameSize * 0.9);
    for (var i = 0; i < n; i++) {
        var cx = leftX + gap * i;
        var st = stations[i];

        var dotColor;
        if (st.type == "up") dotColor = MAP_DOT_UP;
        else if (st.type == "dn") dotColor = MAP_DOT_DN;
        else dotColor = MAP_DOT_GREEN;
        g.setColor(dotColor);
        g.fillOval(cx - dotR, LINE_Y - dotR, dotR * 2, dotR * 2);

        // 站名颜色
        if (st.type == "up") g.setColor(MAP_UP_ONLY_RED);
        else if (st.type == "dn") g.setColor(MAP_DN_ONLY_BLUE);
        else g.setColor(MAP_STATION_BLACK);
        g.setFont(SERIF.deriveFont(Font.BOLD, nameSize));
        if (st.name != null && st.name.length > 0) {
            DrawVerticalText(g, st.name, cx - g.getFontMetrics().stringWidth(st.name.charAt(0)) / 2, nameTop, 0);
        }

        // "上行"/"下行" 标注
        var noteY = nameTop + st.name.length * g.getFontMetrics().getHeight() + noteCharSize + 2;
        if (st.type == "up") {
            g.setColor(MAP_UP_ONLY_RED);
            g.setFont(SERIF.deriveFont(Font.BOLD, noteCharSize));
            g.drawString("上行", cx - g.getFontMetrics().stringWidth("上行") / 2, noteY);
        } else if (st.type == "dn") {
            g.setColor(MAP_DN_ONLY_BLUE);
            g.setFont(SERIF.deriveFont(Font.BOLD, noteCharSize));
            g.drawString("下行", cx - g.getFontMetrics().stringWidth("下行") / 2, noteY);
        }
    }

    // 方向箭头 - 放到底栏之上一点点, 不与底栏重叠
    var arrowSize = 10;
    var arrowY = areaBottom - arrowSize * 0.7 - 5;

    // 左侧箭头 - 上行方向指示 (红色)
    g.setColor(MAP_UP_ONLY_RED);
    g.setStroke(new BasicStroke(2));
    var redAx1 = 15, redAx2 = redAx1 + arrowSize * 1.5;
    g.drawLine(redAx1, arrowY, redAx2, arrowY);
    var redPoly = new java.awt.Polygon();
    redPoly.addPoint(redAx2, arrowY);
    redPoly.addPoint(redAx2 - arrowSize, Math.round(arrowY - arrowSize * 0.7));
    redPoly.addPoint(redAx2 - arrowSize, Math.round(arrowY + arrowSize * 0.7));
    g.fillPolygon(redPoly);

    // 右侧箭头 - 下行方向指示 (蓝色)
    g.setColor(MAP_DN_ONLY_BLUE);
    var greenAx2 = 1985, greenAx1 = greenAx2 - arrowSize * 1.5;
    g.drawLine(greenAx1, arrowY, greenAx2, arrowY);
    var greenPoly = new java.awt.Polygon();
    greenPoly.addPoint(greenAx1, arrowY);
    greenPoly.addPoint(greenAx1 + arrowSize, Math.round(arrowY - arrowSize * 0.7));
    greenPoly.addPoint(greenAx1 + arrowSize, Math.round(arrowY + arrowSize * 0.7));
    g.fillPolygon(greenPoly);

    g.setStroke(new BasicStroke(1));
}

/**
 * 底部信息栏
 * 深绿色背景, 左:起点站+首末班, 中:票价+热线, 右:终点站+首末班
 */
function DrawBottomBar(g, startName, endName, attrs, direction) {
    var topY = MAP_LINEAREA_BOTTOM;  // 340
    var H = MAP_BOTTOMBAR_H;         // 60

    g.setColor(MAP_BOTTOM_BG);
    g.fillRect(0, topY, 2000, H);

    // 左侧: 起点站 (首站)
    var firstLast = direction == "dn" ? MAP_DEFAULT_FIRST_LAST_DN : MAP_DEFAULT_FIRST_LAST_UP;
    g.setColor(MAP_WHITE);
    g.setFont(SERIF.deriveFont(Font.BOLD, 24));
    LeftText(g, startName || "\u2014", 20, topY + 24, 400);
    g.setColor(Color.decode("#B0E0C8"));
    g.setFont(SERIF.deriveFont(Font.PLAIN, 14));
    LeftText(g, "首末班 " + firstLast, 20, topY + 44, 400);

    // 右侧: 终点站 (末站)
    var firstLast2 = direction == "dn" ? MAP_DEFAULT_FIRST_LAST_UP : MAP_DEFAULT_FIRST_LAST_DN;
    g.setColor(MAP_WHITE);
    g.setFont(SERIF.deriveFont(Font.BOLD, 24));
    RightText(g, endName || "\u2014", 1980, topY + 24, 400);
    g.setColor(Color.decode("#B0E0C8"));
    g.setFont(SERIF.deriveFont(Font.PLAIN, 14));
    RightText(g, "末班 " + firstLast2, 1980, topY + 44, 400);

    // 中间: 票价 + 热线
    var fareStr = attrs ? attrs["fare"] : null;
    var fare = parseFare(fareStr);
    var hotlineStr = attrs ? attrs["hotline"] : null;
    if (hotlineStr == null) hotlineStr = _BSL_HOTLINE;

    g.setColor(MAP_WHITE);
    g.setFont(SERIF.deriveFont(Font.PLAIN, 14));
    CentreText(g, fare.label, 1000, topY + 24, 600);
    g.setColor(Color.decode("#B0E0C8"));
    CentreText(g, "服务热线: " + hotlineStr, 1000, topY + 44, 600);
}

/**
 * 从 route.name 解析方向
 * 优先匹配 n:up / n:dn 或 direction:up / direction:dn
 */
function resolveDirection(rawRouteName, routePlats, allPlats, train) {
    if (rawRouteName != null && rawRouteName.length > 0) {
        var rn = String(rawRouteName).toLowerCase();
        var dirMatch = rn.match(/(?:n|direction)[:=](up|dn|down)/);
        if (dirMatch) {
            var d = dirMatch[1];
            return "up";
        }
    }
    // Fallback
    var ap = (allPlats != null && listSize(allPlats) > 0) ? allPlats : train.getAllPlatforms();
        if (ap != null && listSize(ap) > 0 && routePlats != null && listSize(routePlats) > 0) {
            var apFirstName = platName(ap.get(0));
            var rpFirstName = platName(routePlats.get(0));
            if (sortKey(apFirstName) != sortKey(rpFirstName)) return "dn";
            return "up";
        }
    return "up";
}

function getPhysTerminals(bothStations) {
    var start = "";
    var end = "";
    if (bothStations == null || bothStations.length == 0) return { start: start, end: end };
    start = bothStations[0].name;
    end = bothStations[bothStations.length - 1].name;
    return { start: extractCjk(start), end: extractCjk(end) };
}

function DrawRouteMap(g, state, train, routePlats, allPlats) {
    // 整个画布先用白色填充
    g.setColor(Color.WHITE);
    g.fillRect(0, 0, 2000, 400);

    var rawRouteName = "";
    try {
        if (routePlats != null && listSize(routePlats) > 0) {
            var firstPlat = routePlats.get(0);
            if (firstPlat != null && firstPlat.route != null && firstPlat.route.name != null) {
                rawRouteName = String(firstPlat.route.name);
            }
        }
    } catch (e) {}

    var attrs = parseRouteAttributes(rawRouteName);
    var routeName = cleanRouteName(rawRouteName).trim();
    var direction = resolveDirection(rawRouteName, routePlats, allPlats, train);

    var ap = null;
        ap = (allPlats != null && listSize(allPlats) > 0) ? allPlats : train.getAllPlatforms();

    var stations = buildStationList(train, routePlats, direction, ap);
    var n = stations.length;

    var leftStart = "";
    var leftEnd = "";
    if (n >= 2) {
        leftStart = stations[0].name;
        leftEnd = stations[n - 1].name;
    } else if (n == 1) {
        leftStart = leftEnd = stations[0].name;
    }

    DrawTopBar(g, routeName);
    DrawRightMap(g, stations);
    DrawBottomBar(g, leftStart, leftEnd, attrs, direction);
}
