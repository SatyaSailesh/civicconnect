# CivicConnect – Smart Civic Grievance Management Platform

## Overview 

CivicConnect is a full-stack web application that enables citizens to report civic issues while providing administrators with a centralized platform to manage, monitor, and resolve complaints efficiently.

The platform focuses on transparency, accountability, and improved communication between citizens and government authorities.

---

## Features

### Citizen Portal

- Secure Authentication
- Complaint Submission
- Image Upload Support
- Complaint Tracking ID
- Complaint Activity Timeline
- Personal Dashboard
- Complaint Status Tracking
- Public Complaint Feed

### Admin Portal

- Secure Admin Authentication
- Complaint Management
- Status & Priority Updates
- Complaint Escalation
- Dashboard Analytics
- Interactive Complaint Maps
- Activity Timeline

---

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Axios
- Recharts
- Leaflet

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Multer
- Cloudinary

---

## Project Structure

```
civicconnect/
│
├── frontend/
├── backend/
├── README.md
└── .env.example
```

---

## Run locally

Use Node.js 22.12 or newer and a running local MongoDB or a MongoDB Atlas connection.

```bash
git clone https://github.com/SatyaSailesh/civicconnect.git
cd civicconnect
```

Copy `.env.example` to `backend/.env`. Set `MONGO_URI` and generate a private `JWT_SECRET` with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

Start the backend and frontend in separate terminals.

```bash
cd backend
npm ci
npm run dev
```

```bash
cd frontend
npm ci
npm run dev
```

Open [the web app](http://localhost:5173). Check [backend health](http://localhost:5000/health) if the app cannot connect.

### Try the citizen and official workflows

1. Set `AADHAAR_WHITELIST=citizen@example.test:000000000001` in `backend/.env` for a demo. Register that citizen and enter the synthetic code in the verification dialog before submitting a complaint. This feature compares synthetic codes to a local allowlist. Use test data only.
2. Submit a complaint and find its tracking ID on the citizen dashboard. New complaints are private by default. Select the public feed checkbox when the complaint is intended for public viewing.
3. Set `ADMIN_WHITELIST` to the official email addresses and set a private `ADMIN_SECRET_CODE` before registering an official. The backend reads these at startup.
4. Register the first official and approve the account from the backend directory with `npm run approve-admin -- official@example.test`. The command uses your configured MongoDB connection.
5. Sign in as the approved official, update the complaint status, and check the timeline from the citizen account. Approved officials can approve additional official accounts in the dashboard.

### Optional integrations and deployment

- Configure all three `CLOUDINARY_*` variables to accept image uploads. Text complaints work with no Cloudinary account.
- Set `EMAIL_USER` and `EMAIL_PASS` to enable Gmail notifications. Use a Gmail app password.
- Set `FRONTEND_URL` on the backend to the deployed frontend origin. Set `VITE_API_URL` on the frontend to the deployed backend URL ending in `/api` before building.
- Run `npm run build` from `frontend` to produce the production build.

## Future Roadmap

- AI Complaint Assistant
- Duplicate Complaint Detection
- Real-time Notifications
- Smart City Command Centre

## Contributors

- K. Satya Sai Sailesh

---

## License

This project is intended for educational and learning purposes.
