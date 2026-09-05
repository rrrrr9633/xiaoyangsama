# 花园邮差 Android 开发与发布配置

## 当前工程

新版本位于 `android/`，是 Kotlin + Jetpack Compose 原生 Android 工程。旧的 Vite 网页只保留为历史参考，不参与 APK 构建。

地图主界面使用高德 Android 3D Map SDK，定位使用高德 Location SDK。Web JS 的 `serviceHost`、`securityJsCode` 只属于旧网页代理，不能复制进 Android 代码。

## 本地环境

1. 安装 Android Studio，至少安装 Android SDK Platform 35、Build Tools 35.x 和 Platform Tools。
2. 用 `android/local.properties.example` 复制出 `android/local.properties`，把 `sdk.dir` 改成本机 SDK 路径。`local.properties` 已被忽略，不要提交。
3. 在高德控制台新建 **Android 平台 Key**，包名填 `top.sama.yangyang`，并绑定实际签名证书 SHA-1。
4. 构建或同步时通过环境变量注入：

   ```bash
   export AMAP_ANDROID_KEY='你的Android平台Key'
   ```

   也可以使用 `./gradlew assembleDebug -PAMAP_ANDROID_KEY=你的Android平台Key`。Key 仍受高德包名/SHA-1 限制，不能把 Web Key 当作 Android Key。

5. 私密房间接口地址通过 `GARDEN_CONTENT_BASE_URL` 注入；默认值是 `https://xn--sama-px9gg69g.top/api`。它不是地图代理地址，也不承载高德安全密钥。

## 域名与服务器

域名 `xn--sama-px9gg69g.top`（小漾sama.top 的 punycode）和服务器 `154.201.65.68` 可继续承载私密房间内容、视频接口和 Web 服务代理。APK 不需要 `serviceHost`；如果服务端调用高德 Web 服务 API，服务端的 Key 与安全密钥只放在服务器环境变量中。

## 目前的地图坐标策略

`RouteContent.kt` 中的三个点是原型锚点。中街—东中街使用公开参考点，另外两个商户点只作演示，均标记为“待现场校准”。正式生日活动前必须用高德地理编码或现场手机定位获取 GCJ-02 坐标，再设置 100–150 米签到围栏。二维码是最终到场凭证，定位失败不应阻塞流程。

## 验证顺序

1. Android Studio 打开 `android/` 并完成 Gradle Sync。
2. 注入 Android Key 后在模拟器启动，确认沈阳地图、三个节点、路线和高德版权标识可见。
3. 在模拟完成模式走完 Lv.1 到 Lv.3，再用一台真机测试定位权限、弱网和二维码签到。
4. 现场校准坐标后再生成 release APK；不要在未确认商户营业状态前发布终点围栏。
