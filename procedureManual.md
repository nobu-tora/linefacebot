# ハンズオン資料

ぼっとちゃんを作成する為の手順

個人用のボット作成手順です

+ レベル
    + Gitの基本的な操作
+ 必要なもの
    + LINEアカウント
    + LINEのアプリケーション
    + Azure アカウント(お金がかかっても大丈夫なアカウント)

## Botアプリケーション構造のイメージ

![app-configuration](image/app-configuration.png)

---

## 手順

1. LINE Developersでチャネルの作成 (30分)
2. Microsoft Azureでリソースグループの作成(15分)
3. Microsoft AzureでFace APIの作成(分)
4. Microsoft AzureでFunctionの作成(分)
5. 動作確認(分)

---

## LINE Developersでチャネルの作成(30分)

チャネルの作成を行う。

1. LINE Developersにログイン
2. プロバイダーの作成
3. チャネルの作成
4. チャネルの設定
5. チャネルの完成

---

### LINE Developersにログイン

Time: 5m

1. [LINE developers](https://developers.line.biz/ja/)から、ログインページに移動
2. `LINEでログイン`を選択
    * LINE Business ID
        * 今回は個人用の為、私用のLINEアカウントで行います
![LINE-login](image/LINE-login.png)

---

### プロバイダーの作成

Time: 5m

+ プロバイダー
    + サービス提供者（企業・個人）の名前です

1. `新規プロバイダーの作成`を選択
2. `プロバイダー名`の入力し`確認する`を選択
![create-provider](image/create-provider.png)
3. 確認画面で名前の変更がなければ`作成`を選択

---

### チャネルの作成

Time: 10m

1. 作成したプロバイダーを選択後、`新規チャネル作成`を選択
2. チャネルを選択
    + 今回は、Azureを使用しBotを作成する為、`Messaging API`を選択
![create-channel](image/create-channel.png)
3. Messaging APIの情報を入力
    + アプリアイコン画像を指定
        + 3MB以内, JPEG/PNG/GIF/BMP形式
    + アプリ名を指定
        + 20文字以内
        + 名前は7日間は変更できないので注意
    + アプリ説明
        + 500文字以内
    + 料金プランの選択
        + 初期選択プラン(Developer Trial or フリー)はどちらも無料で利用可能。どちらでも今回は可能ですが、個人用なので`Developer Trial`を選択する
        ![select-plan](image/select-plan.png)
    + 大業種と小業種を指定
        + 今回は個人用なので、大業種は`個人`を選択
    + メールアドレスを指定
        + 重要なお知らせと、最新ニュースが届きます
4. 内容の入力が完了後、`入力内容を確認する`を選択
5. 確認画面で変更がなければ`作成`を選択

---

### チャネルの設定

Time: 10m

チャネルの設定を行う

1. 作成したチャネルに移動する
2. `チャネル基本設定`に移動する
![select-plan](image/channel-settings1.png)
3. `Channel Secret`(秘密鍵)を、後ほど使用するので、メモしておく
![select-plan](image/channel-settings3.png)
4. `アクセストークン`を発行し、後ほど使用するので、メモしておく
5. `Webhook送信`を`利用する`に指定する
6. `Webhook URL`は、後ほど、Azure Function作成後、指定する
![select-plan](image/channel-settings2.png)
7. `利用可能な機能`に`REPLY_MESSAGE`を追加する
![select-plan](image/channel-settings4.png)
8. `自動応答メッセージ`を`利用しない`に指定する
![select-plan](image/channel-settings5.png)

---

### チャネルの完成

ここまででLINE Developersでチャネルの作成は、終了です

![select-plan](image/bot-chan.png)

---

## Microsoft Azureでリソースグループの作成

サービス作成する時に、リソースグループも一緒に作成できますが、
今回は先に`空のリソースグループ`を作成します。



## Microsoft AzureでFace APIの作成(15分)

Time: 15m

1. [Azure portal](https://portal.azure.com/)で、ログインする
2. 左上の`リソースの作成`を選択
3. 検索欄に`リソースグループ`を入力し検索する
4. 検索条件で表示された`リソースグループ`を選択
![azure-portal-resource-group](image/azure-portal-resource-group.png)
5. 作成を選択
6. リソースグループを作成する
    + リソースグループ名
    + サブスクリプション
        + 使用するサブスクリプションを選択
    + リソースの場所
        + 適切なデータセンターを指定
![resource-group](image/resource-group.png)
5. 作成を選択
6. [リソースグループ ○○○ が正常に作成されました] という通知が表示されればOK

## Microsoft AzureでFace APIの作成(分)

