import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

/**
 * Emotion cache configured for right-to-left styling.
 * Provided at the app root via <CacheProvider> so that MUI emits RTL-correct CSS.
 */
export const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});
