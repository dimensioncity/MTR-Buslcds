/**
 * V8 核心: 双向站锚点对齐 + 单向站配对交错
 *
 * 原理:
 *   curPlats   = routePlats 去重 (当前方向, MTR 原生排序)
 *   otherPlats = getAllPlatforms 反方向同线路去重
 *   双向站 = curPlats 和 otherPlats 都有同一个 stId
 *   单向站 = 只在其中一个序列
 *
 * 算法:
 *   1. curPlats 双向站 → mapKey = pos * 10 (锚点)
 *   2. 遍历 curPlats 相邻双向站对 (A, B)
 *      收集这对之间的所有单向站:
 *        - curPlats 里 A 和 B 之间的 curDir 单向站
 *        - otherPlats 里 A' 和 B' 之间的 otherDir 单向站
 *   3. interleave:
 *        up 自己均匀分 fraction = (i+1)/(up_count+1)
 *        dn  自己均匀分 fraction = (i+1)/(dn_count+1) + 0.001
 *        按 fraction 排序 → 自然交错
 *        映射到 [A.curKey, B.curKey]
 *   4. 所有站排序 → 首尾强制双向
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
    LOG("V8 BSL dir=" + direction + " route=[" + _routeName.substring(0, 60) + "]");

    if (routePlats == null || listSize(routePlats) == 0) { LOG("  routePlats empty -> []"); return []; }
    var rsz = listSize(routePlats);

    var curDir = direction;
    var otherDir = (direction == "up") ? "dn" : "up";

    // --- 数据准备 ---
    var ap = null;
    try { ap = (allPlats != null && listSize(allPlats) > 0) ? allPlats : train.getAllPlatforms(); } catch (e) {}

    var _routePrefix = "";
    try {
        var _r0 = routePlats.get ? routePlats.get(0) : routePlats[0];
        if (_r0 != null && _r0.route != null) {
            var _m = String(_r0.route.name).match(/^(.*?路)/);
            if (_m) _routePrefix = _m[1];
        }
    } catch(e) {}

    // curPlats: 从 routePlats 去重
    var curPlats = [];
    var curSeen = {};
    for (var i = 0; i < rsz; i++) {
        var rp = routePlats.get ? routePlats.get(i) : routePlats[i];
        if (rp == null) continue;
        var stId = platStationId(rp);
        if (curSeen[stId]) continue;
        curSeen[stId] = true;
        curPlats.push({ stId: stId, name: platName(rp), pos: i });
    }
    LOG("  curPlats size=" + curPlats.length);

    // otherPlats + stationStats
    var otherPlats = [];
    var otherSeen = {};
    var stationStats = {};
    if (ap != null && listSize(ap) > 0) {
        for (var i = 0; i < listSize(ap); i++) {
            var p = ap.get ? ap.get(i) : ap[i];
            if (p == null) continue;
            var pStId = platStationId(p);
            var pName = platName(p);
            var pDir = platDirection(p);

            if (!stationStats[pStId]) stationStats[pStId] = { up: 0, dn: 0, upName: "", dnName: "" };
            if (pDir == "up") { stationStats[pStId].up++; if (stationStats[pStId].upName == "") stationStats[pStId].upName = pName; }
            else if (pDir == "dn") { stationStats[pStId].dn++; if (stationStats[pStId].dnName == "") stationStats[pStId].dnName = pName; }

            var pRn = "";
            try { pRn = p.route ? String(p.route.name) : ""; } catch(e2) {}
            if (_routePrefix.length > 0 && pRn.indexOf(_routePrefix) != 0) continue;

            if (pDir == otherDir && !otherSeen[pStId]) {
                otherSeen[pStId] = true;
                otherPlats.push({ stId: pStId, name: pName, pos: otherPlats.length });
            }
        }
    }
    LOG("  stationStats=" + Object.keys(stationStats).length + " otherPlats=" + otherPlats.length);

    // --- Step 1: 标记双向/单向 ---
    for (var i = 0; i < curPlats.length; i++) {
        var s = stationStats[curPlats[i].stId];
        curPlats[i].isBoth = (s != null && s.up > 0 && s.dn > 0);
    }
    for (var i = 0; i < otherPlats.length; i++) {
        var s = stationStats[otherPlats[i].stId];
        otherPlats[i].isBoth = (s != null && s.up > 0 && s.dn > 0);
    }

    // --- Step 2: 找 curPlats 里双向站位置 ---
    var cur_st_pos = {};  // stId → pos (在 curPlats 里)
    var cur_both_order = [];  // curPlats 里双向站的出现顺序
    var anchors = {};  // stId → mapKey (双向站锚点)
    for (var i = 0; i < curPlats.length; i++) {
        cur_st_pos[curPlats[i].stId] = i;
        if (curPlats[i].isBoth) {
            anchors[curPlats[i].stId] = i * 10.0;
            cur_both_order.push(curPlats[i].stId);
        }
    }
    LOG("  双向站锚点: " + cur_both_order.length + " 个");
    for (var i = 0; i < cur_both_order.length; i++) {
        LOG("    [" + i + "] " + cur_both_order[i] + " key=" + anchors[cur_both_order[i]]);
    }

    // curPlats 里双向站也建立 stId → otherPos 映射
    var stIdToOtherIdx = {};
    for (var i = 0; i < otherPlats.length; i++) {
        if (otherPlats[i].isBoth) stIdToOtherIdx[otherPlats[i].stId] = i;
    }

    // --- Step 3: 遍历相邻双向站对, 收集单向站, interleave ---
    var stations = [];

    // 首双向站
    var firstStId = cur_both_order[0];
    var firstStats = stationStats[firstStId];
    var firstName = curPlats[cur_st_pos[firstStId]].name;
    if (curDir == "up" && firstStats && firstStats.upName) firstName = firstStats.upName;
    else if (curDir == "dn" && firstStats && firstStats.dnName) firstName = firstStats.dnName;
    stations.push({ name: extractCjk(firstName), raw: firstName, stationId: firstStId, type: "both", _mapKey: anchors[firstStId] });

    for (var bi = 0; bi < cur_both_order.length - 1; bi++) {
        var leftStId = cur_both_order[bi];
        var rightStId = cur_both_order[bi + 1];
        var leftKey = anchors[leftStId];
        var rightKey = anchors[rightStId];

        var leftCurPos = cur_st_pos[leftStId];
        var rightCurPos = cur_st_pos[rightStId];
        var leftOtherIdx = stIdToOtherIdx[leftStId];
        var rightOtherIdx = stIdToOtherIdx[rightStId];

        // 收集单向站
        var upOnes = [];  // curDir 单向 (来自 curPlats)
        var dnOnes = [];  // otherDir 单向 (来自 otherPlats)

        // curPlats 里 A 和 B 之间的 curDir 单向
        for (var k = leftCurPos + 1; k < rightCurPos; k++) {
            var cp = curPlats[k];
            if (cp.isBoth) continue;
            // curDir 单向: stationStats 里只有 curDir 方向有记录
            var cps = stationStats[cp.stId];
            var oneType;
            if (cps && cps.up > 0) oneType = "up";
            else oneType = "dn";
            if (oneType == "up") upOnes.push(cp);
            else dnOnes.push(cp);
        }

        // otherPlats 里 A' 和 B' 之间的 otherDir 单向
        if (leftOtherIdx != null && rightOtherIdx != null) {
            for (var k = leftOtherIdx + 1; k < rightOtherIdx; k++) {
                var op = otherPlats[k];
                if (op.isBoth) continue;
                if (curSeen[op.stId]) continue;  // 已经在 curPlats 单向里处理了
                dnOnes.push(op);  // otherPlats 是反方向序列, 这里的单向站都是 otherDir 的
            }
        }

        LOG("  对 [" + bi + "] " + leftStId + "<->" + rightStId +
            " up=" + upOnes.length + " dn=" + dnOnes.length +
            " map=[" + leftKey + "," + rightKey + "]");

        // interleave
        var span = rightKey - leftKey;
        var epsilon = 0.001;
        var combined = [];

        for (var k = 0; k < upOnes.length; k++) {
            var frac = (k + 1) / (upOnes.length + 1);
            var key = leftKey + span * frac;
            combined.push({ frac: frac, key: key, type: "up", plat: upOnes[k] });
        }
        for (var k = 0; k < dnOnes.length; k++) {
            var frac = (k + 1) / (dnOnes.length + 1) + epsilon;
            var key = leftKey + span * frac;
            combined.push({ frac: frac, key: key, type: "dn", plat: dnOnes[k] });
        }

        combined.sort(function(a, b) { return a.frac - b.frac; });

        // 消除 key 重复
        var lastKey = null;
        for (var k = 0; k < combined.length; k++) {
            if (lastKey != null && Math.abs(combined[k].key - lastKey) < 0.01) {
                combined[k].key = lastKey + 0.005;
            }
            lastKey = combined[k].key;
        }

        // 加入 stations
        for (var k = 0; k < combined.length; k++) {
            var item = combined[k];
            var stats = stationStats[item.plat.stId];
            var displayName = item.plat.name;
            if (item.type == "up" && stats && stats.upName) displayName = stats.upName;
            else if (item.type == "dn" && stats && stats.dnName) displayName = stats.dnName;

            stations.push({
                name: extractCjk(displayName),
                raw: displayName,
                stationId: item.plat.stId,
                type: item.type,
                _mapKey: item.key
            });
            LOG("    + " + (item.type == "up" ? "↑上" : "↓下") + " " + displayName +
                " key=" + item.key.toFixed(3));
        }

        // 右双向站
        var rStats = stationStats[rightStId];
        var rName = curPlats[cur_st_pos[rightStId]].name;
        if (curDir == "up" && rStats && rStats.upName) rName = rStats.upName;
        else if (curDir == "dn" && rStats && rStats.dnName) rName = rStats.dnName;
        stations.push({ name: extractCjk(rName), raw: rName, stationId: rightStId, type: "both", _mapKey: rightKey });
    }

    // --- Step 4: 排序 + 首尾强制双向 ---
    stations.sort(function(a, b) { return a._mapKey - b._mapKey; });

    LOG("  === 排序后 (" + stations.length + " 站) ===");
    for (var i = 0; i < stations.length; i++) {
        var t = stations[i].type;
        var mark = (t == "both") ? "●双" : ((t == "up") ? "↑上" : ((t == "dn") ? "↓下" : "○?"));
        LOG("  [" + i + "] key=" + stations[i]._mapKey.toFixed(3) + " " + mark + " " + stations[i].raw);
    }

    if (stations.length > 0 && stations[0].type != "both") {
        LOG("  首站 " + stations[0].raw + " -> 强制 both");
        stations[0].type = "both";
    }
    if (stations.length > 1 && stations[stations.length - 1].type != "both") {
        LOG("  末站 " + stations[stations.length - 1].raw + " -> 强制 both");
        stations[stations.length - 1].type = "both";
    }

    for (var i = 0; i < stations.length; i++) { delete stations[i]._mapKey; }

    LOG("  === FINAL: " + stations.length + " stations ===");
    return stations;
}

