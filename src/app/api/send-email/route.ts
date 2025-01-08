export const runtime = 'edge';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Add file size and type validation
function validateFile(file: File) {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit');
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed');
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const file = formData.get('file') as File | null;

    // Validate input
    if (!name || !email || !subject || !message) {
      return Response.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    let attachments = [];

    // Process the file if it exists
    if (file) {
      try {
        validateFile(file);
        
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        attachments.push({
          filename: file.name,
          content: buffer,
        });
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : 'File processing failed' },
          { status: 400 }
        );
      }
    }

    const htmlContent = `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <br>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `;

    const data = await resend.emails.send({
      from: 'Notebooklm Podcast <onboarding@resend.dev>',
      to: ['victor.long.cheng@gmail.com'],
      subject: subject,
      html: htmlContent,
      attachments: attachments,
    });

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json(
      { error: 'Failed to send email' }, 
      { status: 500 }
    );
  }
}



