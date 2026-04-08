import { CEFR, PhraseBankItem, PodcastVoiceGender, RetellingKeywordLine } from "@/lib/types";
import { podcastAxes } from "@/lib/lesson-utils";

const cefrOrLower = (cefr: CEFR) => (cefr === "C2" ? "C1 以下" : `${cefr} 以下`);

export const buildSpeechPromptJa = (theme: string, note: string, cefr: CEFR) => `
あなたは英会話学習アプリの教材作成AIです。

目的:
ユーザーが1分間で話せる英語スピーチ原稿を作成してください。

条件:
- テーマ: ${theme}
- CEFR: ${cefr}
- ユーザーの内容メモ: ${note}
- 1分で話せる自然な長さ
- 150語以上180語以下を目安
- 話し言葉らしい自然な英語
- 短すぎる文を並べるだけではなく、流れのある内容にする
- ユーザーの内容メモが日本語でも、その意図を自然な英語に直す
- 事実関係はメモの範囲で補うが、勝手に大きく話を変えない

JSONで返してください。
keys:
- title: 短いタイトル
- script: 完成した英語スピーチ全文
- sentences: 文ごとに分割した配列
`.trim();

export const buildPhrasePromptJa = (args: {
  theme: string;
  cefr: CEFR;
  speechScript: string;
  count: number;
  candidates: PhraseBankItem[];
}) => `
あなたは英会話学習アプリの教材作成AIです。

目的:
Oxford Phrase List のフレーズを、ユーザーの今週のテーマに引き寄せた「自分ごとフレーズ」に変換してください。

条件:
- テーマ: ${args.theme}
- CEFR: ${cefrOrLower(args.cefr)}
- 1分スピーチ: ${args.speechScript}
- 必要個数: ${args.count}
- 候補フレーズ:
${args.candidates.map((item, index) => `${index + 1}. bankId=${item.id} [${item.cefr}] ${item.phrase}`).join("\n")}

要件:
- 候補フレーズをそのまま使い、別のフレーズに差し替えない
- bankId は候補一覧に書かれているものを、そのまま正確に返す
- 自分ごとフレーズは、テーマに合う自然な1文にする
- 英語はCEFR ${args.cefr === "C2" ? "C1" : args.cefr} 以下で自然にする
- 日本語訳は短くわかりやすくする
- 出力順は入力候補の順番を保つ

JSONで返してください。
keys:
- items: 配列
各itemのkeys:
  - bankId
  - original
  - personalized
  - translation
`.trim();

export const buildPodcastPromptJa = (args: {
  theme: string;
  note: string;
  speechScript: string;
  dayIndex: number;
  previousTitle?: string;
  userVoiceGender: PodcastVoiceGender;
}) => {
  const axis = podcastAxes[args.dayIndex as keyof typeof podcastAxes] ?? "Understanding";
  const intro = args.dayIndex > 1 && args.previousTitle ? `前日のポッドキャストタイトル: ${args.previousTitle}` : "前日のタイトル参照は不要です。";
  return `
あなたは英会話学習アプリのポッドキャスト脚本AIです。

目的:
ユーザーが自分ごととして聞ける、2人会話の英語ポッドキャストを1本作ってください。

条件:
- 今週のテーマ: ${args.theme}
- ユーザーの内容メモ: ${args.note}
- 1分スピーチ: ${args.speechScript}
- 今日の日付上の位置: Day ${args.dayIndex}
- 今日の思考軸: ${axis}
- 目標語数: 400-600 words
- 会話は2人のみ
  - Partner: ガイド役
  - User: ユーザー役
- User役の声の性別設定: ${args.userVoiceGender}
- Day 1 は導入
- Day 2-7 は前日とのつながりが感じられるようにする
- 特に冒頭で前日の流れを軽く参照してよい
- ただし、会話全体は自然で教材らしくする
- CEFRはB1前後までを中心に、理解可能で口にしやすい表現を使う
- User役の英語は模範的で自然にする
- Partnerばかりが長く話しすぎない
- オーバーラッピングしやすいように、1ターンは極端に長くしない

参照情報:
${intro}

JSONで返してください。
keys:
- title
- turns: 配列
各turnのkeys:
  - speaker: "Partner" または "User"
  - text
`.trim();
};

export const buildRetellingKeywordsPromptJa = (sourceText: string) => `
あなたは英語リテリング教材作成AIです。

目的:
ユーザーがリテリングしやすいように、原稿の各文からキーワードを抽出してください。

条件:
- キーワードは内容語から選ぶ
- 内容語とは、名詞・動詞・形容詞・副詞など、ないと意味が伝わりにくい語
- 機能語（冠詞・前置詞・助動詞・代名詞など）は基本的に選ばない
- 各文につき2-3個
- 順番は原稿の順番通り
- 原文の語をできるだけ使う

原稿:
${sourceText}

JSONで返してください。
keys:
- lines: 配列
各lineのkeys:
  - sourceText
  - keywords
`.trim();

export const buildRetellingCorrectionPromptJa = (sourceText: string, transcript: string, cefr: CEFR) => `
あなたは英語リテリング添削AIです。

目的:
ユーザーの1分リテリングを、元の意味を保ちながら自然で読みやすい英文に整えてください。

条件:
- 元の参考原稿: ${sourceText}
- ユーザーの文字起こし: ${transcript}
- CEFR目安: ${cefr}
- 内容はできるだけユーザーが言おうとしたことを残す
- ただし文法、語順、不自然な語法は直す
- 口に出してオーバーラッピングしやすい自然な英文にする
- 出力は英語のみ

JSONで返してください。
keys:
- correctedText
- sentences
`.trim();

export const buildExternalChatPrompt = (args: {
  theme: string;
  speechScript: string;
  podcastTitle?: string;
  dayIndex: 6 | 7;
}) => `
AI voice / chat modeで会話練習をします。あなたは私の会話相手です。

テーマ: ${args.theme}
Day: ${args.dayIndex}
会話時間: 20分

参考情報:
- 1分スピーチ:
${args.speechScript}
${args.podcastTitle ? `- 直近のポッドキャストタイトル: ${args.podcastTitle}` : ""}

ルール:
- CEFR B1程度のわかりやすい英語
- 1ターンは短め
- 私が話したことに対して、会話を自然に広げる
- 文法ミスがあるときだけ、親が子どもに話すように自然に言い換えて返す
- 毎回先回りして答えを完成させない
- 聞き返しを使って、私が自分で言えるように助ける
- Day 6 は質問→私の意見→あなたの意見→お互いの感想、の流れを含める
- Day 7 も同様だが、週の振り返りが少し入ってもよい
- 私が stop と言うまで続ける

最初の1ターンから始めてください。
`.trim();

export const orderedKeywordText = (lines: RetellingKeywordLine[]) => lines.map((line) => line.keywords.join(" / ")).join("\n");

