type Client = {
    emit: (eventName: string, data: string) => { error?: Error };
    controller: ReadableStreamDefaultController;
};

type ConnectCallback<T> = (id: T) => void;
type DisconnectCallback<T> = (id: T) => void;

export class SSEManager<T> {
    private connectedClients: Map<T, Client>;
    private onConnectCallback?: ConnectCallback<T>;
    private onDisconnectCallback?: DisconnectCallback<T>;

    constructor() {
        this.connectedClients = new Map<T, Client>();
    }

    set onConnect(callback: ConnectCallback<T>) {
        this.onConnectCallback = callback;
    }

    set onDisconnect(callback: DisconnectCallback<T>) {
        this.onDisconnectCallback = callback;
    }

    addClient(id: T, client: Client) {
        this.connectedClients.set(id, client);
        if (this.onConnectCallback) {
            this.onConnectCallback(id);
        }
    }

    removeClient(id: T) {
        this.connectedClients.delete(id);
        if (this.onDisconnectCallback) {
            this.onDisconnectCallback(id);
        }
    }

    broadcast(eventName: string, data: string): { errors?: Error[] } {
        const errors: Error[] = [];

        this.connectedClients.forEach(({ emit }) => {
            const { error } = emit(eventName, data);
            if (error) {
                errors.push(error);
            }
        });

        return errors.length ? { errors } : {};
    }

    emit(id: T, eventName: string, data: string): { error?: Error } {
        const client = this.connectedClients.get(id);
        if (!client) return { error: new Error(`Client not found: ${id}`) };
        return client.emit(eventName, data);
    }

    emitMultiple(ids: T[], eventName: string, data: string): { errors?: Error[] } {
        const errors: Error[] = [];
        const clients = ids.map(id => this.connectedClients.get(id)).filter(Boolean) as Client[];
        clients.forEach(client => {
            const { error } = client.emit(eventName, data);
            if (error) {
                errors.push(error);
            }
        });

        return errors.length ? { errors } : {};
    }

    createStream(id: T, request: Request): Response {
        const stream = new ReadableStream({
            start: (controller) => {
                const emit = (eventName: string, data: string) => {
                    try {
                        controller.enqueue(`event: ${eventName}\ndata: ${data}\n\n`);
                        return {};
                    } catch (error) {
                        return { error: error as Error };
                    }
                };

                // Handle client disconnection
                request.signal.addEventListener('abort', () => {
                    this.removeClient(id);
                    controller.close();
                });

                // Add client to connected clients
                this.addClient(id, { emit, controller });
            },
            cancel: () => {
                this.removeClient(id);
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    }
}