// MTR模组公交车三块路牌统一管理脚本 v2.0
// 2026年-当前 仙芳佳全域通达铁路、乐文彩雨 版权所有
// 使用时请遵守MIT开源协议

/*【 参 考 答 案 链 接 】*/
// https://modrinth.com/resourcepack/mtr-mod-m-train-with-infopanels

// 统一管理：车外（侧身）路牌 + 车尾路牌 + 车头路牌
// 三个显示屏放在同一份 config 的 slots 里，一次渲染循环搞定

// 导入模组内置的代码
include(Resources.id("mtrsteamloco:scripts/display_helper.js"));

// 排版工具（字体、颜色、昼夜渐变、路线号过滤、雪花/箭头绘制、固定起终点站）
include("formatting.js");

// 三块路牌的绘制函数
include("draw.js");

/*【 三 块 路 牌 统 一 显 示 屏 参 数 】*/
var busSignsConfig = {

  "version": 1,

  // 总画板高度 = 三块路牌画板高度之和：900 + 600 + 600 = 2100
  "texSize": [2400, 2100],

  "slots": [

    /* ===== 画板1：车外（侧身）路牌 —— 上半部分 y=0 ~ 900 ===== */
    {
      "name": "side-sign",
      "texArea": [0, 0, 2400, 900],
      "pos": [
        [
          [-1.1532,1.6875,-0.2672],[-1.1532,1.5000,-0.2672],[-1.1532,1.5000,0.7953],[-1.1532,1.6875,0.7953]
        ]
      ],
      "offsets": [
        [0.0, 0.0, 0.0]
      ]
    },

    /* ===== 画板2：车尾路牌 —— 中间部分 y=900 ~ 1500 ===== */
    {
      "name": "tail-sign",
      "texArea": [0, 900, 2000, 600],
      "pos": [
        [
          [0.8438,1.6875,-3.4485],[0.8438,1.4375,-3.4485],[-0.8438,1.4375,-3.4485],[-0.8438,1.6875,-3.4485]
        ]
      ],
      "offsets": [
        [0.0, 0.0, 0.0]
      ]
    },

    /* ===== 画板3：车头路牌 —— 下半部分 y=1500 ~ 2100 ===== */
    {
      "name": "head-sign",
      "texArea": [0, 1500, 2400, 600],
      "pos": [
        [
          [-0.7813,1.6305,3.5609],[-0.7813,1.3827,3.5935],[0.7813,1.3827,3.5935],[0.7813,1.6305,3.5609]
        ]
      ],
      "offsets": [
        [0.0, 0.0, 0.0]
      ]
    }

  ]

};

var busSignsGenerator = new DisplayHelper(busSignsConfig);

/*【 列 车 初 始 化 】*/
function create(ctx, state, train) {
  state.refreshRate = new RateLimit(0.1);
  state.signs = busSignsGenerator.create();
}

/*【 统 一 渲 染 ： 一 次 循 环 画 三 块 路 牌 】*/
function render(ctx, state, train) {

  if (state.refreshRate.shouldUpdate()) {

    var routePlats = train.getThisRoutePlatforms();

    // —— 画板1：车外（侧身）路牌 ——
    var gSide = state.signs.graphicsFor("side-sign");
    DrawSideSign(gSide, routePlats, train);
    state.signs.upload();

    // —— 画板2：车尾路牌 ——
    var gTail = state.signs.graphicsFor("tail-sign");
    DrawTailSign(gTail, routePlats);
    state.signs.upload();

    // —— 画板3：车头路牌 ——
    var gHead = state.signs.graphicsFor("head-sign");
    DrawHeadSign(gHead, routePlats);
    state.signs.upload();

  }

  // 渲染车辆模型（传入 model 和 cars）
  for (var i = 0; i < train.trainCars(); i++) {
    ctx.drawCarModel(state.signs.model, i, null);
  }
}

/*【 清 理 】*/
function dispose(ctx, state, train) {
  state.signs.close();
}
