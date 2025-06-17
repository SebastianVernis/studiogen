declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      auth2: {
        getAuthInstance: () => {
          isSignedIn: {
            get: () => boolean;
          };
          currentUser: {
            get: () => {
              getAuthResponse: () => {
                access_token: string;
              };
            };
          };
          signIn: () => Promise<any>;
          signOut: () => Promise<any>;
        };
        init: (config: any) => Promise<any>;
      };
      client: {
        init: (config: any) => Promise<any>;
        drive: {
          files: {
            create: (params: any) => Promise<any>;
          };
        };
      };
    };
  }
}

export {};
