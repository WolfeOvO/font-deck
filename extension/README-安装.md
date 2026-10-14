# 字境 Font Deck Online 1.3.0

在线版不含字体文件，按需从字体 API 获取并在本机校验缓存。不要与离线版同时启用。软件和字体来源见 GitHub https://github.com/WolfeOvO/font-deck 与 FONT-SOURCES.json。

## 安装

下载 ZIP，解压保留目录；在 chrome://extensions（Edge 为 edge://extensions）开启开发者模式，加载含 manifest.json 的目录。固定字境在线版并刷新网页。正文默认 Noto Sans（Google Sans 优先），地区默认自动 TC→HK→CN。

签名 CRX3 可用于支持外部安装的 Chromium/Linux；Windows/macOS 普通 Chrome 通常要求商店或企业策略，无法直接安装时用 ZIP。此版本未发布到商店，不自动修改浏览器策略。

## 在线加载

只请求实际需要的字体 ID，不上传页面文字或请求远程代码。字体 API 的每份文件均校验 SHA-256 和大小。缓存上限 256 MiB；缓存过的字体可断网使用，未缓存的需要网络。首次 TC 字库约 36 MB，期间可能短暂系统回退。请求失败会尝试下一已声明字体（例如 TC→HK→SC），保留错误提示，可在设置页重试。没有按字子集化或预下载全部字体。

普通文本、代码、数学分别设置；占位提示、伪元素标签、动态页面与开放 Shadow DOM 沿用语义保护。全角逗号/句号/顿号按 TC/HK 中置，半角逗号仍按拉丁设计。页面 lang 和实际文字不变。

## 缓存

设置页“字体字库”可查看缓存用量、重试和清空缓存。清空不会删除已打开页面内的已加载字形；后续新页面需要重新获取。独立在线扩展的设置与原离线版互不覆盖。

## 权利与边界

516 份许可允许再分发的未修改字体通过在线 API 提供。MiSans、普惠体仅使用本机已安装字体，在线版不单独分发它们；各字体许可证见 licenses/。软件源码 MIT。

图片、Canvas、封闭 Shadow DOM、无 MathML 的 SVG 公式不能换字体；浏览器内置页/商店/PDF 禁止注入。很长页面首轮和全局样式变化仍有成本。测试环境为 Linux Chromium，用户 Windows/macOS 尚未实测。
