MakineTakip

MakineTakip is a mini Manufacturing Execution System (MES) application developed to monitor machines in a factory environment.

The application records machine status transitions and sensor readings such as temperature, pressure, and speed. It calculates machine availability and tracked running/down durations, presents production data through a responsive dashboard, and includes JWT-based user authentication.

This project was developed as part of the Cormind internship case study.

Features

Machine Monitoring

Create and list machines from the dashboard

View the current status of each machine

Change machine status manually

Display status-aware machine cards with color indicators

View the last status transition and relative transition time

View the complete status history in a timeline

Require a reason when a machine changes to DOWN

Prevent consecutive identical statuses

Automatically close the previous active status

Availability and Sensor Data

Add temperature, pressure, and speed readings

Filter sensor readings by date range

Display the latest sensor values

Display sensor history using automatically refreshed line charts

Calculate availability for a selected time range

Display availability, running duration, down duration, and total tracked duration

Correctly handle open, overlapping, and out-of-range status records

Live Demo Simulation

Start and stop the demo from the frontend

Display how long the demo has been running

Generate sensor readings automatically every 5 seconds

Change a random machine status automatically every 20 seconds

Prevent the simulator from selecting the same status consecutively

Add an automatic reason when the generated status is DOWN

Use the existing service layer so simulation actions follow the same business rules

Refresh machine cards and sensor charts while the demo is running

Authentication and Security

Register a user through the frontend

Sign in and sign out

Hash passwords with bcrypt before storing them

Issue signed JSON Web Tokens (JWT) after successful authentication

Protect machine and simulation endpoints with JWT middleware

Automatically attach the token to protected frontend requests

Remove invalid or expired frontend sessions

Keep JWT secrets outside source control with environment variables

Quality

Validate business rules with automated tests

Check TypeScript types without producing build files

Run ESLint and Prettier checks

Exclude test files from the production backend build

Technologies

Backend

Node.js

TypeScript

Express

TypeORM

SQLite

better-sqlite3

bcryptjs

JSON Web Token

Frontend

React

TypeScript

Vite

Tailwind CSS

Recharts

Development Tools

Vitest

ESLint

Prettier

Concurrently

Git

Project Structure

makine-takip/
|-- frontend/
| `-- src/
|       |-- components/
|       |-- config/
|       |-- types/
|       `-- App.tsx
|-- src/
| |-- config/
| |-- controllers/
| |-- database/
| |-- entities/
| |-- errors/
| |-- middleware/
| |-- routes/
| |-- scripts/
| |-- services/
| |-- utils/
| `-- app.ts
|-- .env.example
|-- package.json
|-- tsconfig.json
`-- tsconfig.build.json

The backend follows a layered structure:

Routes define API paths and HTTP methods.

Controllers validate HTTP request data and return responses.

Services contain business rules and database operations.

Entities define database tables and relationships.

Middleware performs shared request checks such as JWT verification.

Utils contain reusable pure logic such as availability calculation.

Requirements

Install the following tools before running the project:

Node.js

npm

Git

Installation

Clone the repository:

git clone https://github.com/Zeynepdmrdn/Makine-takip.git
cd Makine-takip

Install backend dependencies:

npm install

Install frontend dependencies:

npm --prefix frontend install

Create a local environment file from the example:

cp .env.example .env

On Windows PowerShell:

Copy-Item .env.example .env

Generate a secure JWT secret:

node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

Copy the generated value into .env:

JWT_SECRET=your-generated-secret

The real .env file is ignored by Git and must not be committed. .env.example contains only a safe placeholder.

Running the Application

Start the backend and frontend together:

npm run dev

The applications run at:

Frontend: http://localhost:5173
Backend: http://localhost:3000

If port 5173 is already being used, Vite may select another port such as 5174 or 5175.

On Windows PowerShell, use npm.cmd if script execution is restricted:

npm.cmd run dev

First Use

Open the frontend address shown in the terminal.

Select Register.

Enter a name, email address, and password of at least 8 characters.

The password is hashed before it is stored.

After registration, the application stores the JWT session and opens the dashboard.

Use Sign Out to clear the local session and return to the authentication screen.

Seed Data

Insert sample development data:

npm run seed

The seed script adds sample machines, machine statuses, and sensor readings. Running it again does not create duplicate machine records.

API Authentication

The health check and authentication endpoints are public. Machine and simulation endpoints require a valid JWT.

Send the token through the Authorization header:

Authorization: Bearer your-jwt-token

Requests without a valid token receive HTTP 401 Unauthorized.

API Endpoints

Method

Endpoint

Access

Description

GET

/health

Public

Checks whether the backend is running

POST

/auth/register

Public

Registers a user and returns a JWT

POST

/auth/login

Public

Authenticates a user and returns a JWT

POST

/machines

Protected

Creates a machine

GET

/machines

Protected

Returns all machines and their statuses

GET

/machines/:id

Protected

Returns a machine with related records

POST

/machines/:id/status

Protected

Changes the status of a machine

POST

/machines/:id/readings

Protected

Adds a sensor reading

GET

/machines/:id/readings

Protected

Returns sensor readings

GET

/machines/:id/readings?from=&to=

Protected

Filters readings by date range

GET

/machines/:id/availability?from=&to=

Protected

Returns availability and duration details

GET

/simulation/status

Protected

Returns the current demo state

POST

/simulation/start

Protected

Starts automatic demo data generation

POST

/simulation/stop

Protected

Stops automatic demo data generation

Example Requests

Register

POST /auth/register
Content-Type: application/json

{
"name": "Demo User",
"email": "demo@example.com",
"password": "Password123"
}

Login

POST /auth/login
Content-Type: application/json

{
"email": "demo@example.com",
"password": "Password123"
}

Successful registration and login responses contain a safe user object and a JWT. The password hash is never returned.

Create a Machine

POST /machines
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
"name": "Cutting Machine",
"code": "MC-001"
}

Change Machine Status

POST /machines/1/status
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
"status": "DOWN",
"reason": "Maintenance required"
}

Available status values:

RUNNING

DOWN

SETUP

IDLE

Add a Sensor Reading

POST /machines/1/readings
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
"temperature": 74.5,
"pressure": 5.4,
"speed": 1250
}

Business Rules

Machine status transitions follow these rules:

A machine can have only one active status.

The previous status is closed before a new status is created.

Consecutive identical statuses are rejected.

A reason is required when the new status is DOWN.

Status timestamps must remain chronologically consistent.

Status changes are executed inside a database transaction.

The simulator uses the same status service and cannot bypass these rules.

Creating a machine also creates its initial status so that new dashboard records begin in a consistent state.

Availability Calculation

Availability is calculated for a requested time range using RUNNING and DOWN durations:

Availability (%) = Running Time / (Running Time + Down Time) x 100

The API also returns:

Running duration

Down duration

Total tracked duration

The calculation handles:

Empty status history

Open status records

Events outside the requested range

Partially overlapping events

Invalid date ranges

Invalid event timestamps

SETUP and IDLE records

The calculation is implemented as a pure function so it can be tested independently from database and HTTP layers.

Authentication Flow

Register or Login
|
v
Validate request data
|
v
Hash or compare password with bcrypt
|
v
Create a signed JWT
|
v
Store the session in the frontend
|
v
Attach Authorization: Bearer <token>
|
v
Verify the token in requireAuth middleware
|
v
Allow or reject the protected request

Passwords are never stored or returned as plain text. Login failures use a general error message so the API does not reveal whether a particular email address exists.

Testing

Run all automated tests:

npm test

The project currently contains 22 automated tests:

10 availability calculation tests

6 machine status transition tests

6 authentication service tests

Authentication tests cover:

Password hashing

Email normalization

Duplicate email rejection

Minimum password length

Successful login and JWT verification

Incorrect password and unknown-user rejection

Available Commands

Command

Description

npm run dev

Starts the backend and frontend together

npm run dev:backend

Starts only the backend

npm run dev:frontend

Starts only the frontend

npm run build

Builds the backend without test files

npm start

Runs the compiled backend

npm run seed

Inserts sample development data

npm run type-check

Checks TypeScript types

npm run lint

Runs backend ESLint checks

npm run format

Formats project files with Prettier

npm run format-check

Checks file formatting

npm test

Runs automated tests

npm run test:watch

Runs tests in watch mode

Frontend checks can be run separately:

npm --prefix frontend run lint
npm --prefix frontend run build

Technical Decisions

SQLite provides a lightweight local database for the case application.

TypeORM defines entities, relationships, and database operations with TypeScript.

Service classes keep business rules separate from HTTP controllers.

Database transactions protect the consistency of machine status transitions.

A pure availability function makes time-range logic independently testable.

bcryptjs prevents plain-text passwords from being stored.

JWT middleware protects machine and simulation endpoints.

Environment variables keep the JWT signing secret outside source control.

React and Tailwind CSS provide a component-based responsive interface.

Recharts visualizes automatically refreshed sensor history.

Vitest covers pure functions and service-level behavior.

The frontend API address is centralized and can be changed with VITE_API_URL.

Security Notes

Use a long, random JWT_SECRET in every deployed environment.

Never commit .env or production secrets.

The development database may contain local test accounts and should not be deployed as production data.

Use HTTPS when deploying authentication and API traffic.

Review dependency audit results before production deployment.

Known Limitations

SQLite and synchronize: true are intended for local development and demonstration.

Database migrations are not included.

Role-based authorization is not implemented.

Refresh tokens, password reset, and account recovery are not implemented.

Pagination is not implemented for machine, status, or sensor lists.

Frontend component and end-to-end tests are not included.

The frontend production bundle includes a size warning because of the chart library.

The application is not currently deployed to a production environment.

Health Check

Send the following request:

GET http://localhost:3000/health

Expected response:

{
"status": "ok"
}
