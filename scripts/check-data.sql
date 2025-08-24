SELECT COUNT(*) as count, 'Contact' as table_name FROM Contact
UNION ALL
SELECT COUNT(*) as count, 'Company' as table_name FROM Company;