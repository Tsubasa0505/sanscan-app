-- データの存在確認
SELECT COUNT(*) as contact_count FROM Contact;
SELECT COUNT(*) as company_count FROM Company;

-- 最近のデータを表示
SELECT id, fullName, email, createdAt FROM Contact ORDER BY createdAt DESC LIMIT 5;
SELECT id, name, createdAt FROM Company ORDER BY createdAt DESC LIMIT 5;