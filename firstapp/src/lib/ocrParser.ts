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

// 役職・部署を解析する強化版
export function parsePositionImproved(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 役職のキーワード（優先度付き・大幅拡充）
  const positionKeywords = [
    // 最高位役職（優先度最高）
    { keyword: '会長', score: 22 },
    { keyword: '代表取締役会長', score: 22 },
    { keyword: '代表取締役社長', score: 20 },
    { keyword: '代表取締役CEO', score: 20 },
    { keyword: '代表取締役', score: 18 },
    { keyword: '取締役会長', score: 19 },
    { keyword: '取締役社長', score: 18 },
    { keyword: '社長', score: 16 },
    { keyword: '副社長', score: 15 },
    { keyword: '会長CEO', score: 22 },
    
    // 役員クラス
    { keyword: '専務取締役', score: 15 },
    { keyword: '常務取締役', score: 15 },
    { keyword: '取締役副社長', score: 15 },
    { keyword: '専務', score: 14 },
    { keyword: '常務', score: 14 },
    { keyword: '取締役', score: 16 },
    { keyword: '執行役員', score: 13 },
    { keyword: '執行役', score: 12 },
    { keyword: '監査役', score: 12 },
    { keyword: '相談役', score: 14 },
    { keyword: '顧問', score: 13 },
    
    // 本部長・事業部長級
    { keyword: '本部長', score: 13 },
    { keyword: '事業本部長', score: 13 },
    { keyword: '営業本部長', score: 13 },
    { keyword: '技術本部長', score: 13 },
    { keyword: '事業部長', score: 12 },
    { keyword: '営業部長', score: 12 },
    { keyword: '技術部長', score: 12 },
    { keyword: '開発部長', score: 12 },
    { keyword: '企画部長', score: 12 },
    { keyword: '統括部長', score: 12 },
    { keyword: 'GM', score: 12 },
    { keyword: 'General Manager', score: 12 },
    
    // 部長級
    { keyword: '部長', score: 11 },
    { keyword: '副部長', score: 10 },
    { keyword: '部長代理', score: 10 },
    { keyword: '統括マネージャー', score: 11 },
    
    // 室長・センター長級
    { keyword: '室長', score: 11 },
    { keyword: 'センター長', score: 11 },
    { keyword: 'オフィス長', score: 11 },
    { keyword: 'ラボ長', score: 11 },
    { keyword: '工場長', score: 12 },
    { keyword: '支店長', score: 12 },
    { keyword: '営業所長', score: 12 },
    { keyword: '店長', score: 10 },
    
    // 次長・課長級
    { keyword: '次長', score: 10 },
    { keyword: '課長', score: 9 },
    { keyword: '副課長', score: 8 },
    { keyword: '課長代理', score: 8 },
    { keyword: '課長補佐', score: 8 },
    { keyword: 'グループ長', score: 9 },
    { keyword: 'チーム長', score: 9 },
    { keyword: 'ユニット長', score: 9 },
    
    // 係長・主任級
    { keyword: '係長', score: 8 },
    { keyword: '主任', score: 7 },
    { keyword: '副主任', score: 6 },
    { keyword: '主査', score: 7 },
    { keyword: '主事', score: 7 },
    { keyword: '班長', score: 7 },
    { keyword: '組長', score: 7 },
    { keyword: 'サブリーダー', score: 7 },
    
    // マネージャー系（カタカナ・英語両方）
    { keyword: 'エグゼクティブマネージャー', score: 14 },
    { keyword: 'ゼネラルマネージャー', score: 12 },
    { keyword: 'シニアマネージャー', score: 11 },
    { keyword: 'マネージャー', score: 10 },
    { keyword: 'マネジャー', score: 10 },
    { keyword: 'アシスタントマネージャー', score: 8 },
    { keyword: 'Executive Manager', score: 14 },
    { keyword: 'General Manager', score: 12 },
    { keyword: 'Senior Manager', score: 11 },
    { keyword: 'Manager', score: 10 },
    { keyword: 'Assistant Manager', score: 8 },
    
    // チーム系
    { keyword: 'チームリーダー', score: 9 },
    { keyword: 'Team Leader', score: 9 },
    { keyword: 'Team Lead', score: 9 },
    { keyword: 'リーダー', score: 8 },
    { keyword: 'Leader', score: 8 },
    { keyword: 'Lead', score: 8 },
    { keyword: 'チーフ', score: 8 },
    { keyword: 'Chief', score: 12 },
    { keyword: 'サブチーフ', score: 7 },
    
    // ディレクター系
    { keyword: 'エグゼクティブディレクター', score: 15 },
    { keyword: 'Executive Director', score: 15 },
    { keyword: 'シニアディレクター', score: 13 },
    { keyword: 'Senior Director', score: 13 },
    { keyword: 'ディレクター', score: 11 },
    { keyword: 'Director', score: 11 },
    { keyword: 'アソシエイトディレクター', score: 9 },
    { keyword: 'Associate Director', score: 9 },
    { keyword: 'クリエイティブディレクター', score: 11 },
    { keyword: 'アートディレクター', score: 10 },
    
    // 専門職・エンジニア系
    { keyword: 'CTO', score: 18 },
    { keyword: 'VP of Engineering', score: 16 },
    { keyword: 'Engineering Manager', score: 12 },
    { keyword: 'Tech Lead', score: 10 },
    { keyword: 'テックリード', score: 10 },
    { keyword: 'プリンシパルエンジニア', score: 12 },
    { keyword: 'Principal Engineer', score: 12 },
    { keyword: 'シニアエンジニア', score: 9 },
    { keyword: 'Senior Engineer', score: 9 },
    { keyword: 'リードエンジニア', score: 10 },
    { keyword: 'Lead Engineer', score: 10 },
    { keyword: 'エンジニア', score: 7 },
    { keyword: 'Engineer', score: 7 },
    { keyword: 'システムエンジニア', score: 7 },
    { keyword: 'SE', score: 7 },
    { keyword: 'プログラマー', score: 6 },
    { keyword: 'Programmer', score: 6 },
    
    // デザイン系
    { keyword: 'CDO', score: 18 },
    { keyword: 'デザイン統括', score: 12 },
    { keyword: 'シニアデザイナー', score: 9 },
    { keyword: 'Senior Designer', score: 9 },
    { keyword: 'リードデザイナー', score: 10 },
    { keyword: 'Lead Designer', score: 10 },
    { keyword: 'デザイナー', score: 7 },
    { keyword: 'Designer', score: 7 },
    { keyword: 'UXデザイナー', score: 8 },
    { keyword: 'UIデザイナー', score: 8 },
    { keyword: 'グラフィックデザイナー', score: 7 },
    { keyword: 'Webデザイナー', score: 7 },
    
    // プロダクト・企画系
    { keyword: 'CPO', score: 18 },
    { keyword: 'プロダクトマネージャー', score: 11 },
    { keyword: 'Product Manager', score: 11 },
    { keyword: 'PM', score: 10 },
    { keyword: 'プロダクトオーナー', score: 10 },
    { keyword: 'Product Owner', score: 10 },
    { keyword: 'PO', score: 9 },
    { keyword: 'プロデューサー', score: 10 },
    { keyword: 'Producer', score: 10 },
    { keyword: 'プランナー', score: 8 },
    { keyword: 'Planner', score: 8 },
    
    // 営業系
    { keyword: 'CMO', score: 16 },
    { keyword: '営業統括', score: 12 },
    { keyword: 'Sales Manager', score: 10 },
    { keyword: 'セールスマネージャー', score: 10 },
    { keyword: 'Account Manager', score: 9 },
    { keyword: 'アカウントマネージャー', score: 9 },
    { keyword: '営業', score: 6 },
    { keyword: 'Sales', score: 6 },
    { keyword: 'セールス', score: 6 },
    
    // コンサル・アナリスト系
    { keyword: 'パートナー', score: 15 },
    { keyword: 'Partner', score: 15 },
    { keyword: 'プリンシパル', score: 13 },
    { keyword: 'Principal', score: 13 },
    { keyword: 'シニアコンサルタント', score: 10 },
    { keyword: 'Senior Consultant', score: 10 },
    { keyword: 'コンサルタント', score: 8 },
    { keyword: 'Consultant', score: 8 },
    { keyword: 'シニアアナリスト', score: 9 },
    { keyword: 'Senior Analyst', score: 9 },
    { keyword: 'アナリスト', score: 7 },
    { keyword: 'Analyst', score: 7 },
    { keyword: 'スペシャリスト', score: 8 },
    { keyword: 'Specialist', score: 8 },
    
    // その他英語役職
    { keyword: 'CEO', score: 20 },
    { keyword: 'COO', score: 18 },
    { keyword: 'CFO', score: 18 },
    { keyword: 'CIO', score: 16 },
    { keyword: 'President', score: 18 },
    { keyword: 'Vice President', score: 15 },
    { keyword: 'VP', score: 15 },
    { keyword: 'SVP', score: 16 },
    { keyword: 'EVP', score: 17 },
    { keyword: 'Supervisor', score: 9 },
    { keyword: 'Senior', score: 7 },
    { keyword: 'Junior', score: 6 },
    { keyword: 'Head of', score: 11 },
    { keyword: 'Executive', score: 14 },
    { keyword: 'Officer', score: 12 },
    { keyword: 'Associate', score: 7 },
    { keyword: 'Coordinator', score: 7 },
    { keyword: 'Administrator', score: 8 },
  ];

  // 部署のキーワード（大幅拡充）
  const departmentKeywords = [
    // 営業関連
    '営業部', '営業本部', '営業企画部', '営業推進部', '営業支援部', '営業戦略部',
    '第一営業部', '第二営業部', '第三営業部', '第１営業部', '第２営業部', '第３営業部',
    '東日本営業部', '西日本営業部', '関東営業部', '関西営業部', '九州営業部',
    '海外営業部', '国内営業部', '法人営業部', '個人営業部',
    'セールス部', 'Sales部', 'セールス&マーケティング部',
    
    // 企画・戦略関連
    '経営企画部', '企画部', '企画開発部', '事業企画部', '戦略企画部',
    '新規事業部', '事業開発部', '事業戦略部', 'ビジネス開発部', 'BD部',
    '商品企画部', 'サービス企画部', '商品開発部', 'サービス開発部',
    
    // 管理部門
    '総務部', '人事部', '人事総務部', '総務人事部', '人事企画部',
    '経理部', '財務部', '経理財務部', '財務経理部', '会計部',
    '法務部', 'コンプライアンス部', '監査部', '内部監査部',
    'リスク管理部', '管理部', '業務部', '統制部',
    
    // 技術・開発関連
    '技術部', '開発部', '研究開発部', 'R&D部', 'エンジニアリング部',
    'システム部', 'IT部', '情報システム部', 'システム企画部', 'IT企画部',
    'ソフトウェア部', 'ハードウェア部', 'インフラ部', 'クラウド部',
    'プロダクト部', 'プロダクト開発部', 'テクノロジー部',
    'データサイエンス部', 'AI部', 'デジタル技術部', 'DX推進部',
    
    // マーケティング・広報関連
    'マーケティング部', 'マーケティング企画部', 'デジタルマーケティング部',
    '広報部', 'PR部', '宣伝部', '広報宣伝部', 'コミュニケーション部',
    'ブランド部', 'ブランド戦略部', 'プロモーション部',
    
    // デザイン・クリエイティブ関連
    'デザイン部', 'クリエイティブ部', 'UXデザイン部', 'UIデザイン部',
    'プロダクトデザイン部', 'Webデザイン部', 'グラフィックデザイン部',
    
    // 品質・製造関連
    '品質管理部', '品質保証部', 'QA部', 'QC部',
    '製造部', '生産部', '生産管理部', '製造技術部',
    '工場', '第一工場', '第二工場', '本社工場',
    
    // カスタマー・サービス関連
    'カスタマーサポート部', 'サポート部', 'サービス部', 'CS部',
    'カスタマーサクセス部', 'カスタマーエクスペリエンス部',
    'テクニカルサポート部', 'ヘルプデスク部',
    
    // 海外・国際関連
    '海外事業部', '国際事業部', '海外営業部', 'グローバル事業部',
    'アジア事業部', '中国事業部', '北米事業部', '欧州事業部',
    
    // その他専門部署
    '調達部', '購買部', '物流部', 'ロジスティクス部', 'SCM部',
    '営業企画室', '経営企画室', 'IR室', '広報室', '秘書室',
    'コールセンター', 'データセンター', 'テクニカルセンター',
    'イノベーションセンター', 'R&Dセンター', 'デザインセンター',
    
    // 本部・事業部
    '営業本部', '技術本部', '事業本部', '管理本部', '企画本部',
    'システム本部', 'IT本部', 'デジタル本部', 'プロダクト本部',
    
    // 課・グループ・チーム
    '営業課', '企画課', '技術課', '開発課', '総務課', '人事課', '経理課',
    '営業グループ', '開発グループ', '企画グループ', 'システムグループ',
    '営業チーム', '開発チーム', '企画チーム', 'マーケティングチーム',
    
    // 英語部署名
    'Sales Department', 'Marketing Department', 'Engineering Department',
    'Product Department', 'Design Department', 'HR Department',
    'Finance Department', 'Legal Department', 'IT Department',
    'Operations Department', 'Customer Support', 'Business Development',
  ];

  const candidates: { text: string; score: number; type: string }[] = [];

  // 各行を詳細に分析
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // 役職キーワードマッチング
    for (const { keyword, score: baseScore } of positionKeywords) {
      if (line.includes(keyword) || lowerLine.includes(keyword.toLowerCase())) {
        let totalScore = baseScore;
        
        // 行の位置による調整（上部にあるほど役職の可能性高い）
        if (i < 5) totalScore += 3;
        if (i < 3) totalScore += 2;
        
        // 単独行の場合はスコアアップ
        if (line.trim() === keyword) {
          totalScore += 5;
        }
        
        // 短い行の場合はスコアアップ（役職だけ書かれている可能性）
        if (line.length <= 15) {
          totalScore += 3;
        }
        
        // 名前っぽい文字が含まれている場合はスコアダウン
        if (/[一-龯]{2,4}\s+[一-龯]{2,4}/.test(line)) {
          totalScore -= 5;
        }
        
        // メールアドレスや電話番号が含まれている場合はスコアダウン
        if (line.includes('@') || /\d{2,4}-\d{2,4}-\d{4}/.test(line)) {
          totalScore -= 10;
        }
        
        console.log(`Position candidate: "${line}" (keyword: ${keyword}, score: ${totalScore})`);
        candidates.push({ text: line, score: totalScore, type: 'position' });
        break;
      }
    }
    
    // 部署キーワードマッチング
    for (const dept of departmentKeywords) {
      if (line.includes(dept)) {
        let score = 10;
        
        // 行の位置による調整
        if (i < 8) score += 2;
        
        // 部署名だけの行の場合
        if (line.trim() === dept) {
          score += 3;
        }
        
        console.log(`Department candidate: "${line}" (keyword: ${dept}, score: ${score})`);
        candidates.push({ text: line, score: score, type: 'department' });
        break;
      }
    }
  }

  // 日本語名刺特有のパターンを追加検索
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // パターン1: 「営業部 部長」のような組み合わせ
    const combinationPattern1 = /([^\s]+部|[^\s]+課|[^\s]+室|[^\s]+センター|[^\s]+本部|[^\s]+グループ|[^\s]+チーム)\s*([^\s]*長|[^\s]*マネージャー|[^\s]*ディレクター)/;
    const match1 = line.match(combinationPattern1);
    if (match1) {
      const score = 15 + (i < 5 ? 3 : 0);
      console.log(`Department-Position combination: "${line}" (score: ${score})`);
      candidates.push({ text: line, score: score, type: 'dept-position' });
    }
    
    // パターン2: 「営業部部長」のような連続パターン
    const combinationPattern2 = /([^\s]+部|[^\s]+課|[^\s]+室|[^\s]+センター|[^\s]+本部)([^\s]*長|マネージャー|ディレクター)/;
    const match2 = line.match(combinationPattern2);
    if (match2 && !match1) { // pattern1でマッチしてない場合のみ
      const score = 14 + (i < 5 ? 3 : 0);
      console.log(`Continuous dept-position: "${line}" (score: ${score})`);
      candidates.push({ text: line, score: score, type: 'dept-position-continuous' });
    }
    
    // パターン3: 「第○営業部」のような番号付き部署
    const numberedDeptPattern = /第[一二三四五六七八九十０-９1-9]+[^\s]*部|[０-９1-9]+[^\s]*部/;
    if (numberedDeptPattern.test(line)) {
      const score = 12 + (i < 6 ? 2 : 0);
      console.log(`Numbered department: "${line}" (score: ${score})`);
      candidates.push({ text: line, score: score, type: 'numbered-dept' });
    }
    
    // パターン4: 「○○担当」のような担当職
    const responsiblePattern = /[^\s]*担当/;
    if (responsiblePattern.test(line) && line.length <= 12) {
      const score = 8 + (i < 6 ? 2 : 0);
      console.log(`Responsible position: "${line}" (score: ${score})`);
      candidates.push({ text: line, score: score, type: 'responsible' });
    }
    
    // パターン5: 「取締役○○部長」のような複合役職
    const complexPattern = /(代表取締役|取締役|執行役員)[\s]*([^\s]*部長|[^\s]*本部長|[^\s]*事業部長)/;
    const match5 = line.match(complexPattern);
    if (match5) {
      const score = 18 + (i < 3 ? 4 : 0);
      console.log(`Complex executive position: "${line}" (score: ${score})`);
      candidates.push({ text: line, score: score, type: 'complex-executive' });
    }
    
    // パターン6: 「○○部 ○○課」のような階層構造
    const hierarchyPattern = /([^\s]+部|[^\s]+本部)\s+([^\s]+課|[^\s]+グループ|[^\s]+チーム)/;
    const match6 = line.match(hierarchyPattern);
    if (match6) {
      const score = 11 + (i < 6 ? 2 : 0);
      console.log(`Department hierarchy: "${line}" (score: ${score})`);
      candidates.push({ text: line, score: score, type: 'hierarchy' });
    }
    
    // パターン7: 英語の「Head of ○○」「VP of ○○」
    const englishTitlePattern = /(Head of|VP of|Director of|Manager of)\s+[A-Za-z\s]+/i;
    const match7 = line.match(englishTitlePattern);
    if (match7) {
      const score = 13 + (i < 5 ? 3 : 0);
      console.log(`English title pattern: "${line}" (score: ${score})`);
      candidates.push({ text: line, score: score, type: 'english-title' });
    }
  }

  // スコア順にソートして最適な候補を選択
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const bestCandidate = candidates[0];
    
    console.log(`Best position/department: "${bestCandidate.text}" (type: ${bestCandidate.type}, score: ${bestCandidate.score})`);
    return bestCandidate.text;
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

// 住所を解析する関数
export function parseAddressImproved(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 住所のパターン
  const addressPatterns = [
    // 郵便番号パターン
    /〒\s*(\d{3}-\d{4}|\d{7})/,
    /郵便番号\s*(\d{3}-\d{4}|\d{7})/,
    /ZIP\s*(\d{3}-\d{4}|\d{7})/i,
    
    // 都道府県パターン
    /(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/,
    
    // 市区町村パターン
    /[一-龯ぁ-んァ-ヶー\w\s-]+[市区町村]/,
    
    // 番地・丁目パターン
    /\d+[-－]\d+[-－]\d+/,
    /\d+丁目\d+番\d+号/,
    /\d+丁目\d+[-－]\d+/,
    
    // ビル名パターン
    /[一-龯ぁ-んァ-ヶーA-Za-z\d\s]*ビル/,
    /[一-龯ぁ-んァ-ヶーA-Za-z\d\s]*タワー/,
    /[一-龯ぁ-んァ-ヶーA-Za-z\d\s]*センター/,
    
    // 階数パターン
    /\d+[FfＦｆ階]/,
  ];
  
  const addressCandidates: { text: string; score: number; type: string }[] = [];
  let postalCodeFound = false;
  let prefectureFound = false;
  
  // 各行を分析
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let score = 0;
    let matchType = '';
    
    // 郵便番号チェック
    for (const pattern of addressPatterns.slice(0, 3)) {
      if (pattern.test(line)) {
        score += 15;
        matchType = 'postal';
        postalCodeFound = true;
        break;
      }
    }
    
    // 都道府県チェック
    if (addressPatterns[3].test(line)) {
      score += 12;
      matchType = matchType ? matchType + '-prefecture' : 'prefecture';
      prefectureFound = true;
    }
    
    // 市区町村チェック
    if (addressPatterns[4].test(line) && line.length >= 3) {
      score += 10;
      matchType = matchType ? matchType + '-city' : 'city';
    }
    
    // 番地・丁目チェック
    for (const pattern of addressPatterns.slice(5, 8)) {
      if (pattern.test(line)) {
        score += 8;
        matchType = matchType ? matchType + '-address' : 'address';
        break;
      }
    }
    
    // ビル名チェック
    for (const pattern of addressPatterns.slice(8, 11)) {
      if (pattern.test(line)) {
        score += 6;
        matchType = matchType ? matchType + '-building' : 'building';
        break;
      }
    }
    
    // 階数チェック
    if (addressPatterns[11].test(line)) {
      score += 4;
      matchType = matchType ? matchType + '-floor' : 'floor';
    }
    
    // その他の住所らしい特徴
    // 数字とハイフンを含む行
    if (/\d+[-－]\d+/.test(line)) {
      score += 3;
    }
    
    // 「町」「丁」「番」「号」を含む行
    if (/[町丁番号]/.test(line)) {
      score += 4;
    }
    
    // 行の位置による調整（名刺下部に住所があることが多い）
    if (i > lines.length / 2) {
      score += 2;
    }
    
    // 長すぎる行や短すぎる行は除外
    if (line.length < 3 || line.length > 100) {
      score -= 5;
    }
    
    // メールアドレスや電話番号が含まれている場合はスコアダウン
    if (line.includes('@') || /\d{2,4}-\d{2,4}-\d{4}/.test(line)) {
      score -= 10;
    }
    
    // 会社名や人名っぽい場合はスコアダウン
    if (/株式会社|有限会社|合同会社/.test(line) || /[一-龯]{2,4}\s+[一-龯]{2,4}/.test(line)) {
      score -= 8;
    }
    
    if (score > 0) {
      console.log(`Address candidate: "${line}" (type: ${matchType}, score: ${score})`);
      addressCandidates.push({ text: line, score: score, type: matchType });
    }
  }
  
  // 複数行にまたがる住所を結合する試行
  if (addressCandidates.length >= 2) {
    // スコア順にソート
    addressCandidates.sort((a, b) => b.score - a.score);
    
    // 連続する行や近い行を結合
    const combinedAddresses: string[] = [];
    const usedIndices = new Set<number>();
    
    for (let i = 0; i < addressCandidates.length && combinedAddresses.length < 3; i++) {
      if (usedIndices.has(i)) continue;
      
      const currentLine = addressCandidates[i].text;
      const currentIndex = lines.indexOf(currentLine);
      let combined = currentLine;
      
      // 近くの行を結合
      for (let j = i + 1; j < addressCandidates.length; j++) {
        if (usedIndices.has(j)) continue;
        
        const nextLine = addressCandidates[j].text;
        const nextIndex = lines.indexOf(nextLine);
        
        // 3行以内の近い行を結合
        if (Math.abs(currentIndex - nextIndex) <= 3) {
          if (currentIndex < nextIndex) {
            combined += ' ' + nextLine;
          } else {
            combined = nextLine + ' ' + combined;
          }
          usedIndices.add(j);
        }
      }
      
      usedIndices.add(i);
      combinedAddresses.push(combined);
    }
    
    if (combinedAddresses.length > 0) {
      const bestAddress = combinedAddresses[0];
      console.log(`Best combined address: "${bestAddress}"`);
      return bestAddress;
    }
  }
  
  // 単一行の最高スコア住所を返す
  if (addressCandidates.length > 0) {
    addressCandidates.sort((a, b) => b.score - a.score);
    const bestAddress = addressCandidates[0];
    console.log(`Best address: "${bestAddress.text}" (type: ${bestAddress.type}, score: ${bestAddress.score})`);
    return bestAddress.text;
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
    address: parseAddressImproved(text),
  };
  
  console.log('=== Parse Result ===');
  console.log(result);
  
  return result;
}