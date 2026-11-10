import 'axios';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    skipForbiddenToast?: boolean;
  }
  interface AxiosRequestConfig {
    skipForbiddenToast?: boolean;
  }
}
