# scp-mcp

SCP Data API を一次ソースとして、SCP Wiki由来のページを **検索・取得・引用** できる Model Context Protocol（MCP）サーバです。

## 重要（ライセンス/非公式）

- 本プロジェクトは **非公式** です（SCP Foundation / Wikidot 公式ではありません）。
- 本リポジトリのソースコードは **MIT License** です（`LICENSE`）。
- SCP Wiki のコンテンツは原則 **CC BY-SA 3.0** です。二次利用時は帰属表示と継承（Share-Alike）が必要です。
- 画像/メディアの取り扱いは特に注意してください（例: SCP-173 の過去の画像には追加の制約があり、商用利用は不可）。
- ライセンス指針: https://scp-wiki.wikidot.com/licensing-guide

## セットアップ

```bash
npm install
npm test
npm run build
```

## 起動

### stdio（ローカル統合向け）

```bash
npm run mcp:stdio
```

### Streamable HTTP（リモート/本番運用向け）

```bash
npm run mcp:http
```

- MCP エンドポイント: `POST /mcp`
- ヘルスチェック: `GET /healthz`
- ポート: `PORT`（デフォルト `3000`）

## Tools（MVP）

すべての tool 戻り値は `structuredContent` に JSON を含みます（また、可読性のため `content[type=text]` にも JSON 文字列を返します）。

- `scp_search`：キーワード/タグ/シリーズで検索（snippet付き）
- `scp_get_page`：`link`/`scp_number`/`page_id` でページメタデータ取得
- `scp_get_content`：本文取得（`markdown|text|html|wikitext`）
- `scp_get_related`：references/hubs から関連抽出（`relation_type` 付与）
- `scp_get_attribution`：CC BY-SA 3.0 準拠の帰属テンプレ生成

## Prompts

- `prompt_quote_with_citation`：引用付き回答（URL/作者/ライセンス必須、本文は非信頼データとして扱う）
- `prompt_rag_reader`：検索→取得→要約（URL/作者/ライセンス必須、本文は非信頼データとして扱う）

## Resources

- `scp://about`
- `scp://page/{link}`
- `scp://content/{link}`（markdownを返します）

## セキュリティ/運用

- 本文（および snippet）は **非信頼データ** として扱ってください（prompt injection を含み得ます）。
- 外部フェッチは `https://scp-data.tedivm.com/data/scp/` 配下に許可リストで制限しています（SSRF対策）。
- Rate limit（tool 呼び出し単位、固定ウィンドウ）:
  - `SCP_MCP_RATE_LIMIT_WINDOW_MS`（デフォルト: `60000`）
  - `SCP_MCP_RATE_LIMIT_MAX_REQUESTS`（デフォルト: `60`）
- 監査ログ（tools/call の引数と結果メタ、本文は保存しない）:
  - `SCP_MCP_AUDIT_LOG_PATH` を設定すると JSONL をファイルに追記します。未設定なら stderr に出力します。
