/**
 * CLAUDE.md準拠チェックスクリプト
 * プロジェクトがCLAUDE.mdの指示に従っているか検証
 */

const fs = require('fs');
const path = require('path');

// チェック項目
const checks = {
  // 技術スタック確認
  techStack: {
    name: '技術スタック',
    files: ['package.json', 'prisma/schema.prisma'],
    patterns: ['next', 'prisma', 'typescript', 'tailwindcss']
  },
  
  // 日本語コメント確認
  japaneseComments: {
    name: '日本語コメント',
    paths: ['src/app/api'],
    pattern: /\/\*\*[\s\S]*?日本語|\/\/.*日本語|CLAUDE\.md/
  },
  
  // Company.nameのunique制約確認
  companyUnique: {
    name: 'Company.nameのunique制約',
    files: ['prisma/schema.prisma'],
    pattern: /model\s+Company[\s\S]*?name[\s\S]*?@unique/
  },
  
  // connectOrCreate使用確認
  connectOrCreate: {
    name: 'connectOrCreate使用',
    paths: ['src/app/api'],
    pattern: /connectOrCreate/
  },
  
  // 環境変数の直接出力禁止
  envVarExposure: {
    name: '環境変数の非出力',
    paths: ['src'],
    negativePattern: /console\.log\(.*process\.env/
  }
};

// ファイル内容チェック
function checkFile(filePath, pattern, isNegative = false) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = pattern.test(content);
    return isNegative ? !found : found;
  } catch (error) {
    return false;
  }
}

// ディレクトリ内のファイルを再帰的にチェック
function checkDirectory(dirPath, pattern, isNegative = false) {
  let found = false;
  
  function walkDir(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'generated') {
          walkDir(filePath);
        } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
          // generatedディレクトリ内のファイルは除外
          if (!filePath.includes('generated') && checkFile(filePath, pattern, isNegative)) {
            found = true;
          }
        }
      }
    } catch (error) {
      // ディレクトリアクセスエラーは無視
    }
  }
  
  walkDir(dirPath);
  return found;
}

// メインチェック処理
function runChecks() {
  console.log('🔍 CLAUDE.md準拠チェックを開始...\n');
  
  let allPassed = true;
  const results = [];
  
  // 技術スタックチェック
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const techStackOk = checks.techStack.patterns.every(tech => 
    Object.keys(deps).some(dep => dep.includes(tech))
  );
  results.push({
    name: checks.techStack.name,
    passed: techStackOk,
    message: techStackOk ? '✅ 指定された技術スタックを使用' : '❌ 技術スタックが不完全'
  });
  
  // 日本語コメントチェック
  const hasJapaneseComments = checks.japaneseComments.paths.some(p =>
    checkDirectory(path.join(process.cwd(), p), checks.japaneseComments.pattern)
  );
  results.push({
    name: checks.japaneseComments.name,
    passed: hasJapaneseComments,
    message: hasJapaneseComments ? '✅ 日本語コメントあり' : '⚠️ 日本語コメントを追加推奨'
  });
  
  // Company.nameのunique制約チェック
  const hasCompanyUnique = checkFile('prisma/schema.prisma', checks.companyUnique.pattern);
  results.push({
    name: checks.companyUnique.name,
    passed: hasCompanyUnique,
    message: hasCompanyUnique ? '✅ Company.nameにunique制約あり' : '❌ Company.nameにunique制約なし'
  });
  
  // connectOrCreate使用チェック
  const usesConnectOrCreate = checks.connectOrCreate.paths.some(p =>
    checkDirectory(path.join(process.cwd(), p), checks.connectOrCreate.pattern)
  );
  results.push({
    name: checks.connectOrCreate.name,
    passed: usesConnectOrCreate,
    message: usesConnectOrCreate ? '✅ connectOrCreateを使用' : '⚠️ connectOrCreateの使用を確認'
  });
  
  // 環境変数露出チェック（generatedディレクトリは除外）
  const noEnvExposure = !checks.envVarExposure.paths.some(p => {
    const fullPath = path.join(process.cwd(), p);
    // generatedディレクトリは除外
    if (fullPath.includes('generated')) return false;
    return checkDirectory(fullPath, checks.envVarExposure.negativePattern);
  });
  results.push({
    name: checks.envVarExposure.name,
    passed: noEnvExposure,
    message: noEnvExposure ? '✅ 環境変数の露出なし' : '❌ 環境変数が出力されている可能性'
  });
  
  // 結果表示
  console.log('📋 チェック結果:\n');
  results.forEach(result => {
    console.log(`${result.message}`);
    if (!result.passed && result.name !== '日本語コメント') {
      allPassed = false;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ CLAUDE.md準拠: すべての必須項目をクリア');
  } else {
    console.log('⚠️ CLAUDE.md準拠: 一部改善が必要');
    process.exit(1);
  }
}

// 実行
runChecks();