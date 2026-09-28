// ============================================================
// Path: apps/api/src/mail/templates/otp.template.ts
// ============================================================

// Bengali HTML email template for OTP (verification & password reset)

export interface OtpEmailParams {
  fullName: string;
  otp: string;
  purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  expiryMinutes: number;
}

export function renderOtpEmail({
  fullName,
  otp,
  purpose,
  expiryMinutes,
}: OtpEmailParams): { subject: string; html: string; text: string } {
  const isVerify = purpose === 'EMAIL_VERIFICATION';

  const subject = isVerify
    ? '🐱 Study Buddy — ইমেইল যাচাই কোড'
    : '🔐 Study Buddy — পাসওয়ার্ড রিসেট কোড';

  const heading = isVerify ? 'ইমেইল যাচাই করুন' : 'পাসওয়ার্ড রিসেট করুন';
  const intro = isVerify
    ? 'Study Buddy তে স্বাগতম! নিচের কোডটি দিয়ে আপনার ইমেইল যাচাই সম্পন্ন করুন।'
    : 'আপনি পাসওয়ার্ড রিসেট করার অনুরোধ করেছেন। নিচের কোডটি ব্যবহার করুন।';

  const html = `
  <!DOCTYPE html>
  <html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#F5F3FF;font-family:'Segoe UI','SolaimanLipi','Kalpurush',sans-serif;color:#4C1D95;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#FFFFFF;border-radius:24px;box-shadow:0 8px 24px rgba(167,139,250,0.18);overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#C4B5FD 0%,#FBCFE8 100%);padding:28px 24px;text-align:center;">
                <div style="font-size:44px;line-height:1;">🐱</div>
                <h1 style="margin:8px 0 0;font-size:22px;color:#4C1D95;">Study Buddy</h1>
                <p style="margin:4px 0 0;font-size:13px;color:#6D28D9;">আপনার পড়াশোনার সঙ্গী</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <h2 style="margin:0 0 8px;font-size:18px;color:#4C1D95;">প্রিয় ${fullName},</h2>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#5B21B6;">
                  ${intro}
                </p>
                <div style="text-align:center;margin:24px 0;">
                  <div style="display:inline-block;background:#EDE9FE;border:2px dashed #A78BFA;border-radius:18px;padding:18px 32px;">
                    <div style="font-size:32px;letter-spacing:10px;font-weight:700;color:#6D28D9;">
                      ${otp}
                    </div>
                  </div>
                </div>
                <p style="margin:20px 0 0;font-size:14px;color:#7C3AED;text-align:center;">
                  ⏱️ কোডটির মেয়াদ শেষ হবে <b>${expiryMinutes} মিনিটে</b>
                </p>
                <p style="margin:24px 0 0;font-size:13px;color:#9333EA;line-height:1.7;">
                  যদি আপনি এই অনুরোধ না করে থাকেন, এই ইমেইলটি উপেক্ষা করুন।
                  কারো সাথে এই কোড শেয়ার করবেন না। 🔒
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#F5F3FF;padding:18px;text-align:center;font-size:12px;color:#7C3AED;">
                মন খুলে পড়াশোনা করো, Study Buddy পাশে আছে 💜
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const text = `Study Buddy — ${heading}

প্রিয় ${fullName},

${intro}

কোড: ${otp}
মেয়াদ: ${expiryMinutes} মিনিট

সব ভালো!
— Study Buddy টিম 🐱`;

  return { subject, html, text };
}