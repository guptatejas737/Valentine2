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

## Deploy to Render (Free)
1. Create a new Web Service from your GitHub repo.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add the same `.env` variables in Render dashboard.
5. Set `GOOGLE_CALLBACK_URL` and `APP_BASE_URL` to your Render URL.

## Database
This project uses MongoDB (free tiers available on MongoDB Atlas).

