# MeshChat

A zero-trust, end-to-end encrypted (E2EE) real-time community chat platform built for secure communications.

---

## Overview

MeshChat is a production-ready, full-stack real-time messaging application engineered with privacy and performance at its core. Inspired by Discord's layout, it separates the transport layer from the trust layer: while WebSockets and Redis handle high-throughput message broadcasting, messages are strictly encrypted client-side using native cryptographic APIs. The server acts as a blind relay, ensuring complete zero-knowledge data privacy.

---

## Architecture & Tech Stack

### Backend (/backend)
* Framework: Fastify (chosen for high throughput and low overhead).
* Real-Time Layer: @fastify/websocket paired with Redis Pub/Sub for multi-instance message broadcasting.
* Database & ORM: PostgreSQL managed via Drizzle ORM for type-safe SQL queries.
* Authentication: Stateless JSON Web Tokens (JWT) secured with Argon2id password hashing.

### Frontend (/frontend)
* Framework: Next.js (App Router) with TypeScript.
* Styling: Tailwind CSS (Discord-inspired dark mode UI theme).
* State Management: Zustand with LocalStorage persistence and hydration checks.
* Cryptography: Native Web Crypto API (RSA-OAEP, 2048-bit) for client-side encryption and decryption.

---

## How E2EE & Data Privacy Work

1. Local Key Generation: Upon registration or login, the user's browser automatically generates an asymmetric cryptographic keypair (RSA-OAEP) using the native Web Crypto API.
2. Key Directory: The public key is uploaded to the backend directory, while the private key is securely stored in the client's browser local storage and never touches the network.
3. Blind Relay Architecture: When a message is sent, the client encrypts the plaintext locally into ciphertext. The Fastify backend and Redis brokers act purely as blind packet forwarders without access to plaintext payloads or private keys.
4. Instant Decryption: Incoming ciphertext payloads are streamed via WebSockets and decrypted on-the-fly by the recipient's browser using their local private key.

---

## Core Features

* End-to-End Encryption (E2EE): Zero-knowledge client-side encryption ensuring database breaches only expose ciphertext.
* Real-Time Channels: Instant message delivery backed by persistent WebSocket connections and Redis Pub/Sub architecture.
* Community Management: Users can freely create communities, spin up custom text channels, and explore or join public communities via an interactive discovery modal.
* Secure Authentication: User registration and login flows with session persistence and automatic cryptographic key setup.

---

## Project Structure

mesh-chat/
├── backend/
│   ├── src/
│   │   ├── db/             # Drizzle ORM schema and database connection
│   │   ├── lib/            # Redis and utility clients
│   │   ├── modules/        # Domain-driven routes & gateways (Auth, Users, Communities, Channels, Messages, Realtime)
│   │   └── server.ts       # Fastify server entry point
│   └── package.json
└── frontend/
    ├── app/
    │   ├── dashboard/      # Main chat interface and modals
    │   ├── login/          # User login & E2EE key sync
    │   └── register/       # User registration & keypair generation
    ├── store/              # Zustand authentication store
    ├── utils/              # Web Crypto API encryption/decryption utilities
    └── package.json

---

## Local Setup & Installation

### Prerequisites
* Node.js (v18+ recommended)
* PostgreSQL Database instance
* Redis server instance

### 1. Clone the Repository
git clone https://github.com/A5HWIN-A5H/mesh-chat.git
cd mesh-chat

### 2. Configure the Backend
cd backend
npm install

Create a `.env` file in `backend/`:
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgres://user:password@localhost:5432/meshchat
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_super_secret_jwt_key

Run database migrations and start the server:
npm run db:push
npm run dev

### 3. Configure the Frontend
cd frontend
npm install

Create a `.env.local` file in `frontend/`:
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws

Start the Next.js development server:
npm run dev

Open `http://localhost:3000` in your browser.

---

## Author

Ashwin B
* GitHub: [@A5HWIN-A5H](https://github.com/A5HWIN-A5H)
* LinkedIn: [Profile](https://www.linkedin.com/in/ashwin874b)
