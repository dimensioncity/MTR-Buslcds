// MTR模组三块路牌统一绘制函数 v2.0
// 2026 仙芳佳全域通达铁路、乐文彩雨 版权所有
// 使用时请遵守MIT开源协议
// 导入Java资源
importPackage(java.awt);
importPackage(java.awt.geom);
importPackage(java.util);

/* —— 画板尺寸常量 —— */
var SIDE_W = 2400, SIDE_H = 900;   // 车外（侧身）路牌
var TAIL_W = 2000, TAIL_H = 600;   // 车尾路牌
var HEAD_W = 2400, HEAD_H = 600;   // 车头路牌

/* ============================================================
 *  面板1：车外（侧身）路牌
 *  布局：雪花 + 路线名（上），起点站 + 双向箭头 + 终点站（下）
 * ============================================================ */
function DrawSideSign(g, routePlats, train, allPlats) {

    GLOG("========== DrawSideSign START ==========");
    GLOG("  routePlats.size() = " + (routePlats != null ? routePlats.size() : "null"));
    if (routePlats != null && routePlats.size() > 0) {
        GLOG("  routePlats 全部站名:");
        for (var di = 0; di < routePlats.size(); di++) {
            GLOG("    rp[" + di + "] = " + gupai_platName(routePlats.get(di)));
        }
    }

    var textColor = getDayNightColor();

    // 涂黑
    g.setColor(BG_COLOR);
    g.fillRect(0, 0, SIDE_W, SIDE_H);

    // 路线未加载：居中显示"机  动  车"
    if (routePlats == null || routePlats.size() == 0) {
        g.setColor(textColor);
        g.setFont(CN_FONT.deriveFont(Font.BOLD, 240));
        CentreText(g, "机  动  车", SIDE_W / 2, SIDE_H / 2 + 80, SIDE_W - 200);
        return;
    }

    // 获取路线名（官方API + 兜底链）
    var routeNum = getRouteName(routePlats);

    // 获取固定起终点站（不因上下行翻转），只取纯中文
    var startStation = "";
    var endStation = "";
    var terminals = getFixedTerminals(train, null, routePlats, allPlats);
    if (terminals != null) {
        startStation = extractCjk(terminals.start);
        endStation = extractCjk(terminals.end);
    } else if (routePlats != null && routePlats.size() > 0) {
        startStation = extractCjk(routePlats.get(0).station.name);
        var lastPlat = routePlats.get(routePlats.size() - 1);
        endStation = extractCjk((lastPlat.destinationStation != null)
            ? lastPlat.destinationStation.name
            : lastPlat.station.name);
    }

    g.setColor(textColor);

    /* —— 上半部：雪花 + 路线名，整体居中横向排列 —— */
    var snowflakeSize = 140;
    var fontSide = EN_FONT.deriveFont(Font.BOLD, 260);
    g.setFont(fontSide);
    var routeWidth = MeasureMixedTextWidth(g, routeNum, fontSide);
    var gap = 80;
    var totalTopWidth = snowflakeSize + gap + routeWidth;

    var topY = 280;  // 雪花中心Y
    var snowflakeCx = (SIDE_W - totalTopWidth) / 2 + snowflakeSize / 2;
    DrawSnowflake(g, snowflakeCx, topY, snowflakeSize);

    var textCenterX = snowflakeCx + snowflakeSize / 2 + gap + routeWidth / 2;
    DrawMixedText(g, routeNum, textCenterX, topY + 85, SIDE_W - 200);

    /* —— 下半部：起点站 + 双向箭头 + 终点站 —— */
    var arrowCenterX = SIDE_W / 2;
    var arrowY = 680;
    var arrowHalfLen = 180;
    var arrowThickness = 14;
    DrawBidirectionalArrow(g, arrowCenterX - arrowHalfLen, arrowCenterX + arrowHalfLen, arrowY, arrowThickness);

    g.setFont(CN_FONT.deriveFont(Font.BOLD, 280));
    var startX = (arrowCenterX - arrowHalfLen) / 2;
    CentreText(g, startStation, startX, arrowY + 90, arrowCenterX - arrowHalfLen - 40);

    var endX = arrowCenterX + arrowHalfLen + (SIDE_W - arrowCenterX - arrowHalfLen) / 2;
    CentreText(g, endStation, endX, arrowY + 90, SIDE_W - (arrowCenterX + arrowHalfLen) - 40);
}


/* ============================================================
 *  面板2：车尾路牌
 *  布局：雪花 + 路线名，整体居中横向排列
 * ============================================================ */
function DrawTailSign(g, routePlats, allPlats) {

    var textColor = getDayNightColor();

    g.setColor(BG_COLOR);
    g.fillRect(0, 0, TAIL_W, TAIL_H);

    // 路线未加载：居中显示"机  动  车"
    if (routePlats == null || routePlats.size() == 0) {
        g.setColor(textColor);
        g.setFont(CN_FONT.deriveFont(Font.BOLD, 220));
        CentreText(g, "机  动  车", TAIL_W / 2, TAIL_H / 2 + 75, TAIL_W - 100);
        return;
    }

    var routeNum = getRouteName(routePlats);

    g.setColor(textColor);

    // 计算雪花 + 路线名总宽度（中英混排）
    var snowSize = 140;
    var fontTail = EN_FONT.deriveFont(Font.BOLD, 240);
    g.setFont(fontTail);
    var routeWidth = MeasureMixedTextWidth(g, routeNum, fontTail);
    var gap = 80;
    var totalWidth = snowSize + gap + routeWidth;

    var snowCx = (TAIL_W - totalWidth) / 2 + snowSize / 2;
    var snowCy = TAIL_H / 2;
    DrawSnowflake(g, snowCx, snowCy, snowSize);

    var textCenterX = snowCx + snowSize / 2 + gap + routeWidth / 2;
    DrawMixedText(g, routeNum, textCenterX, snowCy + 80, TAIL_W - 100);
}


/* ============================================================
 *  面板3：车头路牌
 *  布局：雪花 + "空调" + 路线名，整体居中横向排列
 * ============================================================ */
function DrawHeadSign(g, routePlats, allPlats) {

    var textColor = getDayNightColor();

    g.setColor(BG_COLOR);
    g.fillRect(0, 0, HEAD_W, HEAD_H);

    // 路线未加载：居中显示"机  动  车"
    if (routePlats == null || routePlats.size() == 0) {
        g.setColor(textColor);
        g.setFont(CN_FONT.deriveFont(Font.BOLD, 220));
        CentreText(g, "机  动  车", HEAD_W / 2, HEAD_H / 2 + 75, HEAD_W - 100);
        return;
    }

    var routeNum = getRouteName(routePlats);

    g.setColor(textColor);

    var snowSize = 140;

    var airConText = "空调";
    var headFontCn = CN_FONT.deriveFont(Font.BOLD, 220);
    g.setFont(headFontCn);
    var airConWidth = g.getFontMetrics().stringWidth(airConText);

    var headFontEn = EN_FONT.deriveFont(Font.BOLD, 240);
    g.setFont(headFontEn);
    var routeWidth = MeasureMixedTextWidth(g, routeNum, headFontEn);

    var gapSnowToAir = 60;
    var gapAirToRoute = 60;
    var totalWidth = snowSize + gapSnowToAir + airConWidth + gapAirToRoute + routeWidth;

    var xStart = (HEAD_W - totalWidth) / 2;
    var centerY = HEAD_H / 2;

    // 雪花
    DrawSnowflake(g, xStart + snowSize / 2, centerY, snowSize);

    // "空调"（中文字体）
    g.setFont(headFontCn);
    var airConCenterX = xStart + snowSize + gapSnowToAir + airConWidth / 2;
    CentreText(g, airConText, airConCenterX, centerY + 75, 600);

    // 路线名（中英混排自动切字体）
    var routeCenterX = xStart + snowSize + gapSnowToAir + airConWidth + gapAirToRoute + routeWidth / 2;
    DrawMixedText(g, routeNum, routeCenterX, centerY + 80, 800);
}
