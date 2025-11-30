# Email Verification Setup Guide

This app uses EmailJS to send verification codes via email. Follow these steps to set up email sending:

## Step 1: Create an EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account (free tier includes 200 emails/month)

## Step 2: Add an Email Service

1. In the EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions to connect your email account
5. Note your **Service ID** (e.g., `service_xxxxx`)

## Step 3: Create an Email Template

1. Go to **Email Templates** in the EmailJS dashboard
2. Click **Create New Template**
3. Use this template:

**Subject:** `Your DOTO Verification Code`

**Content:**
```
Hello,

Your verification code for DOTO is: {{code}}

Enter this code to complete your registration.

If you didn't request this code, please ignore this email.

Thanks,
The DOTO Team
```

4. Note your **Template ID** (e.g., `template_xxxxx`)

## Step 4: Get Your Public Key

1. Go to **Account** → **General** in the EmailJS dashboard
2. Find your **Public Key** (e.g., `xxxxxxxxxxxxx`)

## Step 5: Configure Environment Variables

Create a `.env` file in the `webapp` directory (if it doesn't exist) and add:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

Replace the placeholder values with your actual IDs from EmailJS.

## Step 6: Restart Development Server

After adding the environment variables, restart your development server:

```bash
npm run dev
```

## Development Mode

If EmailJS is not configured, the app will:
- Log the verification code to the browser console
- Display the code in the UI (in development mode only)
- Still allow you to test the verification flow

## Testing

1. Enter your phone number and email in the login form
2. Click "Send Verification Code"
3. Check your email for the verification code
4. Enter the code to proceed to registration

## Troubleshooting

- **Emails not sending?** Check that your environment variables are set correctly
- **Code not appearing?** Check the browser console for the code (in dev mode)
- **EmailJS errors?** Verify your Service ID, Template ID, and Public Key are correct

## Production Deployment

For production, make sure to:
1. Set environment variables in your hosting platform (Vercel, Netlify, etc.)
2. Use a production email service (consider upgrading EmailJS plan for higher limits)
3. Remove the demo code display from the UI

