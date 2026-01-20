作業計画書（2026-01-19）: 可読性向上リファクタリング（2PR）
参照ドキュメント（SSoT）

- `docs/要件定義.md`
  - 5. 機能要件（Tools/Resources/Prompts/Transport）
  - 6. コンテンツ正規化要件（AI可読化）
  - 7. 検索要件
  - 8. セキュリティ要件
  - 10. 受入基準
        目的
- 仕様・挙動を変えずに可読性を改善する（重複削減、意図が読める分割、命名の整理）
- 既存テスト + 追加のcharacterizationテストで回帰を防ぐ
- `docs/要件定義.md` に定義されたMVP（tools/resources/prompts/security）の挙動を維持する
  非目的（本計画では実施しない）
- 仕様変更（ツールI/O JSONの形、エラーメッセージ、ソート/スニペット仕様など）
- 新機能追加（新tool/resource/prompt/transport）
- 依存関係更新、設定大改変（tsconfig/eslint/prettier等）
- 大規模なファイル移動/公開API変更、無関係な整形のみの変更
  進め方（t-wada式TDD）
- 変更前に `npm test` を実行しグリーン確認
- 触る境界に characterization テストを追加してからリファクタ（テストが落ちている状態でリファクタしない）
- 変更は最小ステップで刻み、各ステップで `npm test` を実行
- `skip`/`only` は恒久化しない
  PR方針（2PR）
- PR1: MCPサーバ側の重複削減（ツール登録/共通ラッパ整理）+ 回帰テスト
- PR2: Repository/Data API/Search/Formatter の重複削減 + 回帰テスト
  （各PRに本作業計画書の更新を含め、完了した項目に [✓] を付ける）
  PRタイトル案（Conventional Commits）
- PR1: `refactor(mcp): improve readability of server registration`
- PR2: `refactor(scp): improve readability of repository and search pipeline`
  対象ファイル（予定）
- PR1
  - `src/mcp/scpMcpServer.ts`
  - `src/index.ts`（version 定数の参照元として利用する場合）
  - `test/mcp/mcpServer.test.ts`
- PR2
  - `src/scp/repository.ts`
  - `src/scp/dataApiClient.ts`
  - `src/scp/searchEngine.ts`
  - `src/scp/contentFormatter.ts`
  - `test/scp/searchEngine.test.ts`
  - `test/tools/scpGetTools.test.ts`
  - （必要なら）`test/scp/dataApiClient.test.ts` / `test/scp/repository.test.ts`
    作業項目（チェックは完了時に [✓]）
    PR1: MCPサーバ可読性改善
- [✓] (Doc) 本計画書を追加する（このファイル）
- [✓] (Test) MCPサーバのcharacterizationテストを追加
  - レート制限超過時に `structuredContent.error`（または同等のエラー表現）が返ること
  - tool内部例外（例: 不正なlink）で `isError` / `structuredContent.error`（または同等）が返ること
- [✓] (Refactor) `src/mcp/scpMcpServer.ts` の `registerTool` 重複を解消
  - `registerWrappedTool` 等の小ヘルパ導入
  - tool名を1箇所管理し、`wrapStructuredCall(toolName, ...)` の二重管理を防ぐ
- [✓] (Refactor) サーバ `version` の定数参照を整理（挙動は同一）
  - 例: `src/index.ts` の `VERSION` を参照
- [✓] (Refactor) `wrapStructuredCall` の内部を読みやすく分割
  - エラー結果生成、監査ログ書き込みを小関数化
- [✓] (Refactor) `summarizeResult` の if 連鎖を `tool -> summarizer` マップ化
- [✓] (Verify) `npm test` / `npm run build` / `npm run lint` を実行してgreenを確認
  PR2: ドメイン層可読性改善
- [ ] (Test) SearchEngine の snippet 代表ケースを追加
  - query無しの先頭200文字+省略
  - query一致ありの前後文脈抽出
  - query一致なしの fallbackIdx スライス
- [ ] (Test) `scp_get_page` の参照解決のcharacterizationテストを追加
  - `scp_number` で解決できること
  - `page_id` で解決できること
- [ ] (Refactor) `src/scp/repository.ts` の重複排除
  - raw entry からの基礎フィールド抽出をヘルパ化（link/title/url/page_id 等）
  - Map更新（pagesByRef/refsByLink/refsByPageId/itemRefsByScpNumber）を1か所に集約
  - `resolveRef` の link/page_id 分岐を共通化（エラーメッセージは維持）
- [ ] (Refactor) `src/scp/dataApiClient.ts` の重複排除
  - API URL生成を `buildApiUrl` に集約
  - conditional headers / in-flight dedupe を小関数化
- [ ] (Refactor) `src/scp/searchEngine.ts` の読みやすさ改善
  - `doc` が `undefined` になり得る箇所の扱いを明示（強制キャスト/Boolean filter に依存しない）
  - `makeSnippet` を小関数に分割して分岐の意図を明確化
- [ ] (Refactor) `src/scp/contentFormatter.ts` の読みやすさ改善
  - `images` 返却ロジックの重複を解消
  - 共通前処理（root決定/不要要素除去/img抽出）と形式別出力を分離
- [ ] (Verify) `npm test` / `npm run build` / `npm run lint` を実行してgreenを確認
      受入基準（このリファクタで壊さないこと）
- `docs/要件定義.md` のMVP toolが提供され、I/O JSONの主要フィールド（license/attribution/content_is_untrusted等）が維持されている
- `test/mcp/mcpServer.test.ts` の `tools/list -> tools/call` が通る
- `npm test` と `npm run build` が成功する
  検証コマンド
- `npm test`
- `npm run build`
- `npm run lint`
  リスク/注意点
- MCPツールの戻り値は外部利用されるため、フィールド名/型/エラーメッセージの微差も「仕様変更」になり得る（characterizationテストで固定する）
- 検索スコアや snippet は回帰が起きやすいので、テスト追加後に段階的に分割する
- バージョン文字列の参照先統一は見た目の改善だが、循環参照やビルドへの影響がないことを確認する
  PR本文に必ず書くこと（AGENTS.md準拠）
- 参照したドキュメント: `docs/要件定義.md`（該当セクション）
- 変更の意図: 可読性向上（挙動不変）
- 影響範囲/リスク: MCP I/O、検索、キャッシュ、rate limit、監査ログ
- 実行したテスト: `npm test` / `npm run build` / `npm run lint`（結果）
