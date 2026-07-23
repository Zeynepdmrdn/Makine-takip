# MakineTakip

## About the Project

MakineTakip is a mini MES application developed to monitor machine statuses, sensor readings, and availability rates in a factory.

This project is being developed as part of the Cormind internship case. Once completed, it will enable machine statuses, temperature, pressure, and speed data to be recorded and monitored through a user interface.

## Technologies

- TypeScript
- Node.js
- Express
- TypeORM
- SQLite
- ESLint
- Prettier

## Current Features

- TypeScript project structure
- Express server
- `GET /health` health-check endpoint
- SQLite database connection
- Machine, machine status, and sensor reading entities
- One-to-many entity relationships
- Development seed data
- TypeScript type checking
- ESLint code validation
- Prettier code formatting

## Installation

Install the project dependencies:

```bash
npm install
```

## Running the Project

Start the development server:

```bash
npm run dev
```

The server runs at:

```text
http://localhost:3000
```

## Health Check

Send a GET request to:

```text
GET /health
```

Expected response:

```json
{
  "status": "ok"
}
```

## Seed Data

Insert sample machines, statuses, and sensor readings:

```bash
npm run seed
```

The seed script adds:

- 3 machines
- 3 machine status records
- 6 sensor readings

Running the seed command again does not create duplicate machine records.

## Available Commands

- `npm run dev`: Starts the development server.
- `npm run build`: Compiles TypeScript into JavaScript.
- `npm start`: Runs the compiled application.
- `npm run seed`: Inserts sample development data.
- `npm run type-check`: Checks for TypeScript type errors.
- `npm run lint`: Checks whether the code follows ESLint rules.
- `npm run format`: Formats the project files with Prettier.
- `npm run format-check`: Checks whether the files follow Prettier rules.
