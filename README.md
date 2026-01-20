# Valentine Prom (Dark Theme)

An anonymous prom invitation site built with Node.js, Express, MongoDB, Google OAuth, and EJS.

## Features
- Google login restricted to institute email domain
- Student search by name or roll number
- Invite dashboard with status colors
- Anonymous invite page with rating & response
- Email notifications to receiver and sender

## Setup
1. Install dependencies:
   - `npm install`
2. Create a `.env` file with:
```
PORT=3000
MONGO_URI=your_mongodb_connection
SESSION_SECRET=replace_with_long_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
ALLOWED_EMAIL_DOMAIN=college.edu

APP_BASE_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Valentine Prom <your_email@gmail.com>"
```

3. Seed students (replace sample entries in `scripts/seedStudents.js` first):
   - `npm run seed`

4. Run locally:
   - `npm run dev`

## Deploy to Vercel (Free)
1. Push this repo to GitHub.
2. Create a new project on Vercel and import the repo.
3. In Project Settings → Environment Variables, add all `.env` values.
4. Set these for production:
   - `GOOGLE_CALLBACK_URL=https://YOUR-VERCEL-DOMAIN.vercel.app/auth/google/callback`
   - `APP_BASE_URL=https://YOUR-VERCEL-DOMAIN.vercel.app`
5. Deploy. Vercel will detect the `vercel.json` and build a Node serverless function.

### Notes
- If you change the domain, update the Google OAuth redirect URL in the Google Cloud Console.
- MongoDB Atlas free tier works well with Vercel.

## Database
This project uses MongoDB (free tiers available on MongoDB Atlas).

