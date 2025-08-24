import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// メール送信設定
const createTransporter = () => {
  // 環境変数チェック
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === "your-email@gmail.com") {
    return null;
  }

  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 必須項目チェック
    if (!body.contactIds || !body.subject || !body.content) {
      return NextResponse.json(
        { error: "連絡先ID、件名、本文は必須です" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.contactIds) || body.contactIds.length === 0) {
      return NextResponse.json(
        { error: "送信先の連絡先を選択してください" },
        { status: 400 }
      );
    }

    // トランスポーター作成
    const transporter = createTransporter();
    
    if (!transporter) {
      return NextResponse.json(
        { 
          error: "メール設定が完了していません。.envファイルのEMAIL設定を確認してください",
          setupInstructions: {
            step1: "Gmailで2段階認証を有効化",
            step2: "アプリパスワードを生成: https://myaccount.google.com/apppasswords",
            step3: ".envファイルのEMAIL_USERとEMAIL_PASSを設定"
          }
        },
        { status: 503 }
      );
    }

    // 送信先の連絡先情報を取得
    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: body.contactIds },
        email: { not: null, not: "" }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        company: { select: { name: true } }
      }
    });

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "メールアドレスを持つ連絡先が見つかりません" },
        { status: 400 }
      );
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as string[],
      sent: [] as string[]
    };

    // 各連絡先に個別にメール送信
    for (const contact of contacts) {
      try {
        if (!contact.email) {
          results.failureCount++;
          results.errors.push(`${contact.fullName}: メールアドレスがありません`);
          continue;
        }

        // メールオプション
        const mailOptions = {
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: contact.email,
          subject: body.subject.replace(/{{fullName}}/g, contact.fullName),
          text: body.content
            .replace(/{{fullName}}/g, contact.fullName)
            .replace(/{{companyName}}/g, contact.company?.name || ""),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                <h2 style="margin: 0;">${body.subject.replace(/{{fullName}}/g, contact.fullName)}</h2>
              </div>
              <div style="padding: 20px; background: #f7f7f7; border-radius: 0 0 10px 10px;">
                <div style="background: white; padding: 20px; border-radius: 5px;">
                  ${body.content
                    .replace(/{{fullName}}/g, contact.fullName)
                    .replace(/{{companyName}}/g, contact.company?.name || "")
                    .replace(/\n/g, '<br>')}
                </div>
              </div>
            </div>
          `,
        };

        // メール送信
        await transporter.sendMail(mailOptions);
        
        // 送信履歴を記録
        await prisma.contactHistory.create({
          data: {
            contactId: contact.id,
            type: "email",
            subject: body.subject,
            notes: `一括メール送信: ${contact.email}`,
          },
        });

        // 最終連絡日を更新
        await prisma.contact.update({
          where: { id: contact.id },
          data: { lastContactAt: new Date() },
        });

        results.successCount++;
        results.sent.push(`${contact.fullName} (${contact.email})`);

      } catch (error) {
        console.error(`メール送信エラー (${contact.fullName}):`, error);
        results.failureCount++;
        results.errors.push(
          `${contact.fullName} (${contact.email}): ${error instanceof Error ? error.message : "送信エラー"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      successCount: results.successCount,
      failureCount: results.failureCount,
      totalContacts: contacts.length,
      message: `${results.successCount}件のメールを送信しました${results.failureCount > 0 ? ` (${results.failureCount}件失敗)` : ""}`,
      details: {
        sent: results.sent,
        errors: results.errors
      }
    });
  } catch (error) {
    console.error("Bulk email sending error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "一括メール送信に失敗しました",
        details: error instanceof Error ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}