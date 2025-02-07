import { onMount } from 'svelte';

/**
 * Options for configuring the reconnection behavior of an SSE client.
 * 
 * @interface ReconnectOptions
 * 
 * @property {number} interval - The interval in milliseconds between reconnection attempts.
 * @property {number} delay - The initial delay in milliseconds before the first reconnection attempt.
 * @property {number} [retries] - The maximum number of reconnection attempts. If not specified, reconnection will continue indefinitely.
 */
export interface ReconnectOptions {
    interval: number;
    delay: number;
    retries?: number;
}

export default class SSEClient {
    private eventSource: EventSource | undefined = $state(undefined);
    private url: string | URL;
    private withCredentials: boolean = false;
    private reconnectOptions?: ReconnectOptions;
    private reconnectAttempts: number = $state(0);
    private reconnectTimeout: any = $state(undefined);
    private manualConnection: boolean = false;

    constructor(url: string, options?: {
        withCredentials?: boolean;
        reconnectOptions?: ReconnectOptions,
        manualConnection?: boolean;
    }) {
        this.url = url;
        this.withCredentials = options?.withCredentials ?? false;
        this.reconnectOptions = options?.reconnectOptions;
        this.manualConnection = options?.manualConnection ?? false;

        onMount(() => {
            if (!this.manualConnection) {
                this.connect();
            }

            return () => {
                this.disconnect();
            };
        });

    }

    connect() {
        if (this.eventSource) return;

        this.eventSource = new EventSource(this.url, { withCredentials: this.withCredentials });

        this.eventSource.addEventListener("open", (_) => {
            this.reconnectAttempts = 0
        });

        this.eventSource.addEventListener("error", (_) => {
            if (this.reconnectOptions) {
                this.scheduleReconnect();
            }
        });
    }

    private disconnect() {
        if (this.eventSource) {
            this.eventSource.removeEventListener("open", (_) => this.reconnectAttempts = 0);
            this.eventSource.removeEventListener("error", (_) => {
                if (this.reconnectOptions) {
                    this.scheduleReconnect();
                }
            });
            this.eventSource.close();
            this.eventSource = undefined;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
    }

    private scheduleReconnect() {
        if (this.reconnectOptions && (this.reconnectOptions.retries === undefined || this.reconnectAttempts < this.reconnectOptions.retries)) {
            this.reconnectAttempts++;
            this.reconnectTimeout = setTimeout(() => {
                this.disconnect();
                this.connect();
            }, this.reconnectOptions.interval + this.reconnectAttempts * this.reconnectOptions.delay);
        }
    }

    on(type: string, listener: (this: EventSource, ev: MessageEvent) => any, options?: boolean | AddEventListenerOptions, disableAutoRemoveListener: boolean = false): () => void {
        $effect(() => {

            if (!this.eventSource) return;

            this.eventSource.addEventListener(type, listener, options);

            if (disableAutoRemoveListener) return;

            return () => {
                this.eventSource?.removeEventListener(type, listener, options);
            };
        });

        return () => {
            this.eventSource?.removeEventListener(type, listener, options);
        };
    }

    close(): void {
        this.eventSource?.close();
    }

    set onopen(listener: (this: EventSource, ev: Event) => any) {
        $effect(() => {
            if (!this.eventSource) return;
            this.eventSource.onopen = listener;
        });
    }

    set onmessage(listener: (this: EventSource, ev: MessageEvent) => any) {
        $effect(() => {
            if (!this.eventSource) return;
            this.eventSource.onmessage = listener;
        });
    }

    set onerror(listener: (this: EventSource, ev: Event) => any) {
        $effect(() => {
            if (!this.eventSource) return;
            this.eventSource.onerror = listener;
        });
    }
}
