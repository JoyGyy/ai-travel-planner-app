# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## 自动化执行与免确认规则 (Auto Execution & No Manual Accept)

- 接收到任何代码修改、开发或优化需求时，直接进行文件写入与修改操作（Direct Execution），严禁生成需用户手动点击确认/接受的 Implementation Plan 计划阻断流程。
- 自动化流转，无需用户手动逐个文件 accept。

## 代码修改后自动 Git 提交 (Auto Git Commit)

- 每次完成代码修改或文件创建并验证完成后，必须自动在终端执行 `git add` 并生成符合 Conventional Commits 规范的清晰提交说明进行 `git commit`（如 `feat(...)`, `fix(...)`, `refactor(...)` 等）。
- 提交完成后输出 commit 简要信息，无需等待用户提示。

## 代码修改总结要求 (Code Change Summary)

每次完成代码修改或创建文件后，在回复末尾附带一段简明扼要的总结（1段话，建议 2~4 句话，不超过 100 字）：

- 概括修改了哪些文件和核心逻辑；
- 说明实现的效果或解决的问题；
- 保持简练，不堆砌冗余细节。
