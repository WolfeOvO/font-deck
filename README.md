# 字境 Font Deck Online 1.3.0

轻量 Chrome/Edge MV3 字体替换扩展。普通文本、行内/块代码、数学独立设置；默认 Google Sans → Noto CJK TC → HK → SC。页面是大陆简体也保留 TC 字形与中置全角标点。

## 安装

下载 Release 的 `font-deck-online-1.3.0.zip`，解压并保留目录，在 `chrome://extensions` 开启开发者模式，加载含 manifest.json 的目录，然后刷新网页。不要与离线版同时在同一页面启用。

Release 也提供签名 CRX3。Chrome 官方限制：Windows/macOS 普通版的自托管 CRX 不能作为通用直装途径，通常需要 Chrome Web Store 或企业策略；Linux 支持自托管安装。无法直装时用 ZIP 加载。此项目未发布到商店，不改你的浏览器策略。

## 字体 API 和缓存

扩展包不带字体二进制。按页面实际文字和样式，在本机选择资源后由后台请求固定字体 ID，验证完整长度和 SHA-256，再以二进制 FontFace 注入。CSP 严格页面也可用。字体缓存上限 256 MiB，按最近使用淘汰；已缓存资源可在断网时使用，未缓存的字体需要联网。没有远程 JavaScript、遥测、网页正文上传或账户。

默认接口：`https://draft.wolfeovo.top/font-deck-api/v1-r1/`。API 提供 516 份未修改官方 OFL 文件，完整来源/版本/哈希见 `extension/FONT-SOURCES.json`，原始许可证在 `extension/licenses/`。MiSans、普惠体仅使用本机已安装版本，在线版不单独提供其专有字库。

首次下载 TC 完整字库约 36 MB，期间可能短暂显示系统回退；切换新字系/字体也可能等待下载。不是按字切分字体。设置页有真实字体预览、加载失败提示、重试和清空缓存。字体菜单本身不会加载全部资源。

## 开发

需要 Node.js 20+、Python 3.11+、Chrome/Chromium、OpenSSL。

```sh
npm ci
npm test
npx playwright install chromium
node tests/engine-resource.mjs
```

Browser tests create task-owned qa/artifacts directories automatically. Use `CHROMIUM_PATH` to point at Chrome/Chromium; set `FONT_SOURCE_DIR` to an acquired font root for the local real-font harness.

浏览器测试可用 `CHROMIUM_PATH` 指定可执行文件。在线链路测试需要本地真实字体目录（`FONT_SOURCE_DIR`），它从 `FONT-SOURCES.json` 的固定官方 URL 获取并核验，不随源码提交。`python tools/acquire-fonts.py --output /data/font-deck-assets` 可下载字体；`FONT_SOURCE_DIR=/data/font-deck-assets npm run test:browser` 测试冷缓存、动态字系、严格 CSP 和重启断网缓存。公网设置页测试：`node tests/ui-online.mjs`。

`python tools/package.py --key /secure/path/signing.pem` 生成 ZIP/CRX，签名密钥不进仓库。若首次没有密钥，脚本会在指定私有路径创建并严格限制权限。保持同一密钥才能保持扩展 ID。API 部署见 `server/README.md`。

## 边界

图标/emoji/code/math 保持语义保护。MathML 可换数学字体，KaTeX/MathJax 需要已有语义 MathML。Canvas、图片、闭合 Shadow DOM、无 MathML 的 SVG 公式无法直接替换；浏览器内置页/商店/PDF 不能注入。本机自定义字体缺字会系统回退。晚挂载 ShadowRoot 在大页面可能等待一轮候选扫描，首轮大页面扫描和真正影响整页字体的 CSS 变化仍有开销。

软件源码 MIT；字体分别按原许可证授权。已交付离线 1.2.1 不受本项目在线版修改影响。
