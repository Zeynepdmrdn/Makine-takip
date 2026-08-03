# MakineTakip

MakineTakip is a mini Manufacturing Execution System (MES) application developed to monitor machines in a factory environment.

The application records machine status changes and sensor readings such as temperature, pressure, and speed. It also calculates machine availability for a selected time range and presents production data through a web dashboard.

This project was developed as part of the Cormind internship case study.

## Features

- Create and list machines
- View machine details
- Track machine status history
- Change machine status
- Require a reason when a machine changes to `DOWN`
- Prevent consecutive identical statuses
- Automatically close the previous status record
- Add temperature, pressure, and speed readings
- Filter sensor readings by date range
- Calculate machine availability for a time range
- Display machine statuses with color indicators
- Display availability values on the dashboard
- Display sensor history using line charts
- Insert sample development data
- Validate business rules with automated tests

## Technologies

### Backend

- Node.js
- TypeScript
- Express
- TypeORM
- SQLite
- better-sqlite3

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts

### Development Tools

- Vitest
- ESLint
- Prettier
- Concurrently
- Git

## Project Structure

```text
makine-takip/
├── frontend/
│   └── src/
│       ├── components/
│       ├── config/
│       ├── types/
│       └── App.tsx
├── src/
│   ├── controllers/
│   ├── database/
│   ├── entities/
│   ├── errors/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── utils/
│   └── app.ts
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

The backend follows a layered structure:

- **Routes** define API paths and HTTP methods.
- **Controllers** validate HTTP request data and return responses.
- **Services** contain business rules and database operations.
- **Entities** define database tables and relationships.
- **Utils** contain reusable logic such as availability calculation.

## Requirements

Install the following tools before running the project:

- Node.js
- npm
- Git

## Installation

Clone the repository:

```bash
git clone https://github.com/Zeynepdmrdn/Makine-takip.git
cd Makine-takip
```

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
npm --prefix frontend install
```

## Running the Application

Start the backend and frontend together:

```bash
npm run dev
```

The applications run at:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

On Windows PowerShell, `npm.cmd` can be used if script execution is restricted:

```powershell
npm.cmd run dev
```

## Seed Data

Insert sample development data:

```bash
npm run seed
```

The seed script adds:

- 3 machines
- 3 machine status records
- 6 sensor readings

Running the seed command again does not create duplicate machine records.

## API Endpoints

| Method | Endpoint                               | Description                                |
| ------ | -------------------------------------- | ------------------------------------------ |
| GET    | `/health`                              | Checks whether the backend is running      |
| POST   | `/machines`                            | Creates a machine                          |
| GET    | `/machines`                            | Returns all machines                       |
| GET    | `/machines/:id`                        | Returns a machine with its related records |
| POST   | `/machines/:id/status`                 | Changes the status of a machine            |
| POST   | `/machines/:id/readings`               | Adds a sensor reading                      |
| GET    | `/machines/:id/readings`               | Returns sensor readings                    |
| GET    | `/machines/:id/readings?from=&to=`     | Filters readings by date range             |
| GET    | `/machines/:id/availability?from=&to=` | Calculates availability for a time range   |

## Example Requests

### Create a Machine

```http
POST /machines
Content-Type: application/json
```

```json
{
  "name": "Cutting Machine",
  "code": "MC-001"
}
```

### Change Machine Status

```http
POST /machines/1/status
Content-Type: application/json
```

```json
{
  "status": "DOWN",
  "reason": "Maintenance required"
}
```

Available status values:

- `RUNNING`
- `DOWN`
- `SETUP`
- `IDLE`

### Add a Sensor Reading

```http
POST /machines/1/readings
Content-Type: application/json
```

```json
{
  "temperature": 74.5,
  "pressure": 5.4,
  "speed": 1250
}
```

## Business Rules

Machine status transitions follow these rules:

1. A machine can have only one active status.
2. The previous status is closed before a new status is created.
3. Consecutive identical statuses are rejected.
4. A reason is required when the new status is `DOWN`.
5. Status timestamps must remain chronologically consistent.

Status changes are performed inside a database transaction so that closing the previous status and creating the new status are completed together.

## Availability Calculation

Availability is calculated for a requested time range using `RUNNING` and `DOWN` durations:

```text
Availability (%) = Running Time / (Running Time + Down Time) × 100
```

The calculation also handles:

- Empty status history
- Open status records
- Events outside the requested range
- Partially overlapping events
- Invalid date ranges
- Invalid event timestamps
- `SETUP` and `IDLE` records

The availability calculation is implemented as a pure function so it can be tested independently from the database and HTTP layers.

## Testing

Run all automated tests:

```bash
npm test
```

The project currently contains 16 automated tests:

- 10 availability calculation tests
- 6 machine status transition tests

The tests cover successful operations, edge cases, and business-rule violations.

## Available Commands

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Starts the backend and frontend together |
| `npm run dev:backend`  | Starts only the backend                  |
| `npm run dev:frontend` | Starts only the frontend                 |
| `npm run build`        | Builds the backend without test files    |
| `npm start`            | Runs the compiled backend                |
| `npm run seed`         | Inserts sample development data          |
| `npm run type-check`   | Checks TypeScript types                  |
| `npm run lint`         | Runs backend ESLint checks               |
| `npm run format`       | Formats project files with Prettier      |
| `npm run format-check` | Checks file formatting                   |
| `npm test`             | Runs automated tests                     |
| `npm run test:watch`   | Runs tests in watch mode                 |

Frontend checks can be run separately:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Technical Decisions

- **SQLite** was selected because the case application requires a lightweight local database.
- **TypeORM** was used to define entities, relationships, and database operations with TypeScript.
- **Service classes** contain business rules so controllers remain focused on HTTP requests and responses.
- **Database transactions** protect the consistency of machine status transitions.
- **A pure function** was used for availability calculation to make the logic easier to test.
- **React and Tailwind CSS** were used to create a component-based responsive interface.
- **Recharts** was used to visualize sensor history.
- **Vitest** was used for unit and service-level tests.
- The frontend API address is stored in a central configuration file and can be changed with `VITE_API_URL`.

## Known Limitations

- Authentication and authorization are not implemented.
- SQLite is intended for local development and demonstration.
- Database migrations are not included.
- Pagination is not implemented for machine or sensor lists.
- Frontend component tests are not included.
- The frontend production bundle includes a size warning because of the chart library.
- The application is not deployed to a production environment.

## Health Check

Send the following request:

```text
GET http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok"
}
```
