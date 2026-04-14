import nodemailer from 'nodemailer';

export interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

/**
 * Get email transporter configuration from environment variables
 */
export function getEmailConfig(): EmailConfig {
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.EMAIL_PORT || '587');
    const secure = process.env.EMAIL_SECURE === 'true' || port === 465;
    const user = process.env.EMAIL_USER || '';
    const pass = process.env.EMAIL_PASSWORD || '';

    if (!user || !pass) {
        throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
    }

    return {
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
    };
}

/**
 * Create a nodemailer transporter
 */
export function createTransporter() {
    const config = getEmailConfig();
    return nodemailer.createTransport(config);
}

/**
 * Generate HTML email content for invoice delivery
 */
export function generateInvoiceHTMLEmail(order: any, invoice: any): string {
    const timestamp = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'full',
        timeStyle: 'long'
    });

    const customerName = `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`.trim() || 'Valued Customer';
    const invoiceId = `INV-${invoice.display_id.toString().padStart(6, '0')}`;
    
    // Defensive date parsing
    let invoiceDate = 'N/A';
    try {
        const rawDate = invoice.generated_at || invoice.created_at;
        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                invoiceDate = d.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } else {
                invoiceDate = new Date().toLocaleDateString();
            }
        } else {
            invoiceDate = new Date().toLocaleDateString();
        }
    } catch (e) {
        invoiceDate = new Date().toLocaleDateString();
    }
    
    // Robust status mapping
    const rawStatus = (order.status || '').toLowerCase();
    let statusLabel = 'Processing'; // Default to Processing as requested
    
    if (rawStatus === 'completed' || rawStatus === 'fulfilled') {
        statusLabel = 'Completed';
    } else if (rawStatus === 'canceled' || rawStatus === 'cancelled') {
        statusLabel = 'Canceled';
    } else {
        // For 'pending', 'processing', or anything else after payment capture, show 'Processing'
        statusLabel = 'Processing';
    }

    console.log(`[Email] Generating template for Invoice ${invoiceId}. Raw Status: ${order.status}, Formatted Status: ${statusLabel}, Raw Date: ${invoice.generated_at}`);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Invoice - Swan Studios</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4f46e5;
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background-color: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
    }
    .info-box {
      background-color: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
    }
    .field {
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
    }
    .label {
      font-weight: 600;
      color: #4b5563;
    }
    .value {
      color: #111827;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Your Invoice is Ready</h1>
    <p>Swan Studios Store</p>
  </div>
  
  <div class="content">
    <p class="greeting">Hello ${customerName},</p>
    <p>Thank you for your purchase! Your invoice for order <strong>#${order.display_id}</strong> has been generated and is attached to this email as a PDF.</p>
    
    <div class="info-box">
      <div class="field">
        <span class="label">Invoice Number:</span>
        <span class="value">${invoiceId}</span>
      </div>
      <div class="field">
        <span class="label">Date:</span>
        <span class="value">${invoiceDate}</span>
      </div>
      <div class="field">
        <span class="label">Order Status:</span>
        <span class="value">${statusLabel}</span>
      </div>
    </div>
    
    <p>You can also download this invoice anytime by logging into your account on our website.</p>
    
    <p>If you have any questions regarding this invoice, please feel free to reply to this email or contact us via our support page.</p>
  </div>
  
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} Swan Studios Store. All rights reserved.</p>
    <p>This is an automated notification. Generated at ${timestamp}</p>
  </div>
</body>
</html>
  `;
}

/**
 * Send invoice email with attachment
 */
export async function sendInvoiceEmail(params: {
    to: string;
    order: any;
    invoice: any;
    pdfBuffer: Buffer;
    fileName: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const { to, order, invoice, pdfBuffer, fileName } = params;
        const transporter = createTransporter();

        const fromEmail = process.env.EMAIL_USER;
        
        const mailOptions = {
            from: `"Swan Studios Store" <${fromEmail}>`,
            to,
            subject: `Invoice for Order #${order.display_id} - Swan Studios`,
            html: generateInvoiceHTMLEmail(order, invoice),
            attachments: [
                {
                    filename: fileName,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Invoice email sent: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('[Email] Failed to send invoice email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
