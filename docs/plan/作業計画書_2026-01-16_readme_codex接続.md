---

# 作業計画書（2026-01-16）: README に Codex（config.toml）接続手順を追記

## 目的

- Codex から SCP-MCP を利用するための設定例（`config.toml`）を README に追記する。
- 個人のディレクトリパスを README に載せない（プレースホルダ `{scp-mcp-path}` を使用する）。

## 参照ドキュメント（SSoT）

- `AGENTS.md`
  - 5. 作業計画とPR運用
- `README.md`

## 作業項目（チェックは完了時に [✓]）

- [✓] README に「クイックスタート」を追加（git clone → `config.toml` 設定例）
- [✓] `config.toml` の設定例は `{scp-mcp-path}` を使用（個人パスを載せない）
- [✓] 検証（`npm run format:check`）
  - 結果: ✅

## 影響範囲 / リスク

- 影響範囲: `README.md`
- リスク:
  - 設定例のパスは環境依存のため、誤解が生じないよう注記する。
