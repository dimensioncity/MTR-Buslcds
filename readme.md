Dimension_City 2026 All Rights Reserved

**严禁将本开发资源包同搭载的车辆资源包捆绑，出现侵权概不负责！**

### 什么是 MTR-Buslcds

MTR-Buslcds 是一个基于AI开发的，适用于MTR模组上的公交车LCD。
我们提供了上海公交的各种显示屏，从固牌、电显到LCD，应有尽有。品牌有凯伦、博闻等。
除此之外，为了适配LCD，我们还提供了适配表格帮助公交车资源包制作者能够快速适配我们的LCD。

### 更新日志

v1.0 上线

### 如何使用

**对于玩家**

1.拷贝、安装此包至《我的世界》的资源包文件夹下。（一般位于：启动器/.minecraft/versions/resourcepacks）

2.将调用该包内容的资源包放置于同本包相同的文件夹。

**对于开发者**

1.拷贝、安装此包至《我的世界》的资源包文件夹下。（一般位于：启动器/.minecraft/versions/resourcepacks）

2.使用blockbench和*适配位置计算工具.xlsx*这俩个工具，利用屏幕的左上角和右下角位置确定显示屏/路牌绘制范围。

3.将结果复制于*车型适配文件.js*文件中的指定位置，随后将该文件更名为车型名称并复制到MTR模组任意文件夹下，然后在mtr_custom_resources.json文件中添加以下内容：

`"script_files":  ["mtr:buslcds/m7a001.js"]`

4.压缩该包，将该包放置于同本包相同的文件夹。

### 属性可选配置

*斜体字*表示该功能尚未实现

**总开关**

bw：博闻英文语法

company：公司信息{ 名称, 电话, logo}

debug：开发者模式

**车外**

|显示屏类型|可选（variant）|子可选（sub）|配置|位置数量|
|:---:|:---:|:---:|:---:|:---:|
|固牌（out_gupai）|无|无|无|3（侧、尾、头）|
|电显（out_dianxian）|博闻（bw）、凯伦（kl）|无| start（显示起始站）:false , english（英文终点站站名）:false , bashi（数字、英文巴士字体）:false , color（kl专用显示屏颜色）:"orange/red"|3（侧、尾、头）|
|*彩显（out_caixian）*|博闻（bw）、凯伦（kl）|2018 , 2020a , 2020b , 2022 , 2020sj , 2020pd（均为kl可选配置）|wheel（车头轮椅显示）:false, yzbt（右转必停显示）:false, tpnr（尾显图片内容）:false|3（侧、尾、头）|

**车内**

|显示屏类型|可选（variant）|子可选（sub）|配置|位置数量|
|:---:|:---:|:---:|:---:|:---:|
|线路图（in_xlt）|蓝色手作（blue）、绿色手作（green）、浦东公交（pudong）、巴士集团（bashi）|无|无|1（侧）|
|电显（in_dianxian）|博闻（bw）、凯伦（kl）|澳马（apep）、强生（qs）、中安（za）、锐明（rm）、蓝斯（ls）、拓华（kh）、通达（td）、博闻（bw）、凯伦（kl）| right_temperature（kl专用，显示右边温度）:false , colorful（跟SWB6710系列差不多的样子）:false |1（头）|
|*前部lcd（in_headlcd）*|<p>博闻（bw）、凯伦2018款（kl）、凯伦2020款（klnew）、凯伦综艺体款（klzy）|浦东（pd）、巴士（bs）、社会（sh）、自定义（zdylogo）、金山（js）、大众（dz）、松江（sj）、奉贤（fx）、闵行（mh）、青浦（qp）、71路（71）（bw可选）<br>浦东（pd）、巴士（bs）、社会（sh）、自定义（zdylogo）、金山（jinshanlv）、锦山（jinshanfen）、松江（sj）、奉贤客运（fk）、临港（lg）、闵行（mh）、青浦（qp）、20路（20）、65路（65）（klzy可选）</p>|highspeed（bw专用本线途经高速道路）:false, video（视频播放）:false|1（头）|
|*风道屏lcd（in_sidelcd）*|<p>博闻（bw）、凯伦2018款（kl）、凯伦2020款（klnew）、凯伦综艺体款（klzy）|浦东（pd）、巴士（bs）、社会（sh）、自定义（zdylogo）、金山（js）、大众（dz）、奉贤（fx）、闵行（mh）、青浦（qp）、71路（71）（bw可选）<br>浦东（pd）、巴士（bs）、社会（sh）、自定义（zdylogo）、金山（jinshanlv）、锦山（jinshanfen）、松江（sj）、奉贤客运（fk）、临港（lg）、闵行（mh）、青浦（qp）、20路（20）、65路（65）（klzy可选）</p>|leftseat（左侧显示屏显示让座）:false|2（左、右）|
|*头部lcd（类似临港S8B）（in_toplcd）*|<p>博闻（bw）、凯伦2018款（kl）、凯伦2020款（klnew）、凯伦综艺体款（klzy）|浦东（pd）、巴士（bs）、社会（sh）、自定义（zdylogo）、金山（js）、大众（dz）、松江（sj）、奉贤（fx）、闵行（mh）、青浦（qp）、71路（71）（bw可选）<br>浦东（pd）、巴士（bs）、社会（sh）、自定义（zdylogo）、金山（jinshanlv）、锦山（jinshanfen）、松江（sj）、奉贤客运（fk）、临港（lg）、闵行（mh）、青浦（qp）、20路（20）、65路（65）（klzy可选）</p>|video（视频播放）:false|2（吸顶lcd前后）|


