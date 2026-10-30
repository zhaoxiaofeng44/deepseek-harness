/**
 * Boot-time backend resolution for the adaptive directory-picker composition:
 * one pure decision from sampled host facts to a concrete backend kind. The
 * caller samples exactly once per boot, so the mounted capability stays
 * stable for the service lifetime as the seam requires.
 * @module @deepseek-ai/dsh-host-directory-picker-auto/resolve
 */

/** Concrete interaction backend the resolver chooses between. */
export type DirectoryPickerBackendKind = 'native' | 'browse'

/** Environment keys the resolution reads (a `process.env` subset). */
export type DirectoryPickerEnv = Readonly<
  Partial<Record<'DISPLAY' | 'WAYLAND_DISPLAY', string>>
>

/** Host facts the backend choice is a pure function of, sampled once at boot. */
export interface DirectoryPickerHostFacts {
  /** Host process platform. */
  platform: NodeJS.Platform
  /** SSH launch fact from the inherited process layer, independent of `.env` values. */
  ssh: boolean
  /** Environment sample; DISPLAY/WAYLAND_DISPLAY marks a Linux display. */
  env: DirectoryPickerEnv
  /** Whether a Linux chooser binary the native backend can drive (zenity/kdialog) is on PATH; consulted only when `platform` is linux. */
  linuxChooser: boolean
}

/** An env value counts only when set and non-blank (an empty export is "unset" by shell convention). */
const present = (value: string | undefined): boolean => value !== undefined && value !== ''

/**
 * Resolve which backend serves this boot. `native` requires every signal that
 * the operator can see the host display and the native backend can serve it:
 * no SSH launch (a forwarded connection cannot display the server's chooser),
 * and a servable display session — assumed on darwin/win32, requiring
 * `DISPLAY`/`WAYLAND_DISPLAY` plus a chooser binary on linux, and never true
 * elsewhere (the native backend drives exactly darwin/win32/linux). Remote
 * authority trust and a non-loopback bind are deliberately not signals: a
 * remote browser picks a directory on the same Host display surface a local one
 * does. Anything ambiguous resolves to `browse`, which works everywhere.
 * @param facts - the sampled host facts.
 * @returns the backend kind to mount.
 */
export function resolveDirectoryPickerBackend(facts: DirectoryPickerHostFacts): DirectoryPickerBackendKind {
  // The bind address and remote-authority trust no longer force the browse
  // backend: a remote page drives the same OS chooser a local page does.
  // SSH launches and headless hosts still fall through to `browse`.
  if (facts.ssh) return 'browse'
  if (facts.platform === 'darwin' || facts.platform === 'win32') return 'native'
  if (facts.platform !== 'linux' || !facts.linuxChooser) return 'browse'
  return present(facts.env.DISPLAY) || present(facts.env.WAYLAND_DISPLAY) ? 'native' : 'browse'
}
