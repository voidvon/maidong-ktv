# Repository Guidelines

## 项目结构与模块组织

这是一个单模块 Android TV/Kotlin 项目。业务代码位于 `app/src/main/java/com/local/ktv`，播放器相关类在 `player/` 子包；界面、主题和键盘资源位于 `app/src/main/res`，原生 IJK 播放库位于 `app/src/main/jniLibs/armeabi-v7a`。`app/libs` 保存本地 JAR 依赖，`database_publish/` 保存分片曲库及合并清单，`catalog.sample.json` 是接口数据示例。根目录的 Gradle 文件负责插件和模块配置。

## 构建、测试与本地开发

- `./gradlew assembleDebug`：编译可调试 APK（包名带 `.qa` 后缀）。
- `./gradlew installDebug`：将 Debug APK 安装到已连接的 Android TV/设备。
- `./gradlew lintDebug`：运行 Android Lint，提交前应处理新增的 error/warning。
- `./gradlew test`：运行 JVM 单元测试；当前仓库尚未提供测试源码，新增测试请放入 `app/src/test`。
- `./gradlew clean`：清理 Gradle 构建产物，遇到缓存或增量编译问题时使用。

使用 JDK 17（`compileSdk 35`）。需要指定曲库清单地址时，通过 Gradle 属性传入，例如 `./gradlew assembleDebug -PGITEE_DATABASE_MANIFEST_URL=https://...`，不要把真实地址写入示例文件。

## 代码风格与命名约定

Kotlin/Gradle 使用 4 个空格缩进、UTF-8 和 Android Studio 默认格式化；保持现有的显式类型、不可变 `val` 和协程/回调风格。类、对象和可组合 UI 类型使用 `PascalCase`，函数和变量使用 `camelCase`，常量使用 `UPPER_SNAKE_CASE`。资源文件使用小写蛇形命名（如 `home_banner_0.webp`），包名保持 `com.local.ktv`。提交前执行 `lintDebug` 并检查未使用资源和日志。

## 测试指南

当前没有统一的自动化测试或覆盖率门槛。涉及播放器、下载、数据库、焦点导航的改动，至少在横屏 Android TV/模拟器上手动验证：遥控器焦点移动、点歌队列、切歌、原唱/伴唱切换、断点下载及重启恢复。新增单元测试使用 `*Test.kt` 命名；UI/设备测试放在 `app/src/androidTest`，并在 PR 中写明运行命令和设备 API 级别。

## 提交与合并请求

历史提交多为简短的动作描述（如 `update README.md.`）。请使用祈使句、说明范围的单行主题，推荐格式：`player: 修复切歌状态同步`；无关改动分开提交。PR 应包含变更目的、手动/自动测试结果、关联 issue（如有）；UI 改动附 TV 分辨率截图或录屏，数据库/配置改动说明兼容性、回滚方式及受影响文件。

## 安全与配置提示

不要提交真实密钥、签名文件、生产接口或用户曲库；发布签名所需的 `ktv_keystore.jks` 应由维护者在本地安全提供，密码不得写入版本库。处理 `database_publish/database` 分片时保持 `manifest.json` 与分片完整一致，避免手工改名或提交未完成的下载文件。
