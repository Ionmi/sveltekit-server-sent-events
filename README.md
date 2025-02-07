# SvelteKit Server-Sent Events (SSE) Library

A lightweight wrapper for handling Server-Sent Events (SSE) in SvelteKit, simplifying real-time communication between the server and clients.

## Features
- Simple API for SSE integration in SvelteKit
- Automatic reconnection options
- Event-based communication for notifications and real-time updates

## Installation

```sh
npm install svkit-server-sent-events
```

## Usage

### 1. Client-Side Connection

Import and initialize the SSE client in your Svelte component:

```ts
import SSEClient from 'svkit-server-sent-events';

const sseClient = new SSEClient('/notifications', {
    reconnectOptions: {
        interval: 1000,
        delay: 1000
    }
});

sseClient.on('notification', ({ data }) => {
    const notification = JSON.parse(data);
    console.log(notification);
});

sseClient.onerror = () => {
    console.error('Error connecting to the server');
};
```

### 2. Available Client Options

The `SSEClient` constructor accepts the following options:

```ts
new SSEClient(url: string, options?: {
    withCredentials?: boolean;
    reconnectOptions?: {
        interval: number;
        delay: number;
    };
    manualConnection?: boolean;
});
```

- **withCredentials**: Whether to send cookies and authentication headers.
- **reconnectOptions**: Controls automatic reconnection.
- **manualConnection**: If `true`, prevents auto-connection; `connect()` must be called manually.

### 3. Server-Side Implementation

Create an SSE connection in your SvelteKit server route:

```ts
import { SSEConnection } from 'svkit-server-sent-events';
import { randomUUID } from 'crypto';

const sseConnection = new SSEConnection<string>();

export async function GET({ request }) {
    const clientId = randomUUID();

    sseConnection.onConnect = (id) => {
        console.log(`Successfully connected: ${id}`);
        sseConnection.emit(id, "connected", "Welcome!");
        sseConnection.broadcast("new_connection", "New client connected");
        sseConnection.emitMultiple(["randomId1", "randomId2"], "new_connection", "New client connected");
    };

    sseConnection.onDisconnect = (id) => {
        console.log(`Client ${id} disconnected`);
    };

    return sseConnection.createStream(clientId, request);
}
```

### 4. Server-Side API

- **`emit(id, eventName, data)`**: Sends an event to a specific client.
- **`broadcast(eventName, data)`**: Sends an event to all connected clients.
- **`emitMultiple(ids, eventName, data)`**: Sends an event to multiple clients.

Example:

```ts
sseConnection.emit(userId, "notification", "New message received");
sseConnection.broadcast("global_update", "A global event occurred");
sseConnection.emitMultiple(["user1", "user2"], "special_event", "VIP access granted");
```

## License

MIT License

