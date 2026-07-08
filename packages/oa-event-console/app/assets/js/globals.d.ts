//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Ambient Window augmentation for the frontend bundle.
//
// The frontend bundle exposes many classes and helper namespaces as
// `window.X = X` for cross-file access (legacy of the connect-assets
// concatenated-scope build). Rather than cast to `(window as any)` at
// every site, declare an index signature here so `window.AnyName`
// resolves to `any` without losing the typed built-in Window members.

declare global {
  interface Window {
    [key: string]: any;
  }
}

export {};
