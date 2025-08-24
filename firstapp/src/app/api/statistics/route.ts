import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createJsonResponse, createErrorResponse } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // 日付フィルターの準備
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } : {};
    // 総連絡先数
    const totalContacts = await prisma.contact.count({ where: dateFilter });
    
    // 総会社数（期間フィルターがある場合は、その期間に作成された連絡先の会社をカウント）
    const totalCompanies = startDate && endDate ? 
      await prisma.company.count({
        where: {
          contacts: {
            some: dateFilter
          }
        }
      }) : 
      await prisma.company.count();
    
    // 会社別集計
    const companiesWithCounts = await prisma.company.findMany({
      include: {
        _count: {
          select: { contacts: true }
        }
      },
      orderBy: {
        contacts: {
          _count: 'desc'
        }
      },
      take: 10 // Top 10 companies
    });
    
    // 月別登録数（期間内または過去12ヶ月）
    const dataStartDate = startDate ? new Date(startDate) : (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 11);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    })();
    const dataEndDate = endDate ? new Date(endDate) : new Date();
    
    const contacts = await prisma.contact.findMany({
      where: {
        createdAt: {
          gte: dataStartDate,
          lte: dataEndDate
        }
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // 月別に集計
    const monthlyData: { [key: string]: number } = {};
    
    // 過去12ヶ月のラベルを初期化
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = 0;
    }
    
    // 実データをカウント
    contacts.forEach(contact => {
      const date = new Date(contact.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData.hasOwnProperty(key)) {
        monthlyData[key]++;
      }
    });
    
    // 配列形式に変換
    const monthlyRegistrations = Object.entries(monthlyData).map(([month, count]) => ({
      month: month,
      displayMonth: new Date(month + '-01').toLocaleDateString('ja-JP', { 
        year: 'numeric', 
        month: 'short' 
      }),
      count
    }));
    
    // 最近追加された連絡先（5件）
    const recentContacts = await prisma.contact.findMany({
      where: dateFilter,
      include: {
        company: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    // メールありなしの割合
    const withEmail = await prisma.contact.count({
      where: {
        ...dateFilter,
        email: {
          not: null
        }
      }
    });
    
    // 電話番号ありなしの割合
    const withPhone = await prisma.contact.count({
      where: {
        ...dateFilter,
        phone: {
          not: null
        }
      }
    });
    
    // OCR・名刺画像関連の統計
    const withBusinessCard = await prisma.contact.count({
      where: {
        ...dateFilter,
        businessCardImage: {
          not: null
        }
      }
    });
    
    const withProfileImage = await prisma.contact.count({
      where: {
        ...dateFilter,
        profileImage: {
          not: null
        }
      }
    });
    
    // OCRで作成された連絡先（メモにOCRが含まれるもの）
    const ocrContacts = await prisma.contact.count({
      where: {
        ...dateFilter,
        notes: {
          contains: "OCR"
        }
      }
    });
    
    // 重要度別統計
    const importanceStats = await prisma.contact.groupBy({
      by: ['importance'],
      where: dateFilter,
      _count: {
        importance: true
      },
      orderBy: {
        importance: 'asc'
      }
    });
    
    // 統計データをまとめて返す
    const statistics = {
      overview: {
        totalContacts,
        totalCompanies,
        contactsWithEmail: withEmail,
        contactsWithPhone: withPhone,
        emailPercentage: totalContacts > 0 ? Math.round((withEmail / totalContacts) * 100) : 0,
        phonePercentage: totalContacts > 0 ? Math.round((withPhone / totalContacts) * 100) : 0,
        // 新しい統計項目
        contactsWithBusinessCard: withBusinessCard,
        contactsWithProfileImage: withProfileImage,
        ocrContacts: ocrContacts,
        businessCardPercentage: totalContacts > 0 ? Math.round((withBusinessCard / totalContacts) * 100) : 0,
        profileImagePercentage: totalContacts > 0 ? Math.round((withProfileImage / totalContacts) * 100) : 0,
        ocrPercentage: totalContacts > 0 ? Math.round((ocrContacts / totalContacts) * 100) : 0
      },
      companiesWithCounts: companiesWithCounts.map(company => ({
        name: company.name,
        count: company._count.contacts
      })),
      monthlyRegistrations,
      recentContacts: recentContacts.map(contact => ({
        id: contact.id,
        fullName: contact.fullName,
        companyName: contact.company?.name || null,
        createdAt: contact.createdAt
      })),
      // 重要度別統計
      importanceDistribution: importanceStats.map(stat => ({
        importance: stat.importance,
        count: stat._count.importance,
        label: stat.importance === 5 ? '最重要' : 
               stat.importance === 4 ? '重要' :
               stat.importance === 3 ? '普通' :
               stat.importance === 2 ? 'やや低' : '低い'
      }))
    };
    
    return createJsonResponse(statistics);
  } catch (e) {
    console.error("GET /api/statistics error:", e);
    return createErrorResponse(e instanceof Error ? e.message : "Server error", 500);
  }
}