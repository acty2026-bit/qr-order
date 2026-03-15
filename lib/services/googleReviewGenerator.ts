type GenerateGoogleReviewInput = {
  dishNames?: string[];
};

function fallbackReview(input: GenerateGoogleReviewInput) {
  const dish = input.dishNames?.find((name) => name.trim().length > 0)?.trim();
  if (dish) {
    return `${dish}がとても美味しく、店員さんの対応も丁寧でした。雰囲気も良く、また来たいと思える素敵なお店です。`;
  }
  return '料理が美味しく、店員さんの対応も丁寧で居心地の良いお店でした。またぜひ利用したいです。';
}

function normalizeReview(text: string, input: GenerateGoogleReviewInput) {
  const cleaned = text.replace(/^["'「]|["'」]$/g, '').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 50) return fallbackReview(input);
  if (cleaned.length > 120) return cleaned.slice(0, 120);
  return cleaned;
}

export async function generateGoogleReview(input: GenerateGoogleReviewInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { review: fallbackReview(input), usedFallback: true };
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const dishLine =
    input.dishNames && input.dishNames.length > 0
      ? `料理名候補: ${input.dishNames.slice(0, 3).join('、')}`
      : '料理名候補: なし';

  const prompt = [
    '以下の条件で口コミを生成してください。',
    '・飲食店レビュー',
    '・ポジティブ',
    '・50〜120文字',
    '・自然な日本語',
    '・短く読みやすい',
    '・星5レビュー想定',
    '料理名がある場合は文章に含める。',
    dishLine,
    '出力は口コミ本文のみ。引用符や見出しは不要。'
  ].join('\n');

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: prompt
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`口コミ生成に失敗しました: ${text}`);
  }

  const data = (await res.json()) as { output_text?: string };
  const review = normalizeReview(data.output_text ?? '', input);
  if (!review) {
    return { review: fallbackReview(input), usedFallback: true };
  }

  return { review, usedFallback: false };
}
