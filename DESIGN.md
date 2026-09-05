# Design System

## Direction

夜晚出发的城市手账：像手机里一张被折过的路线图，墨蓝夜色承载地图，橄榄色标记已完成的路，珊瑚色只在生日与花束时出现。整体轻量、亲密、带一点电影字幕感。

## Palette

- `--night`: `oklch(0.16 0.035 248)` — 主背景
- `--night-deep`: `oklch(0.11 0.025 248)` — 深层背景
- `--surface`: `oklch(0.22 0.035 246)` — 面板与地图纸
- `--surface-light`: `oklch(0.29 0.042 244)` — hover / raised surface
- `--ink`: `oklch(0.96 0.02 90)` — 主文字
- `--muted`: `oklch(0.74 0.035 210)` — 次级文字
- `--primary`: `oklch(0.62 0.13 130)` — 已解锁橄榄绿
- `--primary-deep`: `oklch(0.38 0.10 136)` — 印章与路线
- `--coral`: `oklch(0.69 0.16 35)` — 生日珊瑚
- `--coral-deep`: `oklch(0.43 0.14 28)` — 重要行动
- `--line`: `oklch(0.34 0.04 245)` — 分隔线

## Typography

使用系统中文无衬线字体：`-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`。标题使用较重字重和紧凑行高，正文保持舒适阅读宽度；不引入外部字体依赖。

## Components

- 页面顶部固定显示房间标题、当前章节与进度，不显示完整路线。
- 主要内容采用无嵌套卡片的“纸张面板”，圆角 18px；重复任务使用列表而非卡片墙。
- 主要按钮使用珊瑚色实心填充，次要操作为描边按钮；所有按钮至少 44px 高。
- 地图是抽象手账 SVG/CSS 视觉，不伪造真实道路；“打开导航”才跳转高德。
- 状态反馈使用印章、进度点、花瓣等与剧情相关的视觉，不使用通用 toast 堆叠。

## Motion

状态变化使用 160–260ms 的淡入、上移和印章落下；22 个花瓣采用轻微 stagger。`prefers-reduced-motion` 下取消位移与循环动画，仅保留颜色和透明度变化。
