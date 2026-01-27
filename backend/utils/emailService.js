const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'zadafiyaharsh2@gmail.com',
    pass: process.env.EMAIL_PASS // Gmail App Password from .env
  },
  // Add timeouts to prevent hanging (fixes Nginx 504/502 errors)
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter verification failed:', error.message);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

const sendOtpEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"Surnivas Diamond" <${process.env.EMAIL_USER || 'zadafiyaharsh2@gmail.com'}>`,
      to: email,
      subject: 'Verify Your Email - surnivas Diamond',
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e1e1e1; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
             <h2 style="color: #000; letter-spacing: 2px; text-transform: uppercase; font-size: 24px; margin: 0;">surnivas Diamond</h2>
          </div>
          
          <h3 style="color: #333; text-align: center; font-weight: 400; font-size: 20px;">Verify Your Email Address</h3>
          <p style="color: #555; text-align: center; line-height: 1.6; margin-bottom: 30px;">Thank you for seeking timeless elegance with us. Please use the verification code below to complete your action.</p>
          
          <div style="text-align: center; margin: 40px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #000; background: #f9f9f9; padding: 15px 30px; border-radius: 8px; border: 1px solid #eee; display: inline-block;">${otp}</span>
          </div>
          
          <p style="color: #888; font-size: 13px; text-align: center; margin-top: 30px;">This code is valid for 10 minutes.<br>If you did not request this, please ignore this email.</p>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #aaa; font-size: 11px;">&copy; ${new Date().getFullYear()} surnivas Diamond. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return false;
  }
};

const sendContactNotification = async (contactData) => {
  try {
    const mailOptions = {
      from: `"Surnivas Contact" <${process.env.EMAIL_USER || 'zadafiyaharsh2@gmail.com'}>`,
      to: 'surnivasdiamond75@gmail.com',
      replyTo: contactData.email,
      subject: `New Inquiry: ${contactData.subject} - from ${contactData.name}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">New Contact Message</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">Name:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${contactData.name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${contactData.email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Mobile:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${contactData.mobile}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Subject:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${contactData.subject}</td>
            </tr>
          </table>
          
          <div style="margin-top: 20px;">
            <h3 style="color: #333;">Message:</h3>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; line-height: 1.6;">
              ${contactData.message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
            Sent from Surnivas Diamond Website
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Contact notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending contact notification email:', error.message);
    return false;
  }
};

const sendRegistrationNotification = async (userData) => {
  try {
    const mailOptions = {
      from: `"Surnivas Diamond" <${process.env.EMAIL_USER || 'zadafiyaharsh2@gmail.com'}>`,
      to: 'surnivasdiamond75@gmail.com',
      subject: `🔔 New User Registration - ${userData.name}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;">
            <h2 style="margin: 0; font-size: 24px;">🎉 New User Registration</h2>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #666; font-size: 14px;">A new user has registered on Surnivas Diamond website</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; width: 35%; color: #555;">👤 Name:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333;">${userData.name}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">📧 Email:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333;">${userData.email}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">📱 Mobile:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333;">${userData.mobile}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">🏢 Company:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333;">${userData.companyName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">📍 Location:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333;">${userData.city || 'N/A'}, ${userData.country || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">🏠 Address:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333;">${userData.address || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: bold; color: #555;">📮 Zip Code:</td>
              <td style="padding: 12px; color: #333;">${userData.zipCode || 'N/A'}</td>
            </tr>
          </table>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 13px;"><strong>⚠️ Action Required:</strong> This user is awaiting owner approval. Please review and approve their account in the admin panel.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://surnivasdiamond.cloud/admin/user-management" style="display: inline-block; padding: 12px 30px; background-color: #000; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View User Management</a>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
            <p style="margin: 0;">Registration Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Surnivas Diamond. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Registration notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending registration notification email:', error.message);
    return false;
  }
};

module.exports = { sendOtpEmail, sendContactNotification, sendRegistrationNotification };
