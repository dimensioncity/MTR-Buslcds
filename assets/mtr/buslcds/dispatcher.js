// ============================================================
// 公交车显示系统 —— 统一激活调度器 v2.9
// 车型入口(m7a001.js 等)先设 CONFIG，再 include 此文件
//
// CONFIG 结构:
// {
//   bw: false,         // false=英文站名自动过滤"at"前缀, true=保留原样
//   company:      { name, phone, logo, logoOpacity }  ← 顶层全局, 可选
//   in_xlt:      { enabled, variant:"blue/green/bashi/pudong", pos }
//   in_dianxian: { enabled, variant:"bw/kl", sub:"qs/za/apep/kh/kl/rm/ls/td", pos, right_temperature, colorful }
//   in_headlcd:  { enabled, variant:"bw/kl/klnew/klzy", sub, pos, highspeed, video }
//     BW:   mtr:buslcds/in/headlcd/bw        sub: pd/bs/sh/zdylogo/js/dz/sj/fx/mh/qp/71
//     KL/KLNEW: mtr:buslcds/in/headlcd/kl / klnew (无子)
//     KLZY: mtr:buslcds/in/headlcd/klzy      sub: pd/bs/sh/jinshanlv/sj/jd/jinshanfen/fk/lg/mh/qp/zdylogo/20/65
//   in_sidelcd:  { enabled, variant:"bw/kl/klnew/klzy", sub, pos, leftseat }  // 2面板(左/右)
//     BW:   mtr:buslcds/in/sidelcd/bw        sub: pd/bs/sh/zdylogo/js/dz/fx/mh/qp/71 (⚠无 sj)
//     KLZY: mtr:buslcds/in/sidelcd/klzy      sub: pd/bs/sh/jinshanlv/sj/jd/jinshanfen/fk/lg/mh/qp/zdylogo/20/65
//     KL/KLNEW: mtr:buslcds/in/sidelcd/kl / klnew (无子)
//   in_toplcd:   { enabled, variant:"bw/kl/klnew/klzy", sub, pos, video }  // 2面板, 车顶双面
//     BW:   mtr:buslcds/in/headlcd/bw        ⚠共用 headlcd 路径! 同 headlcd BW sub (有 sj)
//     KL/KLNEW/KLZY 共用 headlcd 路径
//   out_dianxian:{ enabled, variant:"bw/kl", pos, start, english, bashi, color }  // color: orange/red  // 3面板
//   out_gupai:   { enabled, pos }                                            // 3面板,默认激活
//   out_caixian: { enabled, variant:"bw/kl", sub, pos, wheel, yzbt, tpnr }   // 3面板, 合并BW+KL彩屏
//     BW:   mtr:buslcds/out/bw        (无子)
//     KL:   mtr:buslcds/out/kl        sub: 2018/2020a/2020b/2022/2020sj/2020pd
// }
// pos: [[[x,y,z],[x,y,z],[x,y,z],[x,y,z]]] — 单面板四角 3D 坐标
// ============================================================

// ===== 正版验证 =====
// 先 include zhengban.js (只有 uid, 方便用户填写)

// —— 两个开关 (改这里即可) ——
var _ZB_ENABLE = false;     // 总开关: true=启用验证, false=跳过所有验证直接通过
var _ZB_DEBUG  = false;     // debug:   true=打印调试日志, false=静默

include(Resources.id("mtr:buslcds/zhengban.js"));

// 读 uid: 只从 zhengban.js 的 _ZB_UID 读 (车型入口不放 uid, 防破解)
var _UID = "";
if (typeof _ZB_UID !== "undefined") _UID = String(_ZB_UID).trim();

if (_ZB_ENABLE && _UID.length > 0) {
    _dozhengbanVerify(_UID);
} else if (_ZB_ENABLE && _UID.length === 0) {
    // 开了验证但没填 uid → 提示
    print("[zhengban] 正版验证已启用但 zhengban.js 里未填写 _ZB_UID");
}

function _dozhengbanVerify(uid) {
    var _dbg = _ZB_DEBUG;
    if (_dbg) print("[zhengban] 开始验证 uid=" + uid);
    var _DOC_ID = "DT2JjRE5ET1J3eWNJ";
    var _TAB = "k65a9q";
    // 完整 API URL (参考 HTML 里的 preload link, 指定行范围才能拿到单元格数据!)
    var _API = "https://docs.qq.com/dop-api/opendoc?tab=" + _TAB + "&u=&noEscape=1&enableSmartsheetSplit=1&startrow=0&endrow=60&needSheetState=1&sliceStates=1&block_end_col=31&block_end_row=255&id=" + _DOC_ID + "&outformat=1&normal=1";
    var _REF = "https://docs.qq.com/sheet/" + _DOC_ID + "?tab=" + _TAB;
    var _TO = 8000;
    var _netOk = false;
    var _respText = null;

    try {
        var _c = new java.net.URL(_API).openConnection();
        _c.setConnectTimeout(_TO); _c.setReadTimeout(_TO);
        _c.setRequestMethod("GET");
        _c.setRequestProperty("User-Agent","Mozilla/5.0");
        _c.setRequestProperty("Referer", _REF);
        _c.setRequestProperty("Accept","*/*");
        _c.setInstanceFollowRedirects(true);
        if (_dbg) print("[zhengban] HTTP GET " + _API);
        var _code = _c.getResponseCode();
        if (_dbg) print("[zhengban] HTTP " + _code);
        if (_code >= 200 && _code < 300) {
            var _r = new java.io.BufferedReader(new java.io.InputStreamReader(_c.getInputStream(), "UTF-8"));
            var _lines = []; var _ln;
            while ((_ln = _r.readLine()) !== null) _lines.push(String(_ln));
            _r.close();
            _respText = _lines.join("\n");
            if (_dbg) print("[zhengban] API 响应 " + _respText.length + " 字节");
            _netOk = true;
        }
        _c.disconnect();
    } catch (_ex1) { if (_dbg) print("[zhengban] HTTP 异常: " + _ex1); }

    // ===== 网络成功 → 在线验证 =====
    if (_netOk && _respText !== null) {
        var _sheetBin = _extractSheetFromApi(_respText, _dbg);
        if (_sheetBin === null) {
            if (_dbg) print("[zhengban] 无法从 API 响应提取表格数据, 先走离线 fallback");
        } else {
            // _sheetBin 是 JS 字符串, 每个 char 是一个原始字节 → 直接 indexOf 搜 ASCII
            var _uidPos = _sheetBin.indexOf(String(uid));
            // 前导零可能被吞
            if (_uidPos < 0) {
                var _trimUid = String(uid).replace(/^0+/, "");
                if (_trimUid.length > 0 && _trimUid !== String(uid)) {
                    _uidPos = _sheetBin.indexOf(_trimUid);
                }
            }
            if (_dbg) print("[zhengban] uid pos=" + _uidPos + " (bin len=" + _sheetBin.length + ")");

            if (_uidPos < 0) {
                throw new Error("err2: 未能找到订单号, 请核对。解决方法：1.重启Minecraft。2.检查是否入群填写激活搜集表，或检查订单号是否填错。3.检查mtr:buslcds文件夹中是否包含zhengban.js（且必须在该文件内正确的输入订单号）。作者邮箱3869764371@qq.com。");
            }

            // 搜 uid 附近的 E 列硬编码值 (带引号结束, 区别于公式里的 err1 字面量)
            // 公式: ="T","err1",IF(   ← err1 后面是 ",I
            // E列值: err1"            ← err1 后面是 " (硬编码值)
            var _errKeys = ["err1\"", "err2\"", "err3\"", "err4\""];
            var _p1 = _uidPos - 200; if (_p1 < 0) _p1 = 0;
            var _p2 = _uidPos + 200;
            var _hitErr = null;
            for (var ek = 0; ek < _errKeys.length; ek++) {
                if (_sheetBin.indexOf(_errKeys[ek], _p1) >= 0 &&
                    _sheetBin.indexOf(_errKeys[ek], _p1) < _p2) {
                    _hitErr = _errKeys[ek].replace('"', '');
                    break;
                }
            }
            if (_dbg) print("[zhengban] E列硬编码值: " + (_hitErr || "(无)"));

            if (_hitErr !== null) {
                // 有明确的错误标记
                switch (_hitErr) {
                    case "err1": throw new Error("err1: \n该订单号因违规传播而被强制注销, 其相关主要传播者的购买资格已被永久冻结, 请购买正版。\n现阶段作者正在严打传播资源包（包括激活文件等）违规行为，发现一起，查处一起，绝不姑息！\n作者不处理因注销而造成的任何报错。\n作者邮箱：3869764371@qq.com");
                    case "err2": throw new Error("err2: \n未能找到订单号, 请核对。\n解决方法：\n1.重启Minecraft。\n2.检查是否入群填写激活收集表，或检查订单号是否填错。\n3.检查mtr:buslcds文件夹中是否包含zhengban.js。\n作者邮箱：3869764371@qq.com");
                    case "err3": throw new Error("err3: \n该订单号因购买者自愿注销而停止使用, 请购买正版。\n作者不处理因注销而造成的任何报错。\n作者邮箱：3869764371@qq.com");
                    case "err4": throw new Error("err4: \n该订单号因发现被盗而暂停使用, 请购买正版。\n现阶段作者正在严打传播资源包（包括激活文件等）违规行为，发现一起，查处一起，绝不姑息！\n该报错若找到盗取的当事人，可通过联系作者处理，但若造成传播影响将强制注销该订单号，失主可免费申请重新生成专门的订单号。\n作者不处理因注销而造成的任何报错。\n作者邮箱：3869764371@qq.com");
                }
            }

            // 没有硬编码 err 值 → 视为正常
            if (_dbg) print("[zhengban] ✅ 在线验证通过 (uid 存在, E列无错误标记)");
            return;
        }
    }

// ===== 网络失败 → 离线 fallback =====
    if (_dbg) print("[zhengban] 网络不可用或数据提取失败, 尝试离线验证 lixianbao.xlsm...");
    var _hitOffline = _doOfflineVerify(uid, _dbg);
    if (_hitOffline === true) {
        if (_dbg) print("[zhengban] ✅ 离线验证通过");
        return;
    } else if (_hitOffline === false) {
        // 文件存在但没找到 uid → err2
        throw new Error("err2: \n未能找到订单号, 请核对。\n解决方法：\n1.重启Minecraft。\n2.检查是否入群填写激活收集表，或检查订单号是否填错。\n3.检查mtr:buslcds文件夹中是否包含zhengban.js。\n作者邮箱：3869764371@qq.com");
    } else {
        // 没有文件 → err5
        throw new Error("err5: \n正版验证网络请求失败, 且未找到离线验证文件。\n解决方法：\n1.请尝试检查网络（WLAN/网线/网卡），或重启设备。\n2.联系作者获取离线验证文件 lixianbao.xlsm，通过可移动设备拷贝至当前设备Minecraft的资源包文件夹。\n现阶段作者正在严打传播资源包（包括激活文件等）违规行为，发现一起，查处一起，绝不姑息！\n作者邮箱：3869764371@qq.com");
    }
}

// ===== 工具: Base64 解码 → gzip 解压 → 二进制字符串 =====
function _base64Decode(b64, dbg) {
    var _bytes = null;
    try {
        var _b64Cls = java.lang.Class.forName("java.util.Base64");
        var _decoder = _b64Cls.getMethod("getDecoder", null).invoke(null, null);
        _bytes = _decoder.decode(String(b64));
    } catch (_e) {
        try {
            var _dec2 = new sun.misc.BASE64Decoder();
            _bytes = _dec2.decodeBuffer(String(b64));
        } catch (_e2) { return null; }
    }
    if (dbg) print("[zhengban] Base64 OK, " + _bytes.length + " bytes");

    // 检查压缩格式
    // gzip: 1F 8B
    // zlib: 78 9C / 78 DA / 78 01
    if (_bytes.length >= 2) {
        var _b0 = _bytes[0] & 0xFF;
        var _b1 = _bytes[1] & 0xFF;
        if (_b0 === 0x1F && _b1 === 0x8B) {
            if (dbg) print("[zhengban] 检测到 gzip, 解压...");
            try {
                var _gis = new java.util.zip.GZIPInputStream(new java.io.ByteArrayInputStream(_bytes));
                var _baos = new java.io.ByteArrayOutputStream();
                var _buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
                var _n;
                while ((_n = _gis.read(_buf)) > 0) _baos.write(_buf, 0, _n);
                _gis.close();
                _bytes = _baos.toByteArray();
                if (dbg) print("[zhengban] gzip 解压后: " + _bytes.length + " bytes");
            } catch (_gzErr) { if (dbg) print("[zhengban] gzip 解压失败: " + _gzErr); }
        } else if (_b0 === 0x78 && (_b1 === 0x9C || _b1 === 0xDA || _b1 === 0x01)) {
            if (dbg) print("[zhengban] 检测到 zlib (" + _b0.toString(16) + " " + _b1.toString(16) + "), 解压...");
            try {
                var _zis = new java.util.zip.InflaterInputStream(new java.io.ByteArrayInputStream(_bytes));
                var _baos2 = new java.io.ByteArrayOutputStream();
                var _buf2 = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
                while ((_n = _zis.read(_buf2)) > 0) _baos2.write(_buf2, 0, _n);
                _zis.close();
                _bytes = _baos2.toByteArray();
                if (dbg) print("[zhengban] zlib 解压后: " + _bytes.length + " bytes");
            } catch (_zlErr) { if (dbg) print("[zhengban] zlib 解压失败: " + _zlErr); }
        } else {
            if (dbg) print("[zhengban] 无压缩 magic (" + _b0.toString(16) + " " + _b1.toString(16) + ")");
        }
    }

    // byte[] → JS 二进制字符串 (每个 byte = 一个 charCode)
    var _chars = [];
    for (var i = 0; i < _bytes.length; i++) {
        _chars.push(String.fromCharCode(_bytes[i] & 0xFF));
    }
    return _chars.join("");
}

// ===== 工具: 从 opendoc JSON 提取最大 base64 字段 (真正的表格数据!) =====
function _extractSheetFromApi(jsonText, dbg) {
    if (!jsonText) return null;

    // 找出所有 JSON 字符串字段 + 长度, 挑最大的 base64 (那就是单元格数据)
    var _fields = [];
    var _searchFrom = 0;
    while (true) {
        // 找 key
        var _kq = jsonText.indexOf('"', _searchFrom);
        if (_kq < 0) break;
        var _ke = jsonText.indexOf('"', _kq + 1);
        if (_ke < 0) break;
        var _key = jsonText.substring(_kq + 1, _ke);
        // 找 value (冒号后)
        var _colon = jsonText.indexOf(':', _ke + 1);
        if (_colon < 0) break;
        var _vq = jsonText.indexOf('"', _colon);
        if (_vq < 0) { _searchFrom = _colon + 1; continue; }
        // 找 value 结束 (处理转义)
        var _ve = _vq + 1;
        while (_ve < jsonText.length) {
            if (jsonText.charAt(_ve) === '"') {
                var _bc = 0;
                for (var _xi = _ve - 1; _xi > _vq && jsonText.charAt(_xi) === '\\'; _xi--) _bc++;
                if (_bc % 2 === 0) break;
            }
            _ve++;
        }
        var _vlen = _ve - _vq - 1;
        // 只存长值 (>100字符, 看起来像 base64)
        if (_vlen > 100 && _key.match(/[a-zA-Z]/)) {
            _fields.push({key: _key, len: _vlen, start: _vq + 1});
        }
        _searchFrom = _ve + 1;
    }

    if (dbg) {
        print("[zhengban] 找到 " + _fields.length + " 个长字符串字段:");
        _fields.sort(function(a, b) { return b.len - a.len; });
        for (var i = 0; i < Math.min(_fields.length, 10); i++) {
            print("[zhengban]   [" + i + "] " + _fields[i].key + " = " + _fields[i].len + " bytes");
        }
    }

    if (_fields.length === 0) return null;

    // 选最长的字段 (related_sheet 通常比 workbook 大得多, 含实际单元格数据)
    var _target = null;
    for (var ti = 0; ti < _fields.length; ti++) {
        if (!_target || _fields[ti].len > _target.len) _target = _fields[ti];
    }

    var _b64 = jsonText.substring(_target.start, _target.start + _target.len);
    // 清理 JSON 转义
    while (_b64.indexOf('\\"') >= 0) _b64 = _b64.replace('\\"', '"');
    while (_b64.indexOf('\\/') >= 0) _b64 = _b64.replace('\\/', '/');
    // 清理 base64 (去掉非 base64 字符, Rhino 正则 /g 有 bug, 用 while + indexOf)
    var _cleanB64 = "";
    for (var ci = 0; ci < _b64.length; ci++) {
        var _c = _b64.charAt(ci);
        if (_c.match(/[A-Za-z0-9+/=]/)) _cleanB64 += _c;
    }
    _b64 = _cleanB64;
    if (dbg) print("[zhengban] 选用字段: " + _target.key + " base64 len=" + _b64.length + " 前10: " + _b64.substring(0, 10));
    return _base64Decode(_b64, dbg);
}

// 返回值: true=通过, false=文件存在但没匹配, null=文件不存在/读失败
function _doOfflineVerify(uid, dbg) {
    var _fname = "lixianbao.xlsm";
    var _bytes = null;
    try {
        // 从文件系统找 (jar 资源 API 不可用)
        var _sep = java.io.File.separator;
        var _searchPaths = [
            java.lang.System.getProperty("user.dir") + _sep + _fname,
            java.lang.System.getProperty("java.io.tmpdir") + _sep + _fname,
            "." + _sep + _fname
        ];
        for (var si = 0; si < _searchPaths.length && _bytes === null; si++) {
            try {
                var _f = new java.io.File(_searchPaths[si]);
                if (_f.exists() && _f.isFile()) {
                    var _fis = new java.io.FileInputStream(_f);
                    var _baos = new java.io.ByteArrayOutputStream();
                    var _bf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
                    var _bn;
                    while ((_bn = _fis.read(_bf)) > 0) _baos.write(_bf, 0, _bn);
                    _fis.close();
                    _bytes = _baos.toByteArray();
                    if (dbg) print("[zhengban] 找到 xlsm: " + _f.getAbsolutePath() + " (" + _bytes.length + " bytes)");
                }
            } catch (_eFS) { if (dbg) print("[zhengban] fs try " + _searchPaths[si] + " fail: " + _eFS); }
        }

        if (_bytes === null) {
            if (dbg) print("[zhengban] xlsm 不存在");
            return null;
        }

        // 用 ZipInputStream 解压所有文本 entry, 用 JS 数组拼
        var _allLines = [];
        var _zis = new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(_bytes));
        var _zentry;
        while ((_zentry = _zis.getNextEntry()) !== null) {
            if (!_zentry.isDirectory()) {
                try {
                    var _r2 = new java.io.BufferedReader(new java.io.InputStreamReader(_zis, "UTF-8"));
                    var _l2;
                    while ((_l2 = _r2.readLine()) !== null) {
                        _allLines.push(String(_l2));
                    }
                } catch (_e5) { /* 二进制 entry 跳过 */ }
            }
        }
        _zis.close();
        var _offlineText = _allLines.join("\n");
        if (dbg) print("[zhengban] xlsm 解压文本长度: " + _offlineText.length);

        var _idx = _offlineText.indexOf(String(uid));
        if (dbg) print("[zhengban] offline uid pos=" + _idx);
        return (_idx >= 0);

    } catch (_eMain) {
        if (dbg) print("[zhengban] 离线验证异常: " + _eMain);
        return null;
    }
}

include(Resources.id("mtrsteamloco:scripts/display_helper.js"));

// [MTR] info-log master switch (false=silent, errors always printed)
// 车型入口 CONFIG.debug=true 时开启所有日志
var _MTR_LOG = (typeof CONFIG !== "undefined" && CONFIG && CONFIG.debug === true);

// ---------- 全局公司信息 ----------
var COMPANY_NAME = "";
var COMPANY_PHONE = "";
var COMPANY_LOGO = "";
var COMPANY_LOGO_OPACITY = 1.0;
if (CONFIG && CONFIG.company) {
  var _c = CONFIG.company;
  if (_c.name !== undefined)   COMPANY_NAME = String(_c.name);
  if (_c.logo !== undefined)   COMPANY_LOGO = String(_c.logo);
  if (_c.logoOpacity !== undefined) COMPANY_LOGO_OPACITY = Number(_c.logoOpacity);
  if (_c.phone !== undefined) COMPANY_PHONE = String(_c.phone);
  if (_MTR_LOG) print("[MTR] company=" + COMPANY_NAME + (COMPANY_PHONE ? ", phone=" + COMPANY_PHONE : "") + ", logo=" + COMPANY_LOGO + (COMPANY_LOGO_OPACITY !== 1.0 ? ", opacity=" + COMPANY_LOGO_OPACITY : ""));
}

// ---------- 模块注册表 ----------
var MODULES = {};

// ============ 车内线路图 (通用接口) ============
// doIncludes 直接加载 variant 目录下的 formatting.js / route-map.js
// 这些文件会定义 DrawRouteMap 全局函数; dispatcher 统一负责 DisplayHelper + 生命周期
MODULES.in_xlt = {
  defaultEnabled: true,
  doIncludes: function(cfg) {
    var v = (cfg && cfg.variant) ? String(cfg.variant) : "blue";
    var base = "mtr:buslcds/in/xlt/" + v;
    include(Resources.id(base + "/formatting.js"));
    include(Resources.id(base + "/route-map.js"));
    if (_MTR_LOG) print("[MTR] in_xlt variant=" + v + " (formatting + route-map) loaded");
  },
  buildConfig: function(cfg) {
    var DEFAULT_POS = [[[-0.7475,1.9255,0.5469],[-0.8192,1.8231,0.5469],[-0.8192,1.8231,-0.0156],[-0.7475,1.9255,-0.0156]]];
    var pos = (cfg && cfg.pos) ? cfg.pos : DEFAULT_POS;
    return {
      version: 1,
      texSize: [2000, 400],
      slots: [{ name: "route-map", texArea: [0,0,2000,400], pos: pos, offsets: [[0,0,0]] }]
    };
  },
  renderOne: function(displays, train, rp, ap, state) {
    if (typeof DrawRouteMap === 'function') {
      DrawRouteMap(displays.graphicsFor("route-map"), state || null, train, rp, ap);
      displays.upload();
    } else {
      try {
        var g = displays.graphicsFor("route-map");
        g.setColor(java.awt.Color.WHITE);
        g.fillRect(0, 0, 2000, 400);
        displays.upload();
      } catch(e) { print("[MTR] in_xlt render err: " + e); }
    }
  }
};

// ============ 车外固牌 (已实现) ============
MODULES.out_gupai = {
  defaultEnabled: true,
  doIncludes: function(cfg) {
    include(Resources.id("mtr:buslcds/out/gupai/bus-signs/formatting.js"));
    include(Resources.id("mtr:buslcds/out/gupai/bus-signs/draw.js"));
    if (_MTR_LOG) print("[MTR] out_gupai loaded");
  },
  buildConfig: function(cfg) {
    var DEFAULT_POS = [
      [[[-1.1532,1.6875,-0.2672],[-1.1532,1.5000,-0.2672],[-1.1532,1.5000,0.7953],[-1.1532,1.6875,0.7953]]],
      [[[0.8438,1.6875,-3.4485],[0.8438,1.4375,-3.4485],[-0.8438,1.4375,-3.4485],[-0.8438,1.6875,-3.4485]]],
      [[[-0.7813,1.6305,3.5609],[-0.7813,1.3827,3.5935],[0.7813,1.3827,3.5935],[0.7813,1.6305,3.5609]]]
    ];
    var pos = (cfg && cfg.pos) ? cfg.pos : DEFAULT_POS;
    return {
      version: 1,
      texSize: [2400, 2100],
      slots: [
        { name: "side-sign", texArea: [0,0,2400,900],   pos: pos[0], offsets: [[0,0,0]] },
        { name: "tail-sign", texArea: [0,900,2000,600],  pos: pos[1], offsets: [[0,0,0]] },
        { name: "head-sign", texArea: [0,1500,2400,600], pos: pos[2], offsets: [[0,0,0]] }
      ]
    };
  },
  renderOne: function(displays, train, rp, ap) {
    DrawSideSign(displays.graphicsFor("side-sign"), rp, train, ap);
    displays.upload();
    DrawTailSign(displays.graphicsFor("tail-sign"), rp, ap);
    displays.upload();
    DrawHeadSign(displays.graphicsFor("head-sign"), rp, ap);
    displays.upload();
  }
}


;

// ============ 空壳模块: 预留接口, 暂不渲染 ============
function makeStubModule(id, basePath, count) {
  return {
    defaultEnabled: false,
    doIncludes: function(cfg) {
      try {
        var v = (cfg && cfg.variant) ? String(cfg.variant) : "default";
        var sub = (cfg && cfg.sub) ? String(cfg.sub) : "";
        var parts = [];
        if (sub) parts.push("sub=" + sub);
        if (cfg && cfg.right_temperature) parts.push("right_temp=on");
        if (cfg && cfg.colorful)             parts.push("colorful=on");
        if (cfg && cfg.highspeed)          parts.push("highspeed=on(BW only)");
        if (cfg && cfg.video)              parts.push("video=on");
        if (cfg && cfg.leftseat)           parts.push("leftseat=on");
        if (cfg && cfg.start)              parts.push("start=on");
        if (cfg && cfg.english)            parts.push("english=on");
        if (cfg && cfg.bashi)              parts.push("bashi=on");
        if (cfg && cfg.color)            parts.push("color=" + cfg.color);
        if (cfg && cfg.wheel)              parts.push("wheel=on");
        if (cfg && cfg.yzbt)               parts.push("yzbt=on");
        if (cfg && cfg.tpnr)               parts.push("tpnr=on");
        var fullPath = basePath + "/" + v;
        if (_MTR_LOG) print("[MTR] " + id + " loading variant=" + v + (parts.length ? ", " + parts.join(", ") : "") + ", path=" + fullPath);
        // Actually include the variant main.js!
        include(Resources.id(fullPath + "/main.js"));
        // If variant exposed MODULE_IMPL, use it to override buildConfig/renderOne
        if (typeof MODULE_IMPL !== 'undefined' && MODULE_IMPL) {
          if (MODULE_IMPL.buildConfig) this.buildConfig = MODULE_IMPL.buildConfig;
          if (MODULE_IMPL.renderOne)   this.renderOne   = MODULE_IMPL.renderOne;
          if (_MTR_LOG) print("[MTR] " + id + " variant impl loaded OK");
        } else {
          if (_MTR_LOG) print("[MTR] " + id + " no MODULE_IMPL, using stub");
        }
      } catch(e) { print("[MTR] " + id + " include err: " + e); }
    },
    buildConfig: function(cfg) {
      var pos = (cfg && cfg.pos) ? cfg.pos : [];
      var slots = [];
      for (var i = 0; i < count; i++) {
        var sp = (pos.length > i) ? pos[i] : [[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]];
        slots.push({ name: id + "-" + i, texArea: [0,0,100,100], pos: sp, offsets: [[0,0,0]] });
      }
      return { version: 1, texSize: [2000, 400], slots: slots };
    },
    renderOne: function(displays, train, rp, ap) {
      try {
        var slots = displays.gen.config.slots;
        for (var i = 0; i < slots.length; i++) {
          var g = displays.graphicsFor(slots[i].name);
          g.setColor(java.awt.Color.WHITE);
          g.fillRect(0, 0, 2000, 400);
        }
        displays.upload();
      } catch(e) {}
    }
  };
}

// 车内
MODULES.in_dianxian = {
  defaultEnabled: false,
  doIncludes: function(cfg) {
    var v = (cfg && cfg.variant) ? String(cfg.variant) : "bw";
    var sub = (cfg && cfg.sub) ? String(cfg.sub) : "qs";
    var base = "mtr:buslcds/in/dianxian/" + v;
    include(Resources.id(base + "/main.js"));
    // 关键: 立即快照当前 variant 的 MODULE_IMPL, 避免被后续车辆 include 覆盖
    this._impl = (typeof MODULE_IMPL !== "undefined") ? MODULE_IMPL : null;
    if (_MTR_LOG) print("[MTR] in_dianxian variant=" + v + " sub=" + sub + " impl=" + (this._impl ? "OK" : "null"));
  },
  buildConfig: function(cfg) {
    if (this._impl && this._impl.buildConfig) return this._impl.buildConfig(cfg);
    var pos = (cfg && cfg.pos) ? cfg.pos : [];
    var sp = (pos.length > 0) ? pos : [[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]];
    return { version: 1, texSize: [1200, 200], slots: [{ name: "in-dianxian", texArea: [0,0,1200,200], pos: sp, offsets: [[0,0,0]] }] };
  },
  renderOne: function(displays, train, rp, ap) {
    if (this._impl && this._impl.renderOne) this._impl.renderOne(displays, train, rp, ap);
  }
};
MODULES.in_headlcd  = makeStubModule("in_headlcd",  "mtr:buslcds/in/headlcd",  1);
MODULES.in_sidelcd  = makeStubModule("in_sidelcd",  "mtr:buslcds/in/sidelcd",  2);
MODULES.in_toplcd   = makeStubModule("in_toplcd",   "mtr:buslcds/in/headlcd",  2);  // ⚠共用 headlcd 路径!
// 车外
MODULES.out_dianxian = {
  defaultEnabled: false,
  doIncludes: function(cfg) {
    var v = (cfg && cfg.variant) ? String(cfg.variant) : "bw";
    var base = "mtr:buslcds/out/dianxian/" + v;
    include(Resources.id(base + "/main.js"));
    if (_MTR_LOG) print("[MTR] out_dianxian variant=" + v);
  },
  buildConfig: function(cfg) {
    if (typeof MODULE_IMPL !== "undefined" && MODULE_IMPL.buildConfig) return MODULE_IMPL.buildConfig(cfg);
    var pos = (cfg && cfg.pos) ? cfg.pos : [];
    var roles = ["front", "", "tail"];
    var slots = [];
    for (var i = 0; i < 3; i++) {
      var sp = (pos.length > i) ? pos[i] : [[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]];
      slots.push({ name: "out-dianxian-" + i, texArea: [0, i*200, 1600, 200], pos: sp, offsets: [[0,0,0]], width: 1600, height: 200, role: roles[i] });
    }
    return { version: 1, texSize: [1600, 600], slots: slots };
  },
  renderOne: function(displays, train, rp, ap) {
    if (typeof MODULE_IMPL !== "undefined" && MODULE_IMPL.renderOne) MODULE_IMPL.renderOne(displays, train, rp, ap);
  }
};
MODULES.out_bw        = makeStubModule("out_bw",        "mtr:buslcds/out/bw",       3);
MODULES.out_kl        = makeStubModule("out_kl",        "mtr:buslcds/out/kl",       3);
MODULES.out_caixian  = makeStubModule("out_caixian",  "mtr:buslcds/out",          3);

// ---------- 激活模块 ----------
// 注意: 所有闭包变量必须用 IIFE 绑定到每次迭代的值, 否则 for+var 作用域陷阱会导致所有 closure 共享最后一次迭代的值
var ACTIVE = [];
var _keys = Object.keys(MODULES);
for (var i = 0; i < _keys.length; i++) {
  (function() {
    var mid = _keys[i];
    var mod = MODULES[mid];
    var cfg = (CONFIG && CONFIG[mid]) ? CONFIG[mid] : null;
    var enabled = mod.defaultEnabled;
    if (cfg && cfg.enabled === false) enabled = false;
    if (cfg && cfg.enabled === true)  enabled = true;
    if (!enabled) return;  // IIFE 内 continue → return

    try { mod.doIncludes(cfg); } catch(e) { print("[MTR] " + mid + " include err: " + e); return; }

    // doIncludes 后: 此时全局 MODULE_IMPL 应该是当前 variant 的
    var _miNow = (typeof MODULE_IMPL !== "undefined") ? MODULE_IMPL : null;
    var _currentImpl = _miNow;

    var activeRender = mod.renderOne;  // in_xlt/out_gupai 有自己的 renderOne
    var activeBuildConfig = mod.buildConfig;
    if (_currentImpl) {
      // IIFE 内 _snapshot 是局部, 闭包安全
      var _snapshot = _currentImpl;
      if (_snapshot.buildConfig) activeBuildConfig = function(c) { return _snapshot.buildConfig(c); };
      if (_snapshot.renderOne) {
        var _origRenderOne = _snapshot.renderOne;
        activeRender = function(displays, train, rp, ap, unused) {
          return _origRenderOne(displays, train, rp, ap);
        };
      }
    }

  var genCfg = activeBuildConfig(cfg);
  var gen = null;
  try { gen = new DisplayHelper(genCfg); } catch(e) { print("[MTR] " + mid + " DisplayHelper err: " + e); return; }

  ACTIVE.push({
    id: mid,
    gen: gen,
    genCfg: genCfg,
    renderOne: activeRender
  });
  if (_MTR_LOG) print("[MTR] +" + mid);
  })();  // end IIFE
}
if (_MTR_LOG) print("[MTR] dispatcher OK, active: " + ACTIVE.length);

// ---------- 辅助函数 ----------
var _cachedRp = null;
var _cachedAp = null;

function getRpSize(rp) {
  if (rp == null) return 0;
  try { if (typeof rp.size === 'function') return rp.size(); } catch(e) {}
  try { if (typeof rp.length === 'number') return rp.length; } catch(e) {}
  return 0;
}
function copyList(src) {
  if (src == null) return null;
  var sz = getRpSize(src);
  if (sz == 0) return null;
  var dst = new java.util.ArrayList();
  try {
    if (typeof src.get === 'function') {
      for (var i = 0; i < sz; i++) dst.add(src.get(i));
    } else if (typeof src.iterator === 'function') {
      var it = src.iterator();
      while (it.hasNext()) dst.add(it.next());
    }
  } catch(e) {}
  return dst;
}
function drawIdle(displays, id) {
  try {
    var slots = displays.gen.config.slots;
    for (var i = 0; i < slots.length; i++) {
      var g = displays.graphicsFor(slots[i].name);
      g.setColor(java.awt.Color.WHITE);
      g.fillRect(0, 0, 2000, 400);
    }
    displays.upload();
  } catch(e) {}
}

// ---------- 生命周期 ----------
function create(ctx, state, train) {
  state.refreshRate = new RateLimit(0.1);
  state.modules = [];
  for (var i = 0; i < ACTIVE.length; i++) {
    ACTIVE[i].displays = ACTIVE[i].gen.create();
    state.modules.push(ACTIVE[i]);
  }
}
function render(ctx, state, train) {
  if (state.refreshRate.shouldUpdate()) {
    var rp = train.getThisRoutePlatforms();
    var rpSize = getRpSize(rp);
    var ap = null;
    try { ap = train.getAllPlatforms(); } catch(e) {}
    var apSize = getRpSize(ap);

    if (rp != null && rpSize > 0) {
      _cachedRp = copyList(rp);
      rp = _cachedRp;
    } else if (_cachedRp != null && getRpSize(_cachedRp) > 0) {
      rp = _cachedRp;
    }
    if (ap != null && apSize > 0) { _cachedAp = copyList(ap); ap = _cachedAp; }
    else if (_cachedAp != null) { ap = _cachedAp; }

    var isEmpty = (rp == null || getRpSize(rp) == 0);
    for (var i = 0; i < state.modules.length; i++) {
      try {
        if (isEmpty) drawIdle(state.modules[i].displays, state.modules[i].id);
        else {
          var _m = state.modules[i];
          if (_m.id === 'in_xlt' || _m.id === 'out_gupai') {
            _m.renderOne(_m.displays, train, rp, ap, state);
          } else {
            _m.renderOne(_m.displays, train, rp, null);
          }
        }
      } catch (e) {
        print("[MTR] render " + state.modules[i].id + " err: " + e);
      }
    }
  }
  for (var i = 0; i < train.trainCars(); i++) {
    for (var j = 0; j < state.modules.length; j++) {
      try { ctx.drawCarModel(state.modules[j].displays.model, i, null); } catch(e) {}
    }
  }
}
function dispose(ctx, state, train) {
  for (var i = 0; i < state.modules.length; i++) {
    try { state.modules[i].displays.close(); } catch(e) {}
  }
}
