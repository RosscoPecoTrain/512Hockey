import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export interface EmailNotificationParams {
  toEmail: string
  toName: string
  eventTitle: string
  eventDate: string
  registrationUrl: string
}

/**
 * Send event notification email via SendGrid
 */
export async function sendEventNotificationEmail({
  toEmail,
  toName,
  eventTitle,
  eventDate,
  registrationUrl,
}: EmailNotificationParams) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️  SENDGRID_API_KEY not set, skipping email')
    return false
  }

  try {
    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@512hockey.com',
      subject: `🏒 ${eventTitle} - Registration Now Open`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0a1628 0%, #4fc3f7 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🏒 New Event Available</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; color: #333;">Hi ${toName},</p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              A new event you subscribed to is now available for registration:
            </p>
            
            <div style="background: white; border-left: 4px solid #4fc3f7; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h2 style="margin: 0 0 10px 0; color: #0a1628; font-size: 20px;">${eventTitle}</h2>
              <p style="margin: 0; color: #666; font-size: 14px;">📅 ${eventDate}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${registrationUrl}" style="background: #4fc3f7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                Register Now
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Don't miss out! Click the button above to register for this event on The Pond Hockey Club's website.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p style="font-size: 12px; color: #999; margin: 0;">
              You received this email because you subscribed to event notifications on 512Hockey.com.<br>
              <a href="https://512hockey.com/events" style="color: #4fc3f7; text-decoration: none;">Manage your subscriptions</a>
            </p>
          </div>
        </div>
      `,
      text: `
New Event: ${eventTitle}
Date: ${eventDate}

Register here: ${registrationUrl}

You received this email because you subscribed to event notifications on 512Hockey.com.
      `.trim(),
    }

    await sgMail.send(msg)
    console.log(`✓ Email sent to ${toEmail}`)
    return true
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    return false
  }
}
