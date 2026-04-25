import nodemailer from 'nodemailer'

// Create transporter for Yahoo SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.mail.yahoo.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.YAHOO_EMAIL,
    pass: process.env.YAHOO_PASSWORD,
  },
})

export interface EmailNotificationParams {
  toEmail: string
  toName: string
  eventTitle: string
  eventDate: string
  registrationUrl: string
  unsubscribeUrl: string
}

/**
 * Send event notification email via Gmail SMTP
 */
export async function sendEventNotificationEmail({
  toEmail,
  toName,
  eventTitle,
  eventDate,
  registrationUrl,
  unsubscribeUrl,
}: EmailNotificationParams) {
  if (!process.env.YAHOO_EMAIL || !process.env.YAHOO_PASSWORD) {
    console.warn('⚠️  Yahoo email credentials not configured, skipping email')
    return false
  }

  try {
    const mailOptions = {
      from: `512Hockey <${process.env.YAHOO_EMAIL}>`,
      to: toEmail,
      subject: `🏒 ${eventTitle} - Registration Now Open`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; }
              .header { background: linear-gradient(135deg, #0a1628 0%, #4fc3f7 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { padding: 30px 20px; background: #f9fafb; border: 1px solid #e5e7eb; }
              .event-box { background: white; border-left: 4px solid #4fc3f7; padding: 20px; margin: 20px 0; border-radius: 4px; }
              .event-box h2 { margin: 0 0 10px 0; color: #0a1628; font-size: 20px; }
              .event-box p { margin: 0; color: #666; font-size: 14px; }
              .cta-button { text-align: center; margin: 30px 0; }
              .cta-button a { background: #4fc3f7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; }
              .cta-button a:hover { background: #0a9cc4; }
              .footer { padding: 20px; background: #f0f0f0; border: 1px solid #e5e7eb; border-top: none; font-size: 12px; color: #666; }
              .footer a { color: #4fc3f7; text-decoration: none; }
              .footer a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏒 New Event Available</h1>
              </div>
              
              <div class="content">
                <p>Hi ${toName},</p>
                
                <p>A new event you subscribed to is now available for registration:</p>
                
                <div class="event-box">
                  <h2>${eventTitle}</h2>
                  <p>📅 ${eventDate}</p>
                </div>
                
                <div class="cta-button">
                  <a href="${registrationUrl}">Register Now</a>
                </div>
                
                <p>Don't miss out! Click the button above to register for this event on The Pond Hockey Club's website.</p>
              </div>
              
              <div class="footer">
                <p><strong>Please do not reply to this email.</strong> This inbox is not monitored. To manage your subscriptions, visit <a href="${unsubscribeUrl}">512Hockey.com/events</a>.</p>
                <p>You received this email because you subscribed to event notifications on 512Hockey.com.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
New Event: ${eventTitle}
Date: ${eventDate}

Register here: ${registrationUrl}

---

PLEASE DO NOT REPLY TO THIS EMAIL. This inbox is not monitored.

To manage your subscriptions, visit: ${unsubscribeUrl}

You received this email because you subscribed to event notifications on 512Hockey.com.
      `.trim(),
    }

    await transporter.sendMail(mailOptions)
    console.log(`✓ Email sent to ${toEmail}`)
    return true
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    return false
  }
}
