import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kmarchais.orbit',
  appName: 'Atlas',
  webDir: '.local/android-web',
  backgroundColor: '#090f13',
  android: { backgroundColor: '#090f13' },
  plugins: {
    SystemBars: { style: 'DARK', insetsHandling: 'native', initialViewportFitValueHint: 'cover' },
  },
}

export default config
