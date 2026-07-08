//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// HTTP client and socket.io-client factory for integration specs. Maintains
// a tough-cookie jar across requests so the signed `panther.sid` set by
// POST /login can be extracted and passed to socket.io-client as the
// `session_id` handshake query (matching passportSocketIo's expectation).

/* eslint-disable @typescript-eslint/no-var-requires */
const { CookieJar } = require('tough-cookie');
const cookieParser = require('cookie-parser');
const querystring = require('querystring');
const ioClient = require('socket.io-client');

export type FetchResponse = {
  status: number;
  headers: Headers;
  text: () => Promise<string>;
  body: string;
};

export class ConsoleClient {
  baseUrl: string;
  sessionKey: string;
  secret: string;
  jar: any;

  constructor(opts: { baseUrl: string; secret: string; sessionKey?: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.secret = opts.secret;
    this.sessionKey = opts.sessionKey ?? 'panther.sid';
    this.jar = new CookieJar();
  }

  async request(method: string, pathOrUrl: string, init: any = {}): Promise<FetchResponse> {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.baseUrl}${pathOrUrl}`;
    const cookieHeader = await this.jar.getCookieString(url);
    const headers: Record<string, string> = { ...(init.headers ?? {}) };
    if (cookieHeader) headers.cookie = cookieHeader;

    const res = await fetch(url, {
      method,
      headers,
      body: init.body,
      redirect: 'manual',
    });

    // Persist Set-Cookie values back into the jar
    const setCookie = (res.headers as any).getSetCookie?.() ?? [];
    for (const c of setCookie) {
      await this.jar.setCookie(c, url);
    }

    const body = await res.text();
    return {
      status: res.status,
      headers: res.headers,
      text: async () => body,
      body,
    };
  }

  get(pathOrUrl: string, init: any = {}) {
    return this.request('GET', pathOrUrl, init);
  }
  post(pathOrUrl: string, init: any = {}) {
    return this.request('POST', pathOrUrl, init);
  }

  // POST /login using form-urlencoded credentials. Returns the raw response so
  // the caller can assert on status/headers. The signed session cookie is in
  // this.jar afterwards regardless of the response code.
  async login(username: string, password: string): Promise<FetchResponse> {
    const body = new URLSearchParams({ username, password }).toString();
    return this.post('/login', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
  }

  // Extract the session_id from the signed cookie. Mirrors the decode chain
  // of the legacy test Web class so passport-socketio can verify it.
  async sessionId(): Promise<string> {
    const cookies = await this.jar.getCookies(`${this.baseUrl}/`);
    const sid = cookies.find((c: any) => c.key === this.sessionKey);
    if (!sid) throw new Error(`No ${this.sessionKey} cookie in jar — did login succeed?`);
    const decoded = querystring.unescape(sid.value);
    const unsigned = cookieParser.signedCookie(decoded, this.secret);
    if (!unsigned || typeof unsigned !== 'string') {
      throw new Error('Signed cookie did not verify against the session secret');
    }
    return unsigned;
  }

  // Open a socket.io-client connected to the booted app, authenticated via
  // the session_id query. The caller is responsible for `disconnect()` in an
  // afterEach/after hook.
  openSocket(opts: { sessionId: string; forceNew?: boolean }): any {
    return ioClient(this.baseUrl, {
      query: { session_id: opts.sessionId },
      forceNew: opts.forceNew ?? true,
      transports: ['websocket', 'polling'],
    });
  }
}

module.exports = { ConsoleClient };
