// OCR結果を解析するユーティリティ関数

// 名前を解析する改善版
export function parseNameImproved(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 除外キーワード（名前ではないもの）
  const excludePatterns = [
    /株式会社|有限会社|合同会社|Inc\.|Corp\.|Ltd\.|LLC/i,
    /部長|課長|係長|主任|マネージャー|ディレクター|Manager|Director/i,
    /CEO|CTO|CFO|COO|CMO|President|Vice|Executive/i,
    /Tel|TEL|Fax|FAX|Phone|Mobile/i,
    /E-mail|Email|Mail|@/i,
    /〒|郵便番号|住所|Address/i,
    /http|www\.|\.com|\.jp/i,
    /^\d+$/,  // 数字のみの行
  ];

  // 名前の可能性が高いパターン
  const namePatterns = [
    // 日本人の名前（姓 名）
    {
      pattern: /^([一-龯]{2,4})[\s　]+([一-龯]{2,4})$/,
      priority: 10,
      type: 'japanese_kanji'
    },
    // カタカナの名前
    {
      pattern: /^([ァ-ヶー]{2,6})[\s　]+([ァ-ヶー]{2,6})$/,
      priority: 9,
      type: 'japanese_katakana'
    },
    // ひらがなの名前（稀）
    {
      pattern: /^([ぁ-ん]{2,5})[\s　]+([ぁ-ん]{2,5})$/,
      priority: 8,
      type: 'japanese_hiragana'
    },
    // 英語名（First Last）
    {
      pattern: /^([A-Z][a-z]+)[\s]+([A-Z][a-z]+)$/,
      priority: 7,
      type: 'english_name'
    },
    // 英語名（FIRST LAST）
    {
      pattern: /^([A-Z]{2,})[\s]+([A-Z]{2,})$/,
      priority: 6,
      type: 'english_caps'
    },
    // 日本人の名前（姓名連続）
    {
      pattern: /^([一-龯]{2,4})([一-龯]{2,4})$/,
      priority: 5,
      type: 'japanese_continuous'
    },
  ];

  let bestMatch = { text: '', priority: -1 };

  // 各行を評価
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 除外パターンに該当する行はスキップ
    if (excludePatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    // 行の位置による優先度（上部にある行を優先）
    const positionBonus = (10 - i) * 0.5;

    // 名前パターンにマッチするか確認
    for (const { pattern, priority, type } of namePatterns) {
      const match = line.match(pattern);
      if (match) {
        const totalPriority = priority + positionBonus;
        console.log(`Found ${type} name: "${line}" (priority: ${totalPriority})`);
        
        if (totalPriority > bestMatch.priority) {
          bestMatch = { text: line, priority: totalPriority };
        }
      }
    }

    // パターンにマッチしない場合でも、適切な長さで上部にある行は候補とする
    if (bestMatch.priority < 0 && i < 5) {
      if (line.length >= 2 && line.length <= 20 && 
          !line.includes('@') && !/\d{3,}/.test(line)) {
        bestMatch = { text: line, priority: positionBonus };
      }
    }
  }

  return bestMatch.text;
}

// 会社名を解析する改善版
export function parseCompanyImproved(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 会社名のキーワード
  const companyKeywords = [
    '株式会社', '(株)', '㈱',
    '有限会社', '(有)', '㈲',
    '合同会社', '合資会社', '合名会社',
    'Inc.', 'Inc', 'Corporation', 'Corp.', 'Corp',
    'Co.', 'Ltd.', 'Limited', 'LLC', 'LLP',
    'Company', 'Group', 'Holdings',
    'K.K.', 'KK', 'G.K.'
  ];

  // 会社名の候補を収集
  const candidates: { text: string; score: number }[] = [];

  for (const line of lines) {
    let score = 0;
    let matchedKeyword = '';

    // キーワードを含む行を探す
    for (const keyword of companyKeywords) {
      if (line.includes(keyword)) {
        score += 10;
        matchedKeyword = keyword;
        
        // 株式会社などが前後にある場合はスコアを上げる
        if (line.startsWith(keyword) || line.endsWith(keyword)) {
          score += 5;
        }
        break;
      }
    }

    if (score > 0) {
      // URLやメールアドレスが含まれている場合はスコアを下げる
      if (line.includes('@') || line.includes('http')) {
        score -= 5;
      }

      // 適切な長さの会社名はスコアを上げる
      if (line.length >= 4 && line.length <= 30) {
        score += 3;
      }

      console.log(`Company candidate: "${line}" (score: ${score}, keyword: ${matchedKeyword})`);
      candidates.push({ text: line, score });
    }
  }

  // 最もスコアの高い候補を返す
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].text;
  }

  return '';
}

// 役職を解析する改善版
export function parsePositionImproved(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 役職のキーワード
  const positionKeywords = [
    // 日本語の役職
    '代表取締役', '取締役', '社長', '副社長', '専務', '常務',
    '執行役員', '執行役', '監査役',
    '部長', '次長', '課長', '係長', '主任', '主査',
    'マネージャー', 'マネジャー', 'リーダー', 'チーフ',
    'ディレクター', 'プロデューサー', 'エンジニア', 'デザイナー',
    'コンサルタント', 'アナリスト', 'スペシャリスト',
    
    // 英語の役職
    'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CIO',
    'President', 'Vice President', 'VP',
    'Director', 'Manager', 'Supervisor',
    'Lead', 'Senior', 'Junior', 'Chief',
    'Engineer', 'Developer', 'Designer',
    'Consultant', 'Analyst', 'Specialist',
    'Executive', 'Officer', 'Head of',
  ];

  // 役職の候補を収集
  const candidates: { text: string; score: number }[] = [];

  for (const line of lines) {
    let score = 0;
    const lowerLine = line.toLowerCase();

    // キーワードを含む行を探す
    for (const keyword of positionKeywords) {
      if (line.includes(keyword) || lowerLine.includes(keyword.toLowerCase())) {
        score += 10;

        // 役職だけの行の場合はスコアを上げる
        if (line === keyword || lowerLine === keyword.toLowerCase()) {
          score += 5;
        }

        // 適切な長さの場合はスコアを上げる
        if (line.length <= 20) {
          score += 3;
        }

        console.log(`Position candidate: "${line}" (score: ${score})`);
        candidates.push({ text: line, score });
        break;
      }
    }
  }

  // 最もスコアの高い候補を返す
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].text;
  }

  return '';
}

// 電話番号を解析する改善版
export function parsePhoneImproved(text: string): string {
  // 様々な電話番号フォーマットに対応
  const phonePatterns = [
    /(\d{3}-\d{4}-\d{4})/,           // 090-1234-5678
    /(\d{3}-\d{3}-\d{4})/,            // 03-123-4567
    /(\d{2}-\d{4}-\d{4})/,            // 03-1234-5678
    /(\d{4}-\d{2}-\d{4})/,            // 0120-12-3456
    /(\d{11})/,                       // 09012345678
    /(\d{10})/,                       // 0312345678
    /\((\d{3})\)\s*(\d{4})-(\d{4})/,  // (090) 1234-5678
    /(\d{3}\.\d{4}\.\d{4})/,          // 090.1234.5678
  ];

  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      // 数字以外を除去して統一フォーマットに
      const numbers = match[0].replace(/[^\d]/g, '');
      
      // 適切な長さの電話番号のみ返す
      if (numbers.length >= 10 && numbers.length <= 11) {
        // ハイフン区切りのフォーマットで返す
        if (numbers.length === 11) {
          return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
        } else if (numbers.length === 10) {
          return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        }
      }
    }
  }

  return '';
}

// メールアドレスを解析する改善版
export function parseEmailImproved(text: string): string {
  // メールアドレスの正規表現（より厳密）
  const emailPattern = /([a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,})/;
  const match = text.match(emailPattern);
  
  if (match) {
    const email = match[1].toLowerCase();
    // 一般的なメールアドレスの検証
    if (email.length <= 100 && !email.startsWith('.') && !email.endsWith('.')) {
      console.log(`Found email: ${email}`);
      return email;
    }
  }
  
  return '';
}

// 統合解析関数
export function parseBusinessCard(text: string) {
  console.log('=== Starting Business Card Parse ===');
  console.log('Input text:', text);
  
  const result = {
    fullName: parseNameImproved(text),
    email: parseEmailImproved(text),
    phone: parsePhoneImproved(text),
    company: parseCompanyImproved(text),
    position: parsePositionImproved(text),
  };
  
  console.log('=== Parse Result ===');
  console.log(result);
  
  return result;
}