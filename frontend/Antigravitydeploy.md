# CivicConnect — Full Deployment Instructions for Antigravity
# Read every section carefully. Do all tasks in order. Do not skip any step.

---

## PROJECT OVERVIEW

CivicConnect is a full-stack civic grievance management platform.
- Frontend: React.js + Vite (in `/frontend/frontend-vite/`)
- Backend: Node.js + Express (in `/backend/` or wherever server.js is)
- Database: MongoDB Atlas (already configured in .env)
- Current image storage: Multer saving to local disk — THIS MUST BE REPLACED

---

## TASK 1 — REPLACE MULTER DISK STORAGE WITH CLOUDINARY

### Why
Local disk storage does not work on cloud hosting (Render). Images must be stored on Cloudinary.

### Step 1 — Install packages
In the backend folder, run:
```
npm install cloudinary multer-storage-cloudinary
```

### Step 2 — Add these to backend .env file
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
Do NOT hardcode these values. Use process.env variables only.

### Step 3 — Replace uploadMiddleware.js completely
Create/replace `middleware/uploadMiddleware.js` with this:

```javascript
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "civicconnect/complaints",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 900, crop: "limit", quality: "auto" }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
});

module.exports = upload;
```

### Step 4 — Update complaintRoutes.js image handling
Find this line in the POST / route (create complaint):
```javascript
const images = (req.files || []).map(f => `/uploads/complaints/${f.filename}`);
```
Replace with:
```javascript
const images = (req.files || []).map(f => f.path); // Cloudinary returns full URL in f.path
```

### Step 5 — Update AdminDashboard.jsx and any other frontend files
Find every occurrence of:
```javascript
const BASE_URL = 'http://localhost:5000';
```
Replace with:
```javascript
const BASE_URL = '';
```
Then find every image src like:
```jsx
src={`${BASE_URL}${img}`}
```
Since Cloudinary returns full URLs (https://res.cloudinary.com/...), just use:
```jsx
src={img}
```
So change all image src attributes that prepend BASE_URL to just:
```jsx
src={img}
```

### Step 6 — Remove the old static file serving from server.js
Find and DELETE this line from server.js:
```javascript
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
```
Also remove the `path` import if it's only used for that line:
```javascript
const path = require("path");
```

---

## TASK 2 — PREPARE BACKEND FOR RENDER DEPLOYMENT

### Step 1 — Create render.yaml in backend root
Create a file called `render.yaml` in the backend folder:

```yaml
services:
  - type: web
    name: civicconnect-backend
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

### Step 2 — Update CORS in server.js
Replace the current cors() setup with:
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'https://your-app.vercel.app'
  ],
  credentials: true,
}));
```
Add FRONTEND_URL to .env:
```
FRONTEND_URL=https://civicconnect.vercel.app
```

### Step 3 — Add a health check route to server.js
Add this route before app.listen:
```javascript
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));
```

### Step 4 — Update package.json in backend
Make sure "start" script exists:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

---

## TASK 3 — PREPARE FRONTEND FOR VERCEL DEPLOYMENT

### Step 1 — Create .env.production in frontend root
Create `/frontend/frontend-vite/.env.production`:
```
VITE_API_URL=https://civicconnect-backend.onrender.com/api
```

### Step 2 — Create .env.development in frontend root
Create `/frontend/frontend-vite/.env.development`:
```
VITE_API_URL=http://localhost:5000/api
```

### Step 3 — Update api.js (services/api.js) to use environment variable
Find the axios baseURL configuration. It likely looks like:
```javascript
baseURL: 'http://localhost:5000/api'
```
Replace with:
```javascript
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
```

### Step 4 — Fix the devDependencies issue for Vercel
Open frontend `package.json`. Move these packages from devDependencies to dependencies if they exist there:
- `@vitejs/plugin-react`
- `vite`
- `tailwindcss`
- `autoprefixer`
- `postcss`

### Step 5 — Create vercel.json in frontend root
Create `/frontend/frontend-vite/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
This fixes React Router — without it, refreshing any page other than / gives a 404 on Vercel.

### Step 6 — Update any hardcoded localhost URLs in frontend
Search the entire frontend src/ folder for:
```
http://localhost:5000
```
Replace every occurrence with:
```
import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
```
Or better — create a constant at the top of each file:
```javascript
const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
```

---

## TASK 4 — WRITE A PROFESSIONAL README.md

Create `README.md` in the root of the project (parent folder containing both frontend and backend):

```markdown
# CivicConnect 🏛️

> A full-stack civic grievance management platform connecting citizens with government authorities in India.

🔗 **Live Demo**: [civicconnect.vercel.app](https://civicconnect.vercel.app)
🔗 **Backend API**: [civicconnect-backend.onrender.com](https://civicconnect-backend.onrender.com)

---

## 🚀 Features

- **Aadhaar-Based Verification** — Only verified Indian citizens can file complaints
- **GPS Auto-Detection** — OpenStreetMap reverse geocoding, no API key needed
- **Photo Evidence Upload** — Up to 2 images per complaint via Cloudinary
- **4-Level Escalation Engine** — Auto-escalates from Local Office → Municipal Officer → MLA → Chief Minister
- **Formal Letter Generation** — Auto-generates downloadable government-style escalation letters
- **Admin Authority Portal** — Secure 3-layer admin authentication (whitelist + secret code + approval)
- **Real-time Chat Thread** — Admin-controlled two-way messaging per complaint
- **Analytics Dashboard** — Live charts for complaint trends, status breakdown, resolution rate
- **Public Accountability Feed** — All complaints visible publicly with official ratings

---

## 🛠️ Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-black?style=flat&logo=framer&logoColor=blue)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=flat)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=flat&logo=JSON%20web%20tokens)

### Cloud & DevOps
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat&logo=cloudinary&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat&logo=render&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

---

## 📁 Project Structure

```
civicconnect/
├── frontend/
│   └── frontend-vite/        # React + Vite frontend
│       ├── src/
│       │   ├── pages/        # LoginPage, RegisterPage, CitizenDashboard, AdminDashboard...
│       │   ├── components/   # ComplaintCard, NewComplaintModal, AadhaarVerifyModal...
│       │   ├── context/      # AuthContext
│       │   ├── services/     # api.js (axios instance)
│       │   └── layouts/      # DashboardLayout
│       └── vercel.json
└── backend/
    ├── models/               # User.js, Complaint.js
    ├── routes/               # authRoutes.js, complaintRoutes.js
    ├── middleware/           # authMiddleware.js, uploadMiddleware.js
    ├── config/               # db.js
    ├── server.js
    └── render.yaml
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Cloudinary account (free tier)

### Backend
```bash
cd backend
npm install
```

Create `.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
ADMIN_SECRET_CODE=your_admin_code
ADMIN_WHITELIST=admin@email.com
AADHAAR_WHITELIST=citizen@email.com:123456789012
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:5173
```

```bash
npm run dev
```

### Frontend
```bash
cd frontend/frontend-vite
npm install
npm run dev
```

---

## 🔐 Admin Authentication — 3 Layers

1. **Email Whitelist** — only pre-approved emails can register as admin
2. **Authority Code** — secret code required at both registration and login
3. **Manual Approval** — new admin accounts activated by existing admin

---

## 📊 Escalation Chain

```
Level 1: Local Office
    ↓ (ignored 3+ days)
Level 2: Municipal Officer
    ↓ (ignored 3+ days)
Level 3: Legislative Assembly (MLA)
    ↓ (ignored 3+ days)
Level 4: Chief Minister's Office
```
Each escalation auto-generates a formal government-style letter downloadable as .txt

---

## 🙋 Built By

**[Your Name]** — BTech CSE, [Your College Name]
- GitHub: [@SatyaSailesh](https://github.com/SatyaSailesh)

---

## 📄 License

MIT License — free to use, modify and deploy.
```

---

## TASK 5 — FINAL CHECKS BEFORE COMMITTING TO GITHUB

1. Make sure `.gitignore` exists in both frontend and backend with these entries:
```
node_modules/
.env
uploads/
dist/
.DS_Store
```

2. Make sure NO .env files are committed — check with:
```
git status
```
If .env appears, add it to .gitignore immediately.

3. Push to GitHub with a clean commit message:
```
git add .
git commit -m "feat: production deployment setup with Cloudinary, Render, Vercel"
git push origin main
```

---

## DEPLOYMENT ORDER (do in this exact sequence)

1. Set up Cloudinary account → get API keys → add to .env
2. Test Cloudinary image upload locally first
3. Push all changes to GitHub
4. Deploy backend to Render → copy the backend URL
5. Add backend URL to frontend .env.production as VITE_API_URL
6. Deploy frontend to Vercel → copy the frontend URL
7. Add frontend URL to backend environment variables on Render as FRONTEND_URL
8. Test live URL end to end

---

## ENVIRONMENT VARIABLES NEEDED ON RENDER (backend)

Add these in Render dashboard → Environment:
```
PORT=10000
MONGO_URI=<your atlas uri>
JWT_SECRET=<your secret>
ADMIN_SECRET_CODE=<your admin code>
ADMIN_WHITELIST=<comma separated admin emails>
AADHAAR_WHITELIST=<email:aadhaar pairs>
CLOUDINARY_CLOUD_NAME=<from cloudinary>
CLOUDINARY_API_KEY=<from cloudinary>
CLOUDINARY_API_SECRET=<from cloudinary>
FRONTEND_URL=<your vercel url>
```

## ENVIRONMENT VARIABLES NEEDED ON VERCEL (frontend)

Add these in Vercel dashboard → Settings → Environment Variables:
```
VITE_API_URL=https://your-render-app.onrender.com/api
```

---

## DONE. After deployment, test these flows:
- [ ] Register as citizen
- [ ] Aadhaar verification
- [ ] File complaint with photo
- [ ] Photo visible in admin dashboard
- [ ] Admin login with secret code
- [ ] Admin updates complaint status
- [ ] Escalation with letter download
- [ ] Chat thread open/close
- [ ] Analytics charts loading
- [ ] Public feed visible without login
```