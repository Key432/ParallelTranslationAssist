# Parallel Translation Assist

英文の任意の範囲に日本語訳を登録し、左右に並べて閲覧する個人用SPAです。データはブラウザのローカルストレージに保存され、外部へ送信されません。

## 開発

```sh
npm install
npm run dev
```

## GitHub Pages

`main` ブランチへのpushで GitHub Actions がビルド・公開します。リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。

`robots.txt` と `noindex` メタタグで検索エンジンへの掲載を拒否しています。ただし、GitHub Pages 自体にはアクセス制限がないため、URLを知る人は閲覧できます。
