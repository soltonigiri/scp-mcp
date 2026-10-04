# scp-mcp

SCP Wikiのページを検索・取得する非公式のMCPサーバーです。SCP Data APIを使い、本文とともに出典・作者・ライセンスを返します。

## 起動

Node.js 20.19以上とnpmが必要です。

```bash
git clone https://github.com/soltonigiri/scp-mcp.git
cd scp-mcp
npm ci
npm run mcp:stdio
```

Codexから接続する場合は、`config.toml`に以下を追加してください。`{scp-mcp-path}`はcloneしたディレクトリに置き換えます。

```toml
[mcp_servers.scp-mcp]
command = "bash"
args = ["-lc", "cd {scp-mcp-path} && npm run --silent mcp:stdio"]
startup_timeout_ms = 20000
```

Streamable HTTPで起動する場合は、次のコマンドを実行します。

```bash
npm run mcp:http
```

MCPエンドポイントは`POST /mcp`、ヘルスチェックは`GET /healthz`です。

## ツール

| ツール                | 用途                                           |
| --------------------- | ---------------------------------------------- |
| `scp_search`          | キーワード・タグ・シリーズなどでページを検索   |
| `scp_get_page`        | slug・SCP番号・ページIDからメタデータを取得    |
| `scp_get_content`     | 本文をMarkdown・テキスト・HTML・Wikitextで取得 |
| `scp_get_related`     | 参照先やhubから関連ページを取得                |
| `scp_get_attribution` | 出典・作者・ライセンスの帰属表示を取得         |

結果は`structuredContent`にJSONで返します。本文は行範囲を指定でき、既定では先頭200行を取得します。

プロンプトは、引用用の`prompt_quote_with_citation`と検索・要約用の`prompt_rag_reader`です。リソースは`scp://about`、`scp://page/{link}`、`scp://content/{link}`です。

入力・出力の詳細は[API仕様](仕様書.md)を参照してください。

## 設定

| 環境変数                          | 既定値  | 内容                                           |
| --------------------------------- | ------- | ---------------------------------------------- |
| `PORT`                            | `3000`  | HTTPの待ち受けポート                           |
| `SCP_MCP_RATE_LIMIT_WINDOW_MS`    | `60000` | ツールの呼び出し回数を数える期間。単位はミリ秒 |
| `SCP_MCP_RATE_LIMIT_MAX_REQUESTS` | `60`    | 上記期間内の呼び出し上限                       |
| `SCP_MCP_AUDIT_LOG_PATH`          | 未設定  | 呼び出しログのJSONL出力先。未設定時はstderr    |

## 開発

```bash
npm test
npm run build
npm run lint
npm run format:check
```

## ライセンス

コードは[MIT](LICENSE)です。SCP Wikiのコンテンツは原則CC BY-SA 3.0で、二次利用には帰属表示と同じライセンスでの公開が必要です。詳細は[SCP Wikiのライセンスガイド](https://scp-wiki.wikidot.com/licensing-guide)を参照してください。
