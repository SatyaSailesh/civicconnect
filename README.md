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
civicconnect-project/
│
├── frontend/
├── backend/
├── README.md
└── .env
```

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd civicconnect-project
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file inside the backend directory.

```env
MONGO_URI=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_USER=
EMAIL_PASS=
```

---

## Current Features

- User Authentication
- Complaint Submission
- Complaint Tracking ID
- Complaint Activity Timeline
- Interactive Complaint Maps
- Dashboard Analytics
- Public Feed
- Admin Complaint Management

---

## Future Roadmap

- Marker Clustering
- Heatmap Visualization
- Smart Filters
- AI Complaint Assistant
- Duplicate Complaint Detection
- Real-time Notifications
- Smart City Command Centre

---

## Contributors

- K. Satya Sai Sailesh

---

## License

This project is intended for educational and learning purposes.
