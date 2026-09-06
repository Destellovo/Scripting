export type BangumiTranslatableText = {
  text: string
  source?: string
}

const ORIGINAL_MARKER = /(?:^|\n)\s*[\[【(（]?\s*简介原文\s*[\]】)）]?\s*[:：]?\s*/i
const JAPANESE_KANA = /[\u3040-\u30ff\u31f0-\u31ff]/
const KOREAN_HANGUL = /[\uac00-\ud7af]/
const CJK_IDEOGRAPH = /[\u3400-\u9fff]/
const LATIN_LETTER = /[A-Za-z]/

function normalizeText(text: string) {
  return text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim()
}

function sourceLanguageFor(text: string): string | undefined {
  if (JAPANESE_KANA.test(text)) return "ja"
  if (KOREAN_HANGUL.test(text)) return "ko"
  if (LATIN_LETTER.test(text) && !CJK_IDEOGRAPH.test(text)) return "en"
  return undefined
}

export function extractBangumiTranslatableText(summary: string): BangumiTranslatableText | null {
  const normalized = normalizeText(summary)
  if (!normalized) return null

  const marker = ORIGINAL_MARKER.exec(normalized)
  if (marker) {
    const text = normalizeText(normalized.slice(marker.index + marker[0].length))
    return text ? { text, source: sourceLanguageFor(text) } : null
  }

  const paragraphs = normalized.split(/\n\s*\n+/).map(normalizeText).filter(Boolean)
  const japaneseOrKorean = paragraphs.filter((paragraph) => JAPANESE_KANA.test(paragraph) || KOREAN_HANGUL.test(paragraph))
  if (japaneseOrKorean.length) {
    const text = japaneseOrKorean.join("\n\n")
    return { text, source: sourceLanguageFor(text) }
  }

  const nonChineseLatin = paragraphs.filter((paragraph) => LATIN_LETTER.test(paragraph) && !CJK_IDEOGRAPH.test(paragraph))
  if (nonChineseLatin.length) {
    return { text: nonChineseLatin.join("\n\n"), source: "en" }
  }

  if (!CJK_IDEOGRAPH.test(normalized)) {
    return { text: normalized, source: sourceLanguageFor(normalized) }
  }

  return null
}
