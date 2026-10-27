# CafeFlow - Agent Guidelines & Repository Rules

## 1. Project Overview
**CafeFlow** is a QR-based cafe ordering and live order tracking web application built with the MERN stack.
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Real-Time Communication**: Socket.IO
- **Authentication**: Secure admin authentication using standard best practices (JWT / HTTP-only cookies, bcrypt password hashing)
- **Testing**: Automated backend tests (e.g., Jest/Supertest) and frontend integration tests where practical.

---

## 2. Repository Structure
The project must follow a monorepo structure containing three primary top-level folders:
```
cafeflow/
├── client/                      # React + Vite frontend
├── server/                      # Node.js + Express + Socket.IO backend
├── docs/                        # Specifications, contracts, and context tracking
├── AGENTS.md                    # Persistent agent rules & workflow standards
└── README.md
```

---

## 3. Mandatory Context Preservation Files
The following living documentation files in `/docs` must be maintained and updated across milestones:
1. `PROJECT_CONTEXT.md` - High-level vision, architecture decisions, and system constraints.
2. `API_CONTRACT.md` - REST endpoints, route definitions, request bodies, response schemas, and error shapes.
3. `DATA_MODEL.md` - MongoDB/Mongoose schemas, fields, validations, indexes, and relationships.
4. `REALTIME_EVENTS.md` - Socket.IO namespaces/rooms, emitted events, payload schemas, and client listeners.
5. `IMPLEMENTATION_STATUS.md` - Current milestone progress, checklist of features done, known issues, and technical debt.
6. `FRONTEND_INTEGRATION_GUIDE.md` - Guidance for client-side API consumption, query patterns, and state hooks.

---

## 4. Persistent Coding & Workflow Rules

### Incremental Execution
- **One milestone at a time**: Never generate the whole application in a single step.
- **Inspection first**: Always inspect existing files before editing them. Never overwrite working files unnecessarily.
- **Independent runnability**: Ensure `client` and `server` can run independently with their respective dev scripts and dependency configurations.

### Contracts & Mocking Rules
- **Contract truth**: Keep API paths, request schemas, response schemas, status enums, and Socket.IO events consistent between frontend and backend.
- **No speculative contracts**: Never invent API contracts during frontend development without consulting or defining them in `docs/API_CONTRACT.md` and verifying against the backend implementation.
- **No fake backends**: Never replace real backend functionality with mock data unless explicitly building a clearly labeled prototype.

### Security & Secrets
- **No secrets in git**: Do not store secrets or credentials in source control.
- **Environment variables**: Use `.env.example` files with placeholder keys and descriptive comments. Never commit real `.env` files or tokens.
- **Secure auth**: Hash passwords with bcrypt, sign secure tokens, sanitize input, and prevent injection/cross-site vulnerabilities.

### Verification & Testing
- **Honest reporting**: Never claim a build or test passed unless you actually ran it.
- **Automated verification**: Run tests and lint/build checks after major file edits and milestone completions.

### Milestone Completion Checklist
Whenever a milestone is completed:
1. Inspect all changed files to ensure code quality and clean diffs.
2. Run relevant checks and automated tests.
3. Update the documentation in `/docs` to match the actual implementation.
4. Record known issues and incomplete work in `docs/IMPLEMENTATION_STATUS.md`.
5. Clearly inform the user of the exact next step and await instruction before moving on.
