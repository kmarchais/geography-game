// Type definitions for Google Identity Services
declare namespace google.accounts.id {
    interface CredentialResponse {
      credential?: string;
      select_by?: string;
    }

    interface GsiButtonConfiguration {
      type: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      local?: string;
    }

    interface InitConfiguration {
      client_id: string;
      callback: (response: CredentialResponse) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
      context?: string;
      prompt_parent_id?: string;
      nonce?: string;
      state_cookie_domain?: string;
      ux_mode?: 'popup' | 'redirect';
      allowed_parent_origin?: string | string[];
      intermediate_iframe_close_callback?: () => void;
    }

    function initialize(config: InitConfiguration): void;
    function prompt(): void;
    function renderButton(parent: HTMLElement, config: GsiButtonConfiguration): void;
    function disableAutoSelect(): void;
  }

  // Declare the google namespace globally
  interface Window {
    google: typeof google;
  }
