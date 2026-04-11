import 'react';

// `credentialless` is a newer HTML iframe attribute (Chrome 110+) not yet in
// React's official JSX types. Augmenting here lets us use it without casts.
declare module 'react' {
  interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
    credentialless?: boolean;
  }
}
