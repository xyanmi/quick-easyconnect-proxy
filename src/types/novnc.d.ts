declare module "@novnc/novnc/core/rfb.js" {
  interface RFBOptions {
    credentials?: {
      password?: string;
      username?: string;
    };
    shared?: boolean;
  }

  interface RFBEventDetail {
    clean?: boolean;
    reason?: string;
    text?: string;
  }

  export default class RFB {
    constructor(
      target: HTMLElement,
      url: string,
      options?: RFBOptions
    );

    scaleViewport: boolean;
    resizeSession: boolean;
    clipViewport: boolean;
    viewOnly: boolean;

    disconnect(): void;
    sendCredentials(credentials: { password: string }): void;
    clipboardPasteFrom(text: string): void;

    addEventListener(
      event: "connect" | "disconnect" | "credentialsrequired" | "securityfailure" | "clipboard",
      callback: (e: CustomEvent<RFBEventDetail>) => void
    ): void;

    removeEventListener(
      event: string,
      callback: (e: CustomEvent) => void
    ): void;
  }
}
