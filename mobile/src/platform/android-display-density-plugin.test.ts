import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { applyActivityDisplayDensity } = require('../../plugins/android-display-density.js') as {
  applyActivityDisplayDensity: (source: string) => string
}
const template = `package com.stably.orca.mobile
import android.os.Bundle
class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
  }
  override fun getMainComponentName(): String = "main"
}
`

describe('Activity display density plugin', () => {
  it.each(['\n', '\r\n'])(
    'preserves the Expo template and is idempotent with %j newlines',
    (eol) => {
      const result = applyActivityDisplayDensity(template.replaceAll('\n', eol))
      expect(applyActivityDisplayDensity(result)).toBe(result)
      expect(result).toContain('SplashScreenManager.registerOnActivity(this)')
      expect(result).toContain('override fun getMainComponentName(): String = "main"')
      expect(result).toContain(
        'DisplayMetricsHolder.initDisplayMetrics(this)\n    super.onCreate(null)\n    syncActivityDisplayDensity()'
      )
      expect(result).toContain('super.onResume()\n    syncActivityDisplayDensity()')
      expect(result).toContain(
        'super.onConfigurationChanged(newConfig)\n    syncActivityDisplayDensity()'
      )
      expect(result).toContain('resources.configuration.fontScale.toDouble()')
      expect(result).toContain('"didUpdateDimensions"')
    }
  )

  it.each(['onResume()', 'onConfigurationChanged(newConfig: Configuration)'])(
    'rejects an existing %s override instead of generating duplicate Kotlin methods',
    (signature) => {
      const source = template.replace(
        'class MainActivity : ReactActivity() {',
        `class MainActivity : ReactActivity() {\n override fun ${signature} {}`
      )
      expect(() => applyActivityDisplayDensity(source)).toThrow('existing Activity lifecycle')
    }
  )

  it('fails on a changed Expo anchor instead of silently omitting cold-start synchronization', () => {
    expect(() =>
      applyActivityDisplayDensity(
        template.replace('super.onCreate(null)', 'super.onCreate(savedInstanceState)')
      )
    ).toThrow('Expo Kotlin')
    expect(() =>
      applyActivityDisplayDensity(
        template.replace('super.onCreate(null)', 'super.onCreate(null)\n super.onCreate(null)')
      )
    ).toThrow('Expo Kotlin')
  })
})
