# Re-Mmogo - Motshelo Group Loan Tracker

## Description

Re-Mmogo is a full-stack web application designed to help Motshelo (savings group) members track loans, contributions, and group finances. Members can register and log in, create or join savings groups, record monthly contributions, apply for loans, and have signatories approve or reject transactions. The app provides a real-time dashboard with group summaries and a full approvals workflow.

# FRONTEND

## Frontend Description

The Re-Mmogo frontend is a React single-page application that provides the user interface for managing Motshelo savings groups. It connects to the Re-Mmogo REST API to handle authentication, group management, contributions, loans, approvals, and year-end reports.

## Frontend Features

- User registration and login with JWT authentication
- Protected routes — unauthenticated users are redirected to login
- Dashboard with live summaries of all groups
- Create and manage Motshelo savings groups
- Add members to groups by email
- Record and view monthly contributions per group
- Apply for loans within a group
- Signatory approval workflow for contributions and loans
- Year-end group financial reports
- Responsive layout for desktop, tablet and mobile

## Frontend Technologies Used

- React 19 via Vite
- React Router DOM v7
- Axios
- React Hook Form
- CSS (modular per page)

## Frontend Project Structure

```
FrontEnd/
├── public/
└── src/
    ├── api/
    │   └── axios.js              # Axios instance with base URL and JWT interceptor
    ├── components/
    │   ├── AppLayout.jsx         # Shared page wrapper with sidebar and header
    │   ├── Navbar.jsx            # Top navigation bar
    │   └── ProtectedRoute.jsx    # Route guard for authenticated users
    ├── context/
    │   └── AuthContext.jsx       # Global auth state — login, logout, current user
    ├── pages/
    │   ├── Dashboard.jsx         # Overview of all groups and stats
    │   ├── Groups.jsx            # List and create groups
    │   ├── GroupDetail.jsx       # Group members and detail view
    │   ├── Contributions.jsx     # Contribution history and submission form
    │   ├── ContributionsHome.jsx # Select a group to view contributions
    │   ├── Loans.jsx             # Loan history and application form
    │   ├── LoansHome.jsx         # Select a group to view loans
    │   ├── Reports.jsx           # Year-end group financial report
    │   ├── ReportsHome.jsx       # Select a group to view reports
    │   ├── Approvals.jsx         # Pending contributions and loans for signatories
    │   ├── Login.jsx             # Login page
    │   └── Register.jsx          # Registration page
    ├── App.jsx                   # Root component with all route definitions
    └── main.jsx                  # React entry point
├── index.html
├── package.json
└── vite.config.js
```

## Frontend Routes

| Route | Page | Auth Required |
| `/login` | Login page | No |
| `/register` | Register page | No |
| `/dashboard` | Main dashboard with group summaries | yes |
| `/groups` | View and create groups | yes |
| `/groups/:groupId` | Group detail — members and overview | yes |
| `/contributions` | Contributions home — select a group | yes |
| `/contributions/:groupId` | Contribution history and submission form | yes |
| `/loans` | Loans home — select a group | yes |
| `/groups/:groupId/loans` | Loan history and application form | yes |
| `/reports` | Reports home — select a group | yes |
| `/groups/:groupId/reports` | Year-end group report | yes |
| `/approvals` | Pending items awaiting signatory approval | yes |

## How to Run the Frontend

### 1. Clone the repository

```bash
git clone https://github.com/HleloMahlalela/Re-Mmogo-2.0.git
cd Re-Mmogo-2.0/FrontEnd
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the `FrontEnd` folder and add:

```
VITE_API_URL=http://localhost:5000/api
```

### 4. Start the development server

```bash
npm run dev
```

Open your browser and go to:

```
https://re-mmogo-2-0.vercel.app/
```

## API Connection

All API calls are made through `src/api/axios.js`. The Axios instance automatically attaches the JWT token from `localStorage` to every request header:

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

# BACKEND

## Backend Description

The Re-Mmogo backend is a Node.js REST API that powers the savings group management app. It handles user authentication, group creation, member management, contributions, loans, signatory approvals, and year-end financial reports. All protected routes require a valid JWT token.

## Backend Features

- JWT-based user registration and login
- Group creation with the creator automatically set as a signatory
- Add members to groups by email
- Contribution submission and signatory approval workflow
- Loan application and signatory approval workflow with automatic 10% interest on approval
- Pending approvals feed for signatories
- Year-end financial report per group

## Backend Technologies Used

- Node.js
- Express
- MySQL2
- JWT Authentication
- bcryptjs
- CORS

## Backend Project Structure

```
BackEnd/
├── src/
│   ├── db/
│   │   └── pool.js               # MySQL connection pool
│   ├── middleware/
│   │   └── authRequired.js       # JWT verification middleware
│   ├── routes/
│   │   ├── authRoutes.js         # Register and login
│   │   ├── groupRoutes.js        # Groups, members, contributions, loans, reports
│   │   ├── contributionRoutes.js # Submit and approve contributions
│   │   ├── loanRoutes.js         # Apply for and approve loans
│   │   ├── approvalRoutes.js     # Fetch all pending approvals
│   │   └── reportRoutes.js       # Year-end financial reports
│   └── server.js                 # Express app entry point
└── package.json
```

## How to Run the Backend

### 1. Clone the repository

```bash
git clone https://github.com/HleloMahlalela/Re-Mmogo-2.0.git
cd Re-Mmogo-2.0/BackEnd
```

### 2. Set up the database

Make sure MySQL is installed and running, then create the database and import the schema:

```bash
mysql -u root -p -e "CREATE DATABASE remmogodb;"
mysql -u root -p remmogodb < ../Re-mmogo-C.session.sql
```

### 3. Set up environment variables

Create a `.env` file in the `BackEnd` folder and add:

```
PORT=5000
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=remmogodb
```

### 4. Install dependencies

```bash
npm install
```

### 5. Start the server

```bash
npm run dev
```

The server will start at:

```
http://localhost:5000
```

## API Endpoints

### Health Check

| Method | Endpoint | Description |
| GET | `/api/health` | Check if the server is running |

---

### Auth — Public Routes

| Method | Endpoint | Description |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive a JWT token |

**Register request body:**

```json
{
  "full_name": "Tebogo Kgosi",
  "email": "tebogo@email.com",
  "phone": "71234567",
  "password": "password123"
}
```

**Login response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": 1,
    "full_name": "Tebogo Kgosi",
    "email": "tebogo@email.com"
  }
}
```

### Groups - Protected Routes

All requests require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
| GET | `/api/groups` | Get all groups the logged-in user belongs to |
| POST | `/api/groups` | Create a new group |
| GET | `/api/groups/:groupId/members` | Get all members of a group |
| POST | `/api/groups/:groupId/members` | Add a member to a group by email |
| GET | `/api/groups/:groupId/contributions` | Get all contributions for a group |
| GET | `/api/groups/:groupId/loans` | Get all loans for a group |
| GET | `/api/groups/:groupId/yearend` | Get year-end financial summary for a group |

### Contributions — Protected Routes

| Method | Endpoint | Description |
| POST | `/api/contributions` | Submit a new contribution |
| POST | `/api/contributions/:contributionId/approve` | Approve or reject a contribution by signatories only |

**Submit contribution body:**

```json
{
  "group_id": 1,
  "amount": 1000,
  "contribution_month": "2025-04-01"
}
```

### Loans — Protected Routes

| Method | Endpoint | Description |
| POST | `/api/loans` | Apply for a new loan |
| POST | `/api/loans/:loanId/approve` | Approve or reject a loan by signatories only |

**Apply for loan body:**

```json
{
  "group_id": 1,
  "principal": 5000,
  "notes": "School fees"
}
```

> On approval, a 10% interest is automatically added to the outstanding loan amount.

### Approvals — Protected Routes

| Method | Endpoint | Description |
| GET | `/api/approvals` | Get all pending contributions and loans awaiting approval |

### Reports — Protected Routes

| Method | Endpoint | Description |
| GET | `/api/reports/:groupId` | Get financial summary report for a group |

## Authentication Flow

1. User registers or logs in via `/api/auth`
2. Server returns a signed JWT token valid for 7 days
3. Frontend stores the token in `localStorage`
4. Every protected request includes the token in the `Authorization` header
5. `authRequired.js` middleware verifies the token before allowing access

## Database

- **Database:** MySQL
- **Schema file:** `Re-mmogo-C.session.sql` (in project root)
- **Main tables:** `Users`, `MotsheloGroups`, `GroupMembers`, `Contributions`, `ContributionApprovals`, `Loans`, `LoanApprovals`

## Presentation Slides

https://biustacbw-my.sharepoint.com/:p:/g/personal/rl24020066_biust_ac_bw/IQABW0Rc_O55Tbui3vz4XN90AUPeH82ca91QhPS1EsXxfL8?e=bdtqx8

## GitHub Repository link

https://github.com/HleloMahlalela/Re-Mmogo-2.0.git

## Live application URL

https://re-mmogo-2-0.vercel.app/

## Figma design of the web application

https://www.figma.com/design/I5kAEfSdhVsxYaSp4NXcxZ?node-id=0-1



