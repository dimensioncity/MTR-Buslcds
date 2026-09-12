// m7a001.js — 蓝色线路图 / BW电显 / BW外显

var CONFIG = {
  debug: false,
  bw: false,
//company:       { name, phone, logo, logoOpacity }

  // ========== 车内 ==========
  in_xlt:        { enabled: true,  variant: "blue", sub: "", pos: [[[-0.7475,1.9255,0.5469],[-0.8192,1.8231,0.5469],[-0.8192,1.8231,-0.0156],[-0.7475,1.9255,-0.0156]]] },
  in_dianxian:   { enabled: true,  variant: "kl", sub: "td", colorful: false, right_temperature: false, pos: [[[0.5313,1.9313,1.9640],[0.5313,1.8375,1.9640],[-0.5313,1.8375,1.9640],[-0.5313,1.9313,1.9640]]] },
  in_headlcd:    { enabled: false, variant: "bw", pos: [] },
  in_sidelcd:    { enabled: false, variant: "bw", pos: [] },
  in_toplcd:     { enabled: false, variant: "bw", pos: [] },

  // ========== 车外 ==========
  out_dianxian:  { enabled: true,  variant: "kl", start: false, english: true, bashi: false, color: "orange", pos: [
      [[[-0.7813,1.6305,3.5609],[-0.7813,1.3827,3.5935],[0.7813,1.3827,3.5935],[0.7813,1.6305,3.5609]]],
      [[[-1.1532,1.6875,-0.2672],[-1.1532,1.5000,-0.2672],[-1.1532,1.5000,0.7953],[-1.1532,1.6875,0.7953]]],
      [[[0.8438,1.6875,-3.4485],[0.8438,1.4375,-3.4485],[-0.8438,1.4375,-3.4485],[-0.8438,1.6875,-3.4485]]]
    ] },
  out_gupai:     { enabled: false, pos: [] },
  out_bw:        { enabled: false, pos: [] },
  out_kl:        { enabled: false, pos: [] },
  out_caixian:   { enabled: false, variant: "bw", pos: [] }
};

include(Resources.id("mtr:buslcds/dispatcher.js"));
