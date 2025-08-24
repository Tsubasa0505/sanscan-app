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
    if (!body.to || !body.subject || !body.content) {
      return NextResponse.json(
        { error: "宛先、件名、本文は必須です" },
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

    // メールオプション
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: body.to,
      cc: body.cc || undefined,
      bcc: body.bcc || undefined,
      subject: body.subject,
      text: body.content,
      html: body.html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0;">${body.subject}</h2>
          </div>
          <div style="padding: 20px; background: #f7f7f7; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 20px; border-radius: 5px;">
              ${body.content.replace(/\n/g, '<br>')}
            </div>
            ${body.signature ? `
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 14px;">${body.signature}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `,
    };

    // メール送信
    const info = await transporter.sendMail(mailOptions);

    // 送信履歴を記録（contactIdが提供された場合）
    if (body.contactId) {
      await prisma.contactHistory.create({
        data: {
          contactId: body.contactId,
          type: "email",
          subject: body.subject,
          notes: `メール送信: ${body.to}`,
        },
      });

      // 最終連絡日を更新
      await prisma.contact.update({
        where: { id: body.contactId },
        data: { lastContactAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: "メールを送信しました",
    });
  } catch (error) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "メール送信に失敗しました",
        details: error instanceof Error ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

// テンプレート取得
export async function GET() {
  // メールテンプレートのサンプルを返す
  const templates = [
    {
      id: "greeting",
      name: "初回挨拶",
      subject: "はじめまして - {{fullName}}様",
      content: `{{fullName}}様

はじめまして。
{{senderName}}と申します。

この度は、{{occasion}}にてお会いできて大変嬉しく思います。

今後ともよろしくお願いいたします。

{{senderName}}`,
    },
    {
      id: "followup",
      name: "フォローアップ",
      subject: "先日はありがとうございました",
      content: `{{fullName}}様

お世話になっております。
{{senderName}}です。

先日は貴重なお時間をいただき、ありがとうございました。

{{content}}

今後ともよろしくお願いいたします。

{{senderName}}`,
    },
    {
      id: "invitation",
      name: "イベント招待",
      subject: "【ご案内】{{eventName}}のお知らせ",
      content: `{{fullName}}様

お世話になっております。
{{senderName}}です。

{{eventName}}を開催することになりましたので、ご案内させていただきます。

日時: {{date}}
場所: {{location}}
内容: {{description}}

ご参加いただければ幸いです。

{{senderName}}`,
    },
  ];

  return NextResponse.json(templates);
}